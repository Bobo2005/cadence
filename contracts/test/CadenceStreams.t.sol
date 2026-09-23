// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {IProofOfLifeConsensus} from "../src/interfaces/IProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {Hashes} from "@openzeppelin/contracts/utils/cryptography/Hashes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CadenceStreamsTest
/// @notice Comprehensive unit and integration test suite for Cadence Streams:
///         - Autonomous Streaming Trust
///         - Per-Second Linear Vesting
///         - Idle Capital Simulated Yield
///         - Guardian Emergency Circuit Breakers (Anti-Phishing Freeze)
///         - Safe Stream Redirection to Backup Address
contract CadenceStreamsTest is Test {
    InheritanceVault internal vault;
    ProofOfLifeConsensus internal consensus;
    GuardianRegistry internal guardianRegistry;
    MockERC20 internal usdc;

    address internal owner = address(0xAA11);
    address internal beneficiaryA = address(0x1111);
    address internal beneficiaryB = address(0x2222);
    address internal backupA = address(0xBA01);
    address internal stranger = address(0xDEAD);
    address internal safeNewRecipient = address(0x9999);

    uint256 internal constant SHARE_A_BPS = 5000; // 50%
    uint256 internal constant SHARE_B_BPS = 5000; // 50%

    bytes32 internal saltA = bytes32(uint256(0xA111));
    bytes32 internal saltB = bytes32(uint256(0xB222));

    bytes32 internal leafA;
    bytes32 internal leafB;
    bytes32 internal root;
    bytes32[] internal proofA;
    bytes32[] internal proofB;

    // Guardians
    address internal guardianA = address(0x1001);
    address internal guardianB = address(0x1002);
    bytes32 internal guardianRoot;
    bytes32[] internal guardianProofA;
    bytes32[] internal guardianProofB;

    uint256 internal constant CHECK_IN_INTERVAL = 90 days;
    uint256 internal constant CONTEST_WINDOW = 72 hours;

    uint256 internal constant VAULT_ETH_DEPOSIT = 10 ether;
    uint256 internal constant VAULT_USDC_DEPOSIT = 1_000 * 1e6; // 1,000 USDC

    // Streaming trust parameters
    uint256 internal constant STREAM_DURATION = 100 days;
    uint256 internal constant INITIAL_RELEASE_BPS = 1000; // 10% emergency buffer
    uint256 internal constant YIELD_BPS = 500; // 5% APY

    event StreamingConfigUpdated(uint256 duration, uint256 initialReleaseBps, uint256 yieldBps);
    event StreamStarted(address indexed beneficiary, uint256 totalShareEth, uint256 initialPayoutEth, uint256 duration);
    event StreamClaimed(address indexed beneficiary, address indexed recipient, uint256 claimableEth, uint256 accruedYieldEth);
    event StreamPaused(address indexed beneficiary, address indexed pausedBy);
    event StreamResumed(address indexed beneficiary, address indexed resumedBy);
    event StreamRedirected(address indexed beneficiary, address indexed oldRecipient, address indexed newRecipient);

    function setUp() public {
        vm.warp(1_700_000_000);

        // 1. Deploy dependencies
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // 2. Build 2-beneficiary Merkle tree for allocationRoot
        leafA = MerkleProofLib.computeAllocationLeaf(beneficiaryA, SHARE_A_BPS, saltA);
        leafB = MerkleProofLib.computeAllocationLeaf(beneficiaryB, SHARE_B_BPS, saltB);
        root = Hashes.commutativeKeccak256(leafA, leafB);

        proofA = new bytes32[](1);
        proofA[0] = leafB;

        proofB = new bytes32[](1);
        proofB[0] = leafA;

        // 3. Deploy InheritanceVault
        address[] memory initialTokens = new address[](1);
        initialTokens[0] = address(usdc);
        vault = new InheritanceVault(owner, CHECK_IN_INTERVAL, initialTokens, address(consensus));

        // 4. Setup guardians
        bytes32 gLeafA = MerkleProofLib.computeGuardianLeaf(guardianA);
        bytes32 gLeafB = MerkleProofLib.computeGuardianLeaf(guardianB);
        guardianRoot = Hashes.commutativeKeccak256(gLeafA, gLeafB);
        guardianProofA = new bytes32[](1);
        guardianProofA[0] = gLeafB;
        guardianProofB = new bytes32[](1);
        guardianProofB[0] = gLeafA;

        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 2, 2);

        vm.prank(owner);
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));

        // 5. Commit allocationRoot as owner
        vm.prank(owner);
        vault.setAllocationRoot(root);

        // 6. Fund the vault with ETH and USDC
        vm.deal(owner, 20 ether);
        vm.prank(owner);
        vault.depositETH{value: VAULT_ETH_DEPOSIT}();

        usdc.mint(owner, VAULT_USDC_DEPOSIT);
        vm.startPrank(owner);
        usdc.approve(address(vault), VAULT_USDC_DEPOSIT);
        vault.depositToken(address(usdc), VAULT_USDC_DEPOSIT);
        vm.stopPrank();

        // 7. Register backup address for beneficiaryA
        vm.prank(beneficiaryA);
        vault.registerBackupClaimAddress(backupA, 72 hours);
    }

    function _advanceVaultToFinalized() internal {
        // Warp past check-in timeout
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);

        // Guardians attest
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), guardianProofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), guardianProofB);

        // Trigger ClaimPending
        consensus.triggerClaimPending(address(vault));

        // Warp past 72-hour contest window without cancellation
        vm.warp(block.timestamp + CONTEST_WINDOW + 1);

        // Finalize contest
        consensus.finalizeContest(address(vault));
    }

    // --- Configuration Tests ---

    function test_setStreamingConfig_byOwner() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit StreamingConfigUpdated(STREAM_DURATION, INITIAL_RELEASE_BPS, YIELD_BPS);
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, YIELD_BPS);

        assertEq(vault.streamingDuration(), STREAM_DURATION);
        assertEq(vault.initialReleaseBps(), INITIAL_RELEASE_BPS);
        assertEq(vault.streamingYieldBps(), YIELD_BPS);
    }

    function test_setStreamingConfig_nonOwner_reverts() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, YIELD_BPS);
    }

    function test_setStreamingConfig_invalidParams_reverts() public {
        vm.startPrank(owner);
        // Exceeds 10 years
        vm.expectRevert(InheritanceVault.InvalidStreamingConfig.selector);
        vault.setStreamingConfig(11 * 365 days, INITIAL_RELEASE_BPS, YIELD_BPS);

        // Exceeds 100% initial release
        vm.expectRevert(InheritanceVault.InvalidStreamingConfig.selector);
        vault.setStreamingConfig(STREAM_DURATION, 10001, YIELD_BPS);

        // Exceeds 20% APY
        vm.expectRevert(InheritanceVault.InvalidStreamingConfig.selector);
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, 2001);
        vm.stopPrank();
    }

    function test_setStreamingConfig_whenFinalized_reverts() public {
        _advanceVaultToFinalized();

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(InheritanceVault.InvalidState.selector, IProofOfLifeConsensus.ConsensusState.Finalized));
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, YIELD_BPS);
    }

    // --- Cadence Streams Execution & Linear Vesting Tests ---

    function test_streamClaim_initialReleaseAndState() public {
        // Configure 100-day stream with 10% initial release
        vm.prank(owner);
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, 0);

        _advanceVaultToFinalized();

        // Beneficiary A has 50% share of 10 ETH = 5 ETH total share
        // Initial 10% release = 0.5 ETH
        uint256 balBefore = beneficiaryA.balance;

        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        uint256 balAfter = beneficiaryA.balance;
        assertEq(balAfter - balBefore, 0.5 ether, "Initial release should be exactly 10% (0.5 ETH)");

        // Check BeneficiaryStream record
        InheritanceVault.BeneficiaryStream memory stream = vault.getBeneficiaryStream(beneficiaryA);
        assertEq(stream.totalShareEth, 5 ether);
        assertEq(stream.claimedEth, 0.5 ether);
        assertEq(stream.initialPayoutEth, 0.5 ether);
        assertEq(stream.duration, STREAM_DURATION);
        assertEq(stream.streamRecipient, beneficiaryA);
        assertFalse(stream.isPaused);
    }

    function test_streamClaim_perSecondAccrualOverTime() public {
        vm.prank(owner);
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, 0);

        _advanceVaultToFinalized();

        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);
        // Beneficiary received 0.5 ETH. Remaining unstreamed principal = 4.5 ETH over 100 days.

        // 1. Warp 50 days (50% through stream)
        vm.warp(block.timestamp + 50 days);

        (uint256 claimableEth, uint256 totalVestedEth, uint256 remainingLockedEth, ) = vault.claimableStreamAmount(beneficiaryA);
        // 50% of 4.5 ETH = 2.25 ETH claimable
        assertEq(claimableEth, 2.25 ether);
        assertEq(totalVestedEth, 0.5 ether + 2.25 ether);
        assertEq(remainingLockedEth, 2.25 ether);

        // Claim mid-stream
        uint256 balBefore = beneficiaryA.balance;
        vm.prank(beneficiaryA);
        vault.claimStream(beneficiaryA);
        uint256 balAfter = beneficiaryA.balance;

        assertEq(balAfter - balBefore, 2.25 ether, "Should receive 2.25 ETH for 50% elapsed stream");

        // Immediately claiming again yields nothing
        vm.prank(beneficiaryA);
        vm.expectRevert(InheritanceVault.NothingToClaim.selector);
        vault.claimStream(beneficiaryA);

        // 2. Warp another 50 days (100% completion)
        vm.warp(block.timestamp + 50 days);

        (claimableEth, totalVestedEth, remainingLockedEth, ) = vault.claimableStreamAmount(beneficiaryA);
        assertEq(claimableEth, 2.25 ether, "Remaining 2.25 ETH should be claimable at completion");
        assertEq(remainingLockedEth, 0, "Zero funds should remain locked");

        vm.prank(beneficiaryA);
        vault.claimStream(beneficiaryA);

        assertEq(beneficiaryA.balance, 5 ether, "Beneficiary should have received exactly 100% of their 5 ETH share");
    }

    function test_streamClaim_withSimulatedYieldAccrual() public {
        // Configure 365 days stream with 5% APY yield
        vm.prank(owner);
        vault.setStreamingConfig(365 days, 1000, 500); // 10% immediate, 5% APY

        // Deposit extra yield buffer in vault to cover yield payout
        vm.deal(owner, 5 ether);
        vm.prank(owner);
        vault.depositETH{value: 2 ether}();

        _advanceVaultToFinalized();

        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        // Warp 180 days (~half year)
        vm.warp(block.timestamp + 180 days);

        (uint256 claimableEth, , , uint256 accruedYieldEth) = vault.claimableStreamAmount(beneficiaryA);
        assertTrue(accruedYieldEth > 0, "Yield should accrue on locked capital over time");
        assertTrue(claimableEth > 0);

        uint256 balBefore = beneficiaryA.balance;
        vm.prank(beneficiaryA);
        vault.claimStream(beneficiaryA);
        uint256 balAfter = beneficiaryA.balance;

        assertEq(balAfter - balBefore, claimableEth);
    }

    // --- Circuit Breakers & Emergency Freeze Tests ---

    function test_streamCircuitBreaker_beneficiaryPauseAndResume() public {
        vm.prank(owner);
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, 0);

        _advanceVaultToFinalized();

        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        vm.warp(block.timestamp + 25 days);

        // Beneficiary triggers emergency pause
        vm.prank(beneficiaryA);
        vm.expectEmit(true, true, false, false);
        emit StreamPaused(beneficiaryA, beneficiaryA);
        vault.pauseStream(beneficiaryA);

        InheritanceVault.BeneficiaryStream memory stream = vault.getBeneficiaryStream(beneficiaryA);
        assertTrue(stream.isPaused);

        // Attempting to claim while paused reverts
        vm.prank(beneficiaryA);
        vm.expectRevert(InheritanceVault.StreamIsPaused.selector);
        vault.claimStream(beneficiaryA);

        // Beneficiary resumes stream
        vm.prank(beneficiaryA);
        vm.expectEmit(true, true, false, false);
        emit StreamResumed(beneficiaryA, beneficiaryA);
        vault.resumeStream(beneficiaryA);

        // Claim succeeds after resuming
        vm.prank(beneficiaryA);
        vault.claimStream(beneficiaryA);
        assertTrue(beneficiaryA.balance > 0.5 ether);
    }

    function test_streamCircuitBreaker_guardianPause() public {
        vm.prank(owner);
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, 0);

        _advanceVaultToFinalized();

        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        // Stranger with invalid proof fails
        bytes32[] memory badProof = new bytes32[](1);
        badProof[0] = bytes32(uint256(0x999));
        vm.prank(stranger);
        vm.expectRevert(InheritanceVault.UnauthorizedGuardian.selector);
        vault.pauseStreamWithGuardian(beneficiaryA, badProof);

        // Valid guardian freezes the stream
        vm.prank(guardianA);
        vm.expectEmit(true, true, false, false);
        emit StreamPaused(beneficiaryA, guardianA);
        vault.pauseStreamWithGuardian(beneficiaryA, guardianProofA);

        InheritanceVault.BeneficiaryStream memory stream = vault.getBeneficiaryStream(beneficiaryA);
        assertTrue(stream.isPaused);

        // Drainer attempting to claim is blocked
        vm.prank(beneficiaryA);
        vm.expectRevert(InheritanceVault.StreamIsPaused.selector);
        vault.claimStream(beneficiaryA);
    }

    function test_streamRedirect_toBackupAddress() public {
        vm.prank(owner);
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, 0);

        _advanceVaultToFinalized();

        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        // Stranger cannot redirect
        vm.prank(stranger);
        vm.expectRevert(InheritanceVault.OnlyBeneficiaryOrBackup.selector);
        vault.redirectStream(beneficiaryA, safeNewRecipient);

        // Backup address (Bob) redirects stream to safe cold wallet
        vm.prank(backupA);
        vm.expectEmit(true, true, true, false);
        emit StreamRedirected(beneficiaryA, beneficiaryA, safeNewRecipient);
        vault.redirectStream(beneficiaryA, safeNewRecipient);

        InheritanceVault.BeneficiaryStream memory stream = vault.getBeneficiaryStream(beneficiaryA);
        assertEq(stream.streamRecipient, safeNewRecipient);

        // Warp time and execute claimStream from new recipient
        vm.warp(block.timestamp + 50 days);

        uint256 recipientBalBefore = safeNewRecipient.balance;
        vm.prank(safeNewRecipient);
        vault.claimStream(beneficiaryA);
        uint256 recipientBalAfter = safeNewRecipient.balance;

        assertEq(recipientBalAfter - recipientBalBefore, 2.25 ether, "Safe new recipient receives streamed funds");
    }

    /// @notice Consistency Fix (Prompt 8): Backup guardian can pause stream under identical waiting-period rules.
    function test_streamCircuitBreaker_backupGuardianPause_lifecycle() public {
        vm.prank(owner);
        vault.setStreamingConfig(STREAM_DURATION, INITIAL_RELEASE_BPS, 0);

        address backupGuardianA = address(0xBA11);

        // Guardian A registers backupGuardianA
        vm.prank(guardianA);
        guardianRegistry.registerGuardianBackup(backupGuardianA);
        assertEq(guardianRegistry.guardianBackupOf(guardianA), backupGuardianA);

        _advanceVaultToFinalized();

        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        // Immediately after finalization (only 3 days have elapsed since attestation opened),
        // backup attempt to pause fails because 7-day waiting period has NOT elapsed
        vm.prank(backupGuardianA);
        vm.expectRevert(InheritanceVault.UnauthorizedGuardian.selector);
        vault.pauseStreamWithGuardian(beneficiaryA, guardianA, guardianProofA);

        // Warp 5 more days (total 8 days > 7-day BACKUP_WAITING_PERIOD)
        vm.warp(block.timestamp + 5 days);

        // Stranger still fails
        vm.prank(stranger);
        vm.expectRevert(InheritanceVault.UnauthorizedGuardian.selector);
        vault.pauseStreamWithGuardian(beneficiaryA, guardianA, guardianProofA);

        // Backup guardian successfully pauses stream
        vm.prank(backupGuardianA);
        vm.expectEmit(true, true, false, false);
        emit StreamPaused(beneficiaryA, backupGuardianA);
        vault.pauseStreamWithGuardian(beneficiaryA, guardianA, guardianProofA);

        InheritanceVault.BeneficiaryStream memory stream = vault.getBeneficiaryStream(beneficiaryA);
        assertTrue(stream.isPaused);

        // Drainer attempting to claim is blocked while paused
        vm.prank(beneficiaryA);
        vm.expectRevert(InheritanceVault.StreamIsPaused.selector);
        vault.claimStream(beneficiaryA);

        // Beneficiary resumes stream
        vm.prank(beneficiaryA);
        vault.resumeStream(beneficiaryA);
        assertFalse(vault.getBeneficiaryStream(beneficiaryA).isPaused);
    }

    /// @notice Required Test (4): Confirming the same backup-eligibility logic works correctly
    ///         when called via pauseStreamWithGuardian, not just the main consensus attestation flow.
    function test_resilience_4_pauseStreamWithGuardianBackupEligibility() public {
        test_streamCircuitBreaker_backupGuardianPause_lifecycle();
    }
}
