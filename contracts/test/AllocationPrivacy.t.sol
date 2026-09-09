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

/// @title AllocationPrivacyTest
/// @notice Tests for the encrypted-allocation / allocationRoot privacy design per:
///         - docs/ARCHITECTURE.md
///         - docs/PROJECT-PLAN.md Section 7
///         - docs/MEMORY.md Constraint #3 ("No plaintext allocation data on-chain")
///
///         Verifies that:
///         (1) A plaintext getStorageAt-style read of the contract reveals NO allocation data
///             (neither shareBps, nor salts, nor plaintext beneficiary allocations).
///         (2) A valid proof against allocationRoot unlocks the exact proportional share of ETH
///             and whitelisted ERC-20 tokens.
///         (3) Multiple beneficiaries claiming sequentially receive their exact allocations.
///         (4) Double-claiming is prevented.
///         (5) Altered shares, wrong salts, or foreign proofs are rejected.
///         (6) Claims prior to Finalized state are blocked.
contract AllocationPrivacyTest is Test {
    InheritanceVault internal vault;
    ProofOfLifeConsensus internal consensus;
    GuardianRegistry internal guardianRegistry;
    MockERC20 internal usdc;

    address internal owner = address(0xAA11);
    address internal beneficiaryA = address(0x1111);
    address internal beneficiaryB = address(0x2222);
    address internal stranger = address(0xDEAD);

    uint256 internal constant SHARE_A_BPS = 4000; // 40%
    uint256 internal constant SHARE_B_BPS = 6000; // 60%

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

    event AllocationRootCommitted(bytes32 indexed root, uint256 timestamp);
    event ClaimExecuted(address indexed beneficiary, uint256 shareBps, uint256 ethAmount);

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
    }

    // --- Helper to advance lifecycle from Active -> ClaimPending -> Finalized ---
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

        assertEq(
            uint256(consensus.getState(address(vault))),
            uint256(IProofOfLifeConsensus.ConsensusState.Finalized),
            "Vault state must be Finalized"
        );
    }

    // =========================================================================
    // 1. Storage Inspection — Architecture Constraint #3 Enforcement
    // =========================================================================

    /// @notice Confirms that a getStorageAt-style read of contract storage slots
    ///         reveals NO plaintext allocation data (the exact "On-Chain Storage Trap").
    function test_getStorageAt_revealsNoPlaintextAllocationData() public view {
        // Architecture Constraint #3: Plaintext shares (4,000 bps or 6,000 bps) or beneficiary
        // addresses must NEVER be stored in any slot or mapping in InheritanceVault.
        bytes32 shareValA = bytes32(uint256(SHARE_A_BPS));
        bytes32 shareValB = bytes32(uint256(SHARE_B_BPS));
        bytes32 addrValA = bytes32(uint256(uint160(beneficiaryA)));
        bytes32 addrValB = bytes32(uint256(uint160(beneficiaryB)));

        // Scan sequential contract storage slots 0 through 50
        for (uint256 slot = 0; slot <= 50; slot++) {
            bytes32 slotData = vm.load(address(vault), bytes32(slot));

            // No sequential slot should contain plaintext share percentage
            assertFalse(
                slotData == shareValA,
                "Plaintext share 4000 bps found in storage slot"
            );
            assertFalse(
                slotData == shareValB,
                "Plaintext share 6000 bps found in storage slot"
            );

            // No sequential slot should contain plaintext beneficiary address
            assertFalse(
                slotData == addrValA,
                "Plaintext beneficiary A address found in storage slot"
            );
            assertFalse(
                slotData == addrValB,
                "Plaintext beneficiary B address found in storage slot"
            );

            // No sequential slot should contain blinding salt
            assertFalse(
                slotData == saltA || slotData == saltB,
                "Blinding salt found in storage slot"
            );

            // Check mapping derivations: mapping(address => uint256) slot = keccak256(k . slot)
            bytes32 mappingSlotA = keccak256(abi.encode(beneficiaryA, slot));
            bytes32 mappingSlotB = keccak256(abi.encode(beneficiaryB, slot));

            assertFalse(
                vm.load(address(vault), mappingSlotA) == shareValA,
                "Plaintext share 4000 found in mapping slot"
            );
            assertFalse(
                vm.load(address(vault), mappingSlotB) == shareValB,
                "Plaintext share 6000 found in mapping slot"
            );
        }

        // Confirm that the only stored value is the cryptographic commitment allocationRoot
        assertEq(
            vault.allocationRoot(),
            root,
            "Only cryptographic Merkle root is committed"
        );
    }

    // =========================================================================
    // 2. Merkle Claim Verification & Proportional Settlement
    // =========================================================================

    /// @notice Confirms a valid proof against allocationRoot unlocks the exact proportional share of assets.
    function test_validMerkleProof_claimSucceeds() public {
        _advanceVaultToFinalized();

        uint256 ethBalBeforeA = beneficiaryA.balance;
        uint256 usdcBalBeforeA = usdc.balanceOf(beneficiaryA);

        uint256 expectedEthPayoutA = (VAULT_ETH_DEPOSIT * SHARE_A_BPS) / 10000; // 4 ETH
        uint256 expectedUsdcPayoutA = (VAULT_USDC_DEPOSIT * SHARE_A_BPS) / 10000; // 400 USDC

        // Beneficiary A claims with proof
        vm.expectEmit(true, false, false, true);
        emit ClaimExecuted(beneficiaryA, SHARE_A_BPS, expectedEthPayoutA);

        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        // Verify payouts
        assertEq(beneficiaryA.balance - ethBalBeforeA, expectedEthPayoutA, "Exact 40% ETH payout");
        assertEq(usdc.balanceOf(beneficiaryA) - usdcBalBeforeA, expectedUsdcPayoutA, "Exact 40% USDC payout");
        assertTrue(vault.hasClaimed(beneficiaryA), "Beneficiary A marked as claimed");
    }

    /// @notice Confirms multiple beneficiaries claiming sequentially receive their exact allocations.
    function test_multiBeneficiary_claimsAllAssetsCorrectly() public {
        _advanceVaultToFinalized();

        // 1. Beneficiary A claims (40%)
        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        assertEq(beneficiaryA.balance, 4 ether);
        assertEq(usdc.balanceOf(beneficiaryA), 400 * 1e6);

        // 2. Beneficiary B claims (60%)
        vm.prank(beneficiaryB);
        vault.claim(SHARE_B_BPS, saltB, proofB);

        assertEq(beneficiaryB.balance, 6 ether);
        assertEq(usdc.balanceOf(beneficiaryB), 600 * 1e6);

        // 3. Vault balance is completely distributed (0 remaining)
        assertEq(address(vault).balance, 0, "All vault ETH distributed");
        assertEq(usdc.balanceOf(address(vault)), 0, "All vault USDC distributed");
    }

    /// @notice Confirms double-claiming by the same beneficiary is rejected.
    function test_alreadyClaimed_reverts() public {
        _advanceVaultToFinalized();

        // First claim succeeds
        vm.prank(beneficiaryA);
        vault.claim(SHARE_A_BPS, saltA, proofA);

        // Second claim attempt reverts
        vm.prank(beneficiaryA);
        vm.expectRevert(
            abi.encodeWithSelector(InheritanceVault.AlreadyClaimed.selector, beneficiaryA)
        );
        vault.claim(SHARE_A_BPS, saltA, proofA);
    }

    /// @notice Confirms submitting a modified share percentage is rejected by Merkle verification.
    function test_invalidShare_proofRejected() public {
        _advanceVaultToFinalized();

        uint256 greedyShare = 5000; // Attempts to claim 50% instead of 40%

        vm.prank(beneficiaryA);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claim(greedyShare, saltA, proofA);
    }

    /// @notice Confirms submitting an incorrect blinding salt is rejected.
    function test_wrongSalt_proofRejected() public {
        _advanceVaultToFinalized();

        bytes32 wrongSalt = bytes32(uint256(0x9999));

        vm.prank(beneficiaryA);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claim(SHARE_A_BPS, wrongSalt, proofA);
    }

    /// @notice Confirms Beneficiary B cannot use Beneficiary A's valid proof to claim for themselves.
    function test_otherBeneficiaryProof_cannotClaimForSelf() public {
        _advanceVaultToFinalized();

        // Beneficiary B attempts to submit Beneficiary A's proof
        vm.prank(beneficiaryB);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claim(SHARE_A_BPS, saltA, proofA);
    }

    /// @notice Confirms an arbitrary stranger with no leaf in allocationRoot cannot claim.
    function test_strangerProof_cannotClaim() public {
        _advanceVaultToFinalized();

        vm.prank(stranger);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claim(SHARE_A_BPS, saltA, proofA);
    }

    // =========================================================================
    // 3. Lifecycle & Access Control Guards
    // =========================================================================

    /// @notice Confirms claim is blocked when vault is in Active or ClaimPending state.
    function test_claimBeforeFinalized_reverts() public {
        // 1. Currently Active state
        vm.prank(beneficiaryA);
        vm.expectRevert(
            abi.encodeWithSelector(
                InheritanceVault.VaultNotFinalized.selector,
                IProofOfLifeConsensus.ConsensusState.Active
            )
        );
        vault.claim(SHARE_A_BPS, saltA, proofA);

        // 2. Advance to ClaimPending
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), guardianProofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), guardianProofB);
        consensus.triggerClaimPending(address(vault));

        vm.prank(beneficiaryA);
        vm.expectRevert(
            abi.encodeWithSelector(
                InheritanceVault.VaultNotFinalized.selector,
                IProofOfLifeConsensus.ConsensusState.ClaimPending
            )
        );
        vault.claim(SHARE_A_BPS, saltA, proofA);
    }

    /// @notice Confirms claim reverts if allocationRoot was never committed.
    function test_uncommittedRoot_claimReverts() public {
        // Deploy new vault without setting allocationRoot
        address[] memory tokens = new address[](0);
        InheritanceVault freshVault = new InheritanceVault(owner, CHECK_IN_INTERVAL, tokens, address(consensus));
        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(freshVault), guardianRoot, 2, 2);

        vm.prank(owner);
        guardianRegistry.setConsensusForVault(address(freshVault), address(consensus));

        // Warp and advance to Finalized
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        vm.prank(guardianA);
        guardianRegistry.attest(address(freshVault), guardianProofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(freshVault), guardianProofB);
        consensus.triggerClaimPending(address(freshVault));
        vm.warp(block.timestamp + CONTEST_WINDOW + 1);
        consensus.finalizeContest(address(freshVault));

        vm.prank(beneficiaryA);
        vm.expectRevert(InheritanceVault.RootNotCommitted.selector);
        freshVault.claim(SHARE_A_BPS, saltA, proofA);
    }

    /// @notice Verifies access control and guards on setAllocationRoot.
    function test_setAllocationRoot_accessControl() public {
        bytes32 newRoot = keccak256("new_root");

        // Non-owner cannot commit root
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger)
        );
        vault.setAllocationRoot(newRoot);

        // Zero root reverts
        vm.prank(owner);
        vm.expectRevert(InheritanceVault.InvalidRoot.selector);
        vault.setAllocationRoot(bytes32(0));

        // Advance to ClaimPending — owner can no longer mutate root
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);
        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), guardianProofA);
        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), guardianProofB);
        consensus.triggerClaimPending(address(vault));

        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                InheritanceVault.InvalidState.selector,
                IProofOfLifeConsensus.ConsensusState.ClaimPending
            )
        );
        vault.setAllocationRoot(newRoot);
    }
}
