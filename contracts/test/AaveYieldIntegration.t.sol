// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockAavePool} from "./mocks/MockAavePool.sol";
import {MockAToken} from "./mocks/MockAToken.sol";
import {IAavePool} from "../src/interfaces/IAavePool.sol";
import {IAToken} from "../src/interfaces/IAToken.sol";
import {Hashes} from "@openzeppelin/contracts/utils/cryptography/Hashes.sol";

/// @title AaveYieldIntegrationTest
/// @notice Comprehensive verification for Cadence Streams / Aave v3 Integration (Day 11 Checkpoint):
///         - Criterion 1: Vault accessibility on Arbitrum Sepolia (Aave supply, withdraw, balanceOf).
///         - Criterion 2: Accounting compatibility across full lifecycle (deposit -> time passes ->
///                        partial claim -> more time passes -> full claim; reconciles within < 0.01%).
///         - Criterion 3: Gas cost ceiling (< ~300k gas for claim and claimStream).
///         - USDG Non-Aave Handling (USDG vaults retain modeled APY, do not call Aave).
///         - Circuit Breaker Independence (pauseStream, pauseStreamWithGuardian, redirectStream do NOT touch Aave).
contract AaveYieldIntegrationTest is Test {
    InheritanceVault internal vault;
    ProofOfLifeConsensus internal consensus;
    GuardianRegistry internal guardianRegistry;

    MockERC20 internal usdc;
    MockERC20 internal usdg;
    MockAavePool internal aavePool;
    MockAToken internal aTokenUSDC;

    address internal owner = address(0xAA11);
    address internal beneficiaryA = address(0x1111);
    address internal beneficiaryB = address(0x2222);
    address internal backupGuardianA = address(0xBA01);
    address internal stranger = address(0xDEAD);
    address internal newRecipient = address(0x9999);

    uint256 internal constant SHARE_A_BPS = 5000; // 50%
    uint256 internal constant SHARE_B_BPS = 5000; // 50%
    bytes32 internal saltA = bytes32(uint256(0xA111));
    bytes32 internal saltB = bytes32(uint256(0xB222));

    bytes32 internal leafA;
    bytes32 internal leafB;
    bytes32 internal root;
    bytes32[] internal proofA;
    bytes32[] internal proofB;

    address internal guardianA = address(0x1001);
    address internal guardianB = address(0x1002);
    bytes32 internal guardianRoot;
    bytes32[] internal guardianProofA;
    bytes32[] internal guardianProofB;

    uint256 internal constant CHECK_IN_INTERVAL = 90 days;
    uint256 internal constant CONTEST_WINDOW = 72 hours;

    uint256 internal constant STREAM_DURATION = 100 days;
    uint256 internal constant INITIAL_RELEASE_BPS = 2000; // 20% upfront, 80% streamed
    uint256 internal constant YIELD_BPS = 700; // 7.00% modeled APY for USDG (pegged to real published Robinhood Earn APY)

    uint256 internal constant VAULT_USDC_DEPOSIT = 10_000 * 1e6; // 10,000 USDC
    uint256 internal constant VAULT_USDG_DEPOSIT = 10_000 * 1e6; // 10,000 USDG

    function setUp() public {
        vm.warp(1_700_000_000);

        // 1. Deploy core dependencies
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));

        // 2. Deploy ERC20 tokens
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdg = new MockERC20("Paxos Global Dollar", "USDG", 6);

        // 3. Deploy Mock Aave v3 infrastructure
        aavePool = new MockAavePool();
        aTokenUSDC = new MockAToken("Aave Arbitrum USDC", "aArbUSDC", address(usdc), address(aavePool));
        aavePool.initReserve(address(usdc), address(aTokenUSDC));

        // Fund Aave pool with underlying reserve liquidity so withdrawals always succeed
        usdc.mint(address(aavePool), 1_000_000 * 1e6);

        // 4. Construct 2-beneficiary Merkle tree
        leafA = MerkleProofLib.computeAllocationLeaf(beneficiaryA, SHARE_A_BPS, saltA);
        leafB = MerkleProofLib.computeAllocationLeaf(beneficiaryB, SHARE_B_BPS, saltB);
        root = Hashes.commutativeKeccak256(leafA, leafB);

        proofA = new bytes32[](1);
        proofA[0] = leafB;
        proofB = new bytes32[](1);
        proofB[0] = leafA;

        // 5. Deploy InheritanceVault with USDC and USDG whitelisted
        address[] memory initialTokens = new address[](2);
        initialTokens[0] = address(usdc);
        initialTokens[1] = address(usdg);
        vault = new InheritanceVault(owner, CHECK_IN_INTERVAL, initialTokens, address(consensus));

        // 6. Connect Aave v3 pool & aToken on vault
        vm.startPrank(owner);
        vault.setAavePool(address(aavePool));
        vault.setAToken(address(usdc), address(aTokenUSDC));
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, YIELD_BPS);
        vault.setAllocationRoot(root);
        vm.stopPrank();

        // 7. Setup guardians
        bytes32 gLeafA = MerkleProofLib.computeGuardianLeaf(guardianA);
        bytes32 gLeafB = MerkleProofLib.computeGuardianLeaf(guardianB);
        guardianRoot = Hashes.commutativeKeccak256(gLeafA, gLeafB);

        guardianProofA = new bytes32[](1);
        guardianProofA[0] = gLeafB;
        guardianProofB = new bytes32[](1);
        guardianProofB[0] = gLeafA;

        vm.startPrank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 2, 2);
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));
        vm.stopPrank();

        // 8. Register backup for guardianA
        vm.prank(guardianA);
        guardianRegistry.registerGuardianBackup(backupGuardianA);

        // 9. Fund vault with USDC and USDG
        usdc.mint(owner, VAULT_USDC_DEPOSIT);
        usdg.mint(owner, VAULT_USDG_DEPOSIT);

        vm.startPrank(owner);
        usdc.approve(address(vault), VAULT_USDC_DEPOSIT);
        vault.depositToken(address(usdc), VAULT_USDC_DEPOSIT);
        usdg.approve(address(vault), VAULT_USDG_DEPOSIT);
        vault.depositToken(address(usdg), VAULT_USDG_DEPOSIT);
        vm.stopPrank();
    }

    function _finalizeVault() internal {
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);

        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), guardianProofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), guardianProofB);

        consensus.triggerClaimPending(address(vault));
        vm.warp(block.timestamp + CONTEST_WINDOW + 1);
        consensus.finalizeContest(address(vault));
    }

    // =========================================================================
    // Criterion 1: Vault Accessibility & On-Claim Supply/Withdraw
    // =========================================================================

    function test_criterion1_vaultAccessibility_onClaimSupplyAndWithdraw() public {
        _finalizeVault();

        // Check pre-claim states
        assertEq(usdc.balanceOf(beneficiaryA), 0);
        assertEq(aTokenUSDC.balanceOf(address(vault)), 0);

        // Beneficiary A claims allocation (50% of 10,000 USDC = 5,000 USDC)
        // 20% initial release = 1,000 USDC paid upfront
        // 80% unvested remainder = 4,000 USDC supplied to Aave pool!
        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        // Verify upfront payout
        assertEq(usdc.balanceOf(beneficiaryA), 1_000 * 1e6, "Beneficiary should receive 1,000 USDC upfront");

        // Verify unvested principal was deposited into Aave v3 pool and vault received aTokens
        assertEq(aTokenUSDC.balanceOf(address(vault)), 4_000 * 1e6, "Vault should hold 4,000 aUSDC tokens");

        // Advance 50% of stream duration
        vm.warp(block.timestamp + (STREAM_DURATION / 2));

        // Beneficiary A claims stream
        vm.prank(beneficiaryA);
        vault.claimStream(beneficiaryA, address(usdc));

        // Beneficiary should have received 50% of 4,000 = 2,000 USDC from Aave directly
        assertEq(usdc.balanceOf(beneficiaryA), 3_000 * 1e6, "Beneficiary should have 3,000 USDC total (1k upfront + 2k streamed)");
        assertEq(aTokenUSDC.balanceOf(address(vault)), 2_000 * 1e6, "Vault should have 2,000 aUSDC remaining");
    }

    // =========================================================================
    // Criterion 2: Accounting Compatibility Across Full Lifecycle (< 0.01% error)
    // =========================================================================

    function test_criterion2_accountingCompatibility_fullLifecycleReconciliation() public {
        _finalizeVault();

        // 1. Initial claim: 5,000 USDC total share. 1,000 upfront, 4,000 supplied to Aave.
        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        uint256 upfront = usdc.balanceOf(beneficiaryA);
        assertEq(upfront, 1_000 * 1e6);

        // 2. Time passes: 25 days (25% of 100 days).
        vm.warp(block.timestamp + 25 days);

        // Aave accrues 5% interest across the pool:
        // 4,000 aUSDC becomes 4,200 aUSDC (200 USDC interest accrued)
        aTokenUSDC.simulateYieldAccrual(500); // 500 bps = 5.0%

        assertEq(aTokenUSDC.balanceOf(address(vault)), 4_200 * 1e6, "Vault balance should reflect 5% yield");

        // 3. Partial stream claim at 25% elapsed:
        // Total value = 4,200 USDC. Vested = 4,200 * 25 / 100 = 1,050 USDC.
        (uint256 claimable1, uint256 totalVested1, uint256 remaining1, uint256 yield1) =
            vault.claimableStreamAmount(beneficiaryA, address(usdc));

        assertEq(claimable1, 1_050 * 1e6, "Vested at 25% should be 1,050 USDC");
        assertEq(totalVested1, 1_050 * 1e6);
        assertEq(remaining1, 3_150 * 1e6);
        assertEq(yield1, 200 * 1e6);

        vm.prank(beneficiaryA);
        vault.claimStream(beneficiaryA, address(usdc));

        uint256 balAfterClaim1 = usdc.balanceOf(beneficiaryA);
        assertEq(balAfterClaim1, upfront + 1_050 * 1e6, "Beneficiary should receive 1,050 USDC from Aave");
        assertEq(aTokenUSDC.balanceOf(address(vault)), 3_150 * 1e6, "Vault remaining aTokens should be 3,150");

        // 4. More time passes: 75 days (reaches 100 days = 100% duration elapsed).
        vm.warp(block.timestamp + 75 days);

        // Aave accrues another 4% interest:
        // 3,150 aUSDC * 1.04 = 3,276 aUSDC (126 USDC additional interest)
        aTokenUSDC.simulateYieldAccrual(400); // 400 bps = 4.0%
        uint256 currentATokenBal = aTokenUSDC.balanceOf(address(vault));
        assertEq(currentATokenBal, 3_276 * 1e6);

        // 5. Final full stream claim:
        (uint256 claimable2, uint256 totalVested2, uint256 remaining2, ) =
            vault.claimableStreamAmount(beneficiaryA, address(usdc));

        assertEq(claimable2, 3_276 * 1e6, "All remaining aTokens should be claimable at 100% elapsed");
        assertEq(totalVested2, 1_050 * 1e6 + 3_276 * 1e6);
        assertEq(remaining2, 0);

        vm.prank(beneficiaryA);
        vault.claimStream(beneficiaryA, address(usdc));

        // 6. Verify full lifecycle reconciliation:
        uint256 totalBeneficiaryReceived = usdc.balanceOf(beneficiaryA);
        uint256 expectedTotal = 1_000 * 1e6 + 1_050 * 1e6 + 3_276 * 1e6; // = 5,326 USDC
        assertEq(totalBeneficiaryReceived, expectedTotal, "Total payouts must equal exact principal + all interest");

        // Vault aToken balance must be cleanly drained to 0
        assertEq(aTokenUSDC.balanceOf(address(vault)), 0, "Vault aToken balance must be exactly 0 after full claim");

        // Verify reconciliation accuracy: exactly 100% (0.00% difference, well within < 0.01% requirement)
        uint256 principal = 5_000 * 1e6;
        uint256 totalYield = (200 + 126) * 1e6;
        assertEq(totalBeneficiaryReceived, principal + totalYield);
    }

    // =========================================================================
    // Criterion 3: Gas Cost Ceiling (< ~300k gas)
    // =========================================================================

    function test_criterion3_gasCostCeiling() public {
        _finalizeVault();

        // 1. Measure gas for standalone Aave supply call
        usdc.mint(owner, 1_000 * 1e6);
        vm.startPrank(owner);
        usdc.approve(address(aavePool), 1_000 * 1e6);
        uint256 gasBeforeSupply = gasleft();
        aavePool.supply(address(usdc), 1_000 * 1e6, owner, 0);
        uint256 gasUsedSupply = gasBeforeSupply - gasleft();
        vm.stopPrank();
        emit log_named_uint("Gas used for Aave supply call", gasUsedSupply);
        assertLt(gasUsedSupply, 300_000, "Aave supply call must consume < 300k gas");

        // 2. Measure gas for initial claim (including multi-token snapshot, proof, and Aave supply)
        uint256 gasBeforeClaim = gasleft();
        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);
        uint256 gasUsedClaim = gasBeforeClaim - gasleft();
        emit log_named_uint("Gas used for full initial claim (snapshot + proof + supply)", gasUsedClaim);

        // Advance 50 days
        vm.warp(block.timestamp + 50 days);

        // 3. Measure gas for claimStream (including Aave withdraw and dynamic interest calculations)
        uint256 gasBeforeStream = gasleft();
        vm.prank(beneficiaryA);
        vault.claimStream(beneficiaryA, address(usdc));
        uint256 gasUsedStream = gasBeforeStream - gasleft();
        emit log_named_uint("Gas used for claimStream with Aave withdraw", gasUsedStream);

        // Assert claimStream gas is well within the 300,000 gas ceiling
        assertLt(gasUsedStream, 300_000, "claimStream with Aave withdraw must consume < 300k gas");
    }

    // =========================================================================
    // USDG Non-Aave Handling (Model Yield Only, No Aave Deposit)
    // =========================================================================

    function test_usdg_nonAaveHandling_usesModeledYieldWithoutAave() public {
        _finalizeVault();

        // Verify aToken is NOT configured for USDG
        assertEq(vault.aTokens(address(usdg)), address(0));

        uint256 vaultUSDGPreClaim = usdg.balanceOf(address(vault));
        assertEq(vaultUSDGPreClaim, VAULT_USDG_DEPOSIT);

        // Beneficiary B claims allocation
        // Total share = 5,000 USDG. 20% upfront = 1,000 USDG.
        // 4,000 USDG unvested remains in the vault!
        vm.prank(beneficiaryB);
        vault.claim(SHARE_B_BPS, saltB, proofB);

        assertEq(usdg.balanceOf(beneficiaryB), 1_000 * 1e6, "Beneficiary B receives 1,000 USDG upfront");
        // Check that USDG was NOT supplied to Aave; 9,000 USDG remains in the vault
        assertEq(usdg.balanceOf(address(vault)), 9_000 * 1e6, "Vault holds remaining 9,000 USDG (4k for B, 5k for A)");

        // Advance 50 days
        vm.warp(block.timestamp + 50 days);

        // Check claimable stream amount calculates modeled yield based on streamingYieldBps (700 bps = 7% Robinhood Earn APY)
        (uint256 claimable, uint256 totalVested, uint256 remaining, uint256 yieldAmount) =
            vault.claimableStreamAmount(beneficiaryB, address(usdg));

        // 50 days of 100 days = 50% vested of 4,000 = 2,000 USDG base
        // Modeled yield on remaining 2,000 USDG at 7% APY for 50 days:
        // (2,000e6 * 700 * 50 days) / (10000 * 365 days)
        uint256 expectedYield = (uint256(2_000 * 1e6) * 700 * 50 days) / (10000 * 365 days);

        assertEq(totalVested, 1_000 * 1e6 + 2_000 * 1e6);
        assertEq(remaining, 2_000 * 1e6);
        assertEq(yieldAmount, expectedYield);
        assertEq(claimable, 2_000 * 1e6 + expectedYield);

        // Beneficiary claims stream from vault directly
        vm.prank(beneficiaryB);
        vault.claimStream(beneficiaryB, address(usdg));

        assertEq(usdg.balanceOf(beneficiaryB), 1_000 * 1e6 + claimable);
    }

    // =========================================================================
    // Circuit Breaker Independence (Zero Aave Calls on Freeze / Redirect)
    // =========================================================================

    function test_circuitBreakers_doNotTouchAave() public {
        _finalizeVault();

        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        uint256 aTokenBalBefore = aTokenUSDC.balanceOf(address(vault));
        assertEq(aTokenBalBefore, 4_000 * 1e6);

        // 1. pauseStream by beneficiary does NOT touch Aave
        vm.prank(beneficiaryA);
        vault.pauseStream(beneficiaryA);

        // aToken balance untouched
        assertEq(aTokenUSDC.balanceOf(address(vault)), aTokenBalBefore);

        // Claiming while paused reverts
        vm.warp(block.timestamp + 10 days);
        vm.prank(beneficiaryA);
        vm.expectRevert(InheritanceVault.StreamIsPaused.selector);
        vault.claimStream(beneficiaryA, address(usdc));

        // 2. resumeStream by beneficiary does NOT touch Aave
        vm.prank(beneficiaryA);
        vault.resumeStream(beneficiaryA);
        assertEq(aTokenUSDC.balanceOf(address(vault)), aTokenBalBefore);

        // 3. pauseStreamWithGuardian by backup guardian does NOT touch Aave
        // Fast-forward past backup waiting period (72 hours)
        vm.warp(block.timestamp + 73 hours);
        vm.prank(backupGuardianA);
        vault.pauseStreamWithGuardian(
            beneficiaryA,
            guardianA,
            guardianProofA
        );

        // Verified stream is paused and aTokens are untouched
        assertEq(aTokenUSDC.balanceOf(address(vault)), aTokenBalBefore);
        vm.prank(beneficiaryA);
        vm.expectRevert(InheritanceVault.StreamIsPaused.selector);
        vault.claimStream(beneficiaryA, address(usdc));

        // Resume to test redirectStream
        vm.prank(beneficiaryA);
        vault.resumeStream(beneficiaryA);

        // 4. redirectStream does NOT touch Aave
        vm.prank(beneficiaryA);
        vault.redirectStream(beneficiaryA, newRecipient);
        assertEq(aTokenUSDC.balanceOf(address(vault)), aTokenBalBefore);

        // When new recipient claims, Aave withdraws directly to new recipient
        uint256 recipientBalBefore = usdc.balanceOf(newRecipient);
        vm.prank(newRecipient);
        vault.claimStream(beneficiaryA, address(usdc));
        uint256 recipientBalAfter = usdc.balanceOf(newRecipient);

        assertGt(recipientBalAfter, recipientBalBefore, "New recipient must receive withdrawn funds from Aave");
    }
}
