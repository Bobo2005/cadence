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

/// @title USDGIntegrationTest
/// @notice Comprehensive integration test suite verifying that Paxos Global Dollar (USDG)
///         works identically to existing supported assets across all stages:
///         1. Whitelisting & Deposit Flow
///         2. Beneficiary Allocation Commitment & Privacy
///         3. Proof-of-Life State Transitions
///         4. Full Claim Flow & Pro-Rata Distribution
///         5. Double-Claim Prevention & Security Hardening (proof-theft, altered share, invalid salt)
contract USDGIntegrationTest is Test {
    InheritanceVault internal vault;
    ProofOfLifeConsensus internal consensus;
    GuardianRegistry internal guardianRegistry;
    MockERC20 internal usdg;

    address internal owner = address(0xAA11);
    address internal depositor = address(0xD00D);
    address internal alice = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address internal bob = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address internal stranger = address(0xDEAD);

    uint256 internal constant ALICE_SHARE_BPS = 4000; // 40.00%
    uint256 internal constant BOB_SHARE_BPS = 6000;   // 60.00%

    bytes32 internal constant SALT_ALICE = 0x1111111111111111111111111111111111111111111111111111111111111111;
    bytes32 internal constant SALT_BOB = 0x2222222222222222222222222222222222222222222222222222222222222222;

    bytes32 internal leafAlice;
    bytes32 internal leafBob;
    bytes32 internal allocationRoot;
    bytes32[] internal proofAlice;
    bytes32[] internal proofBob;

    // Guardians for 2-of-3 threshold
    address internal guardian1 = address(0x1001);
    address internal guardian2 = address(0x1002);
    address internal guardian3 = address(0x1003);
    bytes32 internal guardianRoot;
    bytes32[] internal guardianProof1;
    bytes32[] internal guardianProof2;

    uint256 internal constant CHECK_IN_INTERVAL = 90 days;
    uint256 internal constant CONTEST_WINDOW = 72 hours;
    uint256 internal constant DEPOSIT_USDG = 10_000 * 1e6; // 10,000 USDG (6 decimals)

    event Deposit(address indexed sender, address indexed token, uint256 amount);
    event AllocationRootCommitted(bytes32 indexed root, uint256 timestamp);
    event ClaimExecuted(address indexed beneficiary, uint256 shareBps, uint256 ethAmount);

    function setUp() public {
        vm.warp(1_700_000_000);

        // 1. Deploy dependencies
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));

        // 2. Deploy USDG mock (Paxos Global Dollar, 6 decimals)
        usdg = new MockERC20("Paxos Global Dollar", "USDG", 6);

        // 3. Build 2-beneficiary Merkle tree for allocationRoot (Alice 40%, Bob 60%)
        leafAlice = MerkleProofLib.computeAllocationLeaf(alice, ALICE_SHARE_BPS, SALT_ALICE);
        leafBob = MerkleProofLib.computeAllocationLeaf(bob, BOB_SHARE_BPS, SALT_BOB);
        allocationRoot = Hashes.commutativeKeccak256(leafAlice, leafBob);

        proofAlice = new bytes32[](1);
        proofAlice[0] = leafBob;

        proofBob = new bytes32[](1);
        proofBob[0] = leafAlice;

        // 4. Build Guardian Merkle tree (2-of-3 threshold)
        bytes32 gLeaf1 = MerkleProofLib.computeGuardianLeaf(guardian1);
        bytes32 gLeaf2 = MerkleProofLib.computeGuardianLeaf(guardian2);
        guardianRoot = Hashes.commutativeKeccak256(gLeaf1, gLeaf2);

        guardianProof1 = new bytes32[](1);
        guardianProof1[0] = gLeaf2;

        guardianProof2 = new bytes32[](1);
        guardianProof2[0] = gLeaf1;

        // 5. Deploy InheritanceVault with USDG whitelisted in constructor
        address[] memory initialTokens = new address[](1);
        initialTokens[0] = address(usdg);
        vault = new InheritanceVault(owner, CHECK_IN_INTERVAL, initialTokens, address(consensus));

        // 6. Commit Guardian Root as owner
        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 2, 2);
        vm.prank(owner);
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));

        // 7. Mint USDG to depositor
        usdg.mint(depositor, 50_000 * 1e6);
    }

    // =========================================================================
    // 1. USDG Whitelist & Deposit Flow Tests
    // =========================================================================

    /// @notice Confirms USDG is whitelisted upon initialization and accepts deposits
    function test_usdg_whitelistAndDepositFlow() public {
        assertTrue(vault.isWhitelistedToken(address(usdg)), "USDG must be whitelisted");

        // Depositor approves and deposits 10,000 USDG
        vm.startPrank(depositor);
        usdg.approve(address(vault), DEPOSIT_USDG);

        vm.expectEmit(true, true, false, true);
        emit Deposit(depositor, address(usdg), DEPOSIT_USDG);

        vault.depositToken(address(usdg), DEPOSIT_USDG);
        vm.stopPrank();

        assertEq(usdg.balanceOf(address(vault)), DEPOSIT_USDG, "Vault must hold 10,000 USDG");
        assertEq(vault.totalDeposited(address(usdg)), DEPOSIT_USDG, "totalDeposited must reflect 10,000 USDG");
        assertEq(vault.getVaultBalance(address(usdg)), DEPOSIT_USDG, "getVaultBalance must report 10,000 USDG");
    }

    /// @notice Confirms USDG deposit without approval reverts
    function test_usdg_depositWithoutApproval_reverts() public {
        vm.prank(depositor);
        vm.expectRevert();
        vault.depositToken(address(usdg), DEPOSIT_USDG);
    }

    // =========================================================================
    // 2. Allocation Encryption & Merkle Commitment Tests
    // =========================================================================

    /// @notice Confirms allocationRoot committing works identically for USDG vaults
    function test_usdg_allocationRootCommitment() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit AllocationRootCommitted(allocationRoot, block.timestamp);

        vault.setAllocationRoot(allocationRoot);
        assertEq(vault.allocationRoot(), allocationRoot, "allocationRoot mismatch");

        // Non-owner cannot commit allocationRoot
        vm.prank(stranger);
        vm.expectRevert();
        vault.setAllocationRoot(allocationRoot);
    }

    // =========================================================================
    // 3. Pre-Claim State Guard Tests
    // =========================================================================

    /// @notice Confirms claim reverts during Active state
    function test_usdg_claimDuringActiveState_reverts() public {
        _setupAndFundVault();

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                InheritanceVault.VaultNotFinalized.selector,
                IProofOfLifeConsensus.ConsensusState.Active
            )
        );
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);
    }

    /// @notice Confirms claim reverts during ClaimPending state (within contest window)
    function test_usdg_claimDuringContestWindow_reverts() public {
        _setupAndFundVault();
        _advanceToClaimPending();

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                InheritanceVault.VaultNotFinalized.selector,
                IProofOfLifeConsensus.ConsensusState.ClaimPending
            )
        );
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);
    }

    // =========================================================================
    // 4. Full End-to-End USDG Claim Flow Tests
    // =========================================================================

    /// @notice Verifies the complete decrypt-and-claim flow with USDG:
    ///         Alice receives 40% (4,000 USDG), Bob receives 60% (6,000 USDG),
    ///         and residual vault balance is 0.
    function test_usdg_fullClaimFlow_success() public {
        _setupAndFundVault();
        _advanceToFinalized();

        assertEq(uint8(vault.getConsensusState()), uint8(IProofOfLifeConsensus.ConsensusState.Finalized));
        assertFalse(vault.hasClaimed(alice));
        assertFalse(vault.hasClaimed(bob));

        uint256 aliceUsdgPre = usdg.balanceOf(alice);

        // --- Alice Claims 40% of USDG ---
        vm.prank(alice);
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);

        assertTrue(vault.hasClaimed(alice));
        assertEq(
            usdg.balanceOf(alice) - aliceUsdgPre,
            4_000 * 1e6,
            "Alice must receive exactly 40% of deposited USDG (4,000 USDG)"
        );

        // --- Bob Claims 60% of USDG ---
        uint256 bobUsdgPre = usdg.balanceOf(bob);

        vm.prank(bob);
        vault.claim(BOB_SHARE_BPS, SALT_BOB, proofBob);

        assertTrue(vault.hasClaimed(bob));
        assertEq(
            usdg.balanceOf(bob) - bobUsdgPre,
            6_000 * 1e6,
            "Bob must receive exactly 60% of deposited USDG (6,000 USDG)"
        );

        // --- Residual Vault USDG Balance is Exactly Zero ---
        assertEq(usdg.balanceOf(address(vault)), 0, "Vault USDG balance must be 0 after 100% distribution");
    }

    // =========================================================================
    // 5. Security & Edge Case Tests for USDG Claims
    // =========================================================================

    /// @notice Double-claiming USDG is rejected
    function test_usdg_doubleClaim_reverts() public {
        _setupAndFundVault();
        _advanceToFinalized();

        vm.prank(alice);
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(InheritanceVault.AlreadyClaimed.selector, alice));
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);
    }

    /// @notice Caller binding prevents a stranger from stealing Alice's USDG allocation
    function test_usdg_strangerCannotClaimWithAliceProof() public {
        _setupAndFundVault();
        _advanceToFinalized();

        vm.prank(stranger);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);
    }

    /// @notice Altered share percentage is rejected by Merkle verification
    function test_usdg_alteredShare_reverts() public {
        _setupAndFundVault();
        _advanceToFinalized();

        vm.prank(alice);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        // Alice attempts to claim 50% (5000 bps) instead of committed 40% (4000 bps)
        vault.claim(5000, SALT_ALICE, proofAlice);
    }

    /// @notice Wrong secret salt is rejected by Merkle verification
    function test_usdg_wrongSalt_reverts() public {
        _setupAndFundVault();
        _advanceToFinalized();

        bytes32 wrongSalt = bytes32(uint256(0x9999));
        vm.prank(alice);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claim(ALICE_SHARE_BPS, wrongSalt, proofAlice);
    }

    // =========================================================================
    // Helper Functions
    // =========================================================================

    function _setupAndFundVault() internal {
        // Owner commits allocation root
        vm.prank(owner);
        vault.setAllocationRoot(allocationRoot);

        // Depositor deposits 10,000 USDG
        vm.startPrank(depositor);
        usdg.approve(address(vault), DEPOSIT_USDG);
        vault.depositToken(address(usdg), DEPOSIT_USDG);
        vm.stopPrank();
    }

    function _advanceToClaimPending() internal {
        // Inactivity timeout expires
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);

        // Guardian 1 attests
        vm.prank(guardian1);
        guardianRegistry.attest(address(vault), guardianProof1);

        // Guardian 2 attests (2-of-3 threshold reached)
        vm.prank(guardian2);
        guardianRegistry.attest(address(vault), guardianProof2);

        // Trigger ClaimPending
        consensus.triggerClaimPending(address(vault));
        assertEq(uint8(vault.getConsensusState()), uint8(IProofOfLifeConsensus.ConsensusState.ClaimPending));
    }

    function _advanceToFinalized() internal {
        _advanceToClaimPending();

        // Warp past 72-hour contestation window
        vm.warp(block.timestamp + CONTEST_WINDOW + 1);

        // Finalize contest
        consensus.finalizeContest(address(vault));
        assertEq(uint8(vault.getConsensusState()), uint8(IProofOfLifeConsensus.ConsensusState.Finalized));
    }
}
