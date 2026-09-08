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

/// @title BeneficiaryClaimFlowTest
/// @notice Comprehensive integration test for the end-to-end beneficiary claim path:
///         1. Pre-claim state checks (Active & ClaimPending cannot claim)
///         2. Finalized transition via Proof-of-Life consensus
///         3. Pro-rata asset distribution (ETH & ERC-20)
///         4. Double-claim prevention
///         5. Proof binding to msg.sender (stranger cannot steal allocation)
contract BeneficiaryClaimFlowTest is Test {
    InheritanceVault internal vault;
    ProofOfLifeConsensus internal consensus;
    GuardianRegistry internal guardianRegistry;
    MockERC20 internal usdc;

    address internal owner = address(0xAA11);
    // Demo Alice & Bob matching frontend/lib/vaultRegistry.ts DEMO_BENEFICIARIES
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

    // Guardians for M-of-N attestation
    address internal guardian1 = address(0x1001);
    address internal guardian2 = address(0x1002);
    address internal guardian3 = address(0x1003);
    bytes32 internal guardianRoot;
    bytes32[] internal guardianProof1;
    bytes32[] internal guardianProof2;

    uint256 internal constant CHECK_IN_INTERVAL = 90 days;
    uint256 internal constant CONTEST_WINDOW = 72 hours;

    uint256 internal constant DEPOSIT_ETH = 5 ether;
    uint256 internal constant DEPOSIT_USDC = 10_000 * 1e6; // 10,000 USDC

    event ClaimExecuted(address indexed beneficiary, uint256 shareBps, uint256 ethAmount);

    function setUp() public {
        vm.warp(1_700_000_000);

        // 1. Deploy dependencies
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // 2. Build allocationRoot Merkle tree
        leafAlice = MerkleProofLib.computeAllocationLeaf(alice, ALICE_SHARE_BPS, SALT_ALICE);
        leafBob = MerkleProofLib.computeAllocationLeaf(bob, BOB_SHARE_BPS, SALT_BOB);
        allocationRoot = Hashes.commutativeKeccak256(leafAlice, leafBob);

        proofAlice = new bytes32[](1);
        proofAlice[0] = leafBob;

        proofBob = new bytes32[](1);
        proofBob[0] = leafAlice;

        // 3. Build Guardian Merkle tree (2-of-3 threshold)
        bytes32 gLeaf1 = MerkleProofLib.computeGuardianLeaf(guardian1);
        bytes32 gLeaf2 = MerkleProofLib.computeGuardianLeaf(guardian2);
        guardianRoot = Hashes.commutativeKeccak256(gLeaf1, gLeaf2);

        guardianProof1 = new bytes32[](1);
        guardianProof1[0] = gLeaf2;

        guardianProof2 = new bytes32[](1);
        guardianProof2[0] = gLeaf1;

        // 4. Deploy InheritanceVault
        address[] memory initialTokens = new address[](1);
        initialTokens[0] = address(usdc);
        vault = new InheritanceVault(owner, CHECK_IN_INTERVAL, initialTokens, address(consensus));
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));

        // 5. Commit Guardian Root as owner (threshold 2-of-2)
        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 2, 2);

        // 6. Whitelist USDC and Commit allocationRoot
        vm.startPrank(owner);
        vault.setAllocationRoot(allocationRoot);
        vm.stopPrank();

        // 7. Fund vault with ETH and USDC
        vm.deal(address(this), DEPOSIT_ETH);
        (bool success, ) = address(vault).call{value: DEPOSIT_ETH}("");
        require(success, "ETH transfer failed");

        usdc.mint(address(vault), DEPOSIT_USDC);
    }

    /// @notice Confirms claim reverts during Active state
    function test_claimDuringActiveState_reverts() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(
                InheritanceVault.VaultNotFinalized.selector,
                IProofOfLifeConsensus.ConsensusState.Active
            )
        );
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);
    }

    /// @notice Confirms claim reverts during ClaimPending (contest window)
    function test_claimDuringContestWindow_reverts() public {
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

    /// @notice Tests the complete successful decrypt-and-claim flow for all beneficiaries
    function test_fullClaimFlow_success() public {
        _advanceToFinalized();

        assertEq(uint8(vault.getConsensusState()), uint8(IProofOfLifeConsensus.ConsensusState.Finalized));
        assertEq(vault.hasClaimed(alice), false);
        assertEq(vault.hasClaimed(bob), false);

        uint256 aliceEthPre = alice.balance;
        uint256 aliceUsdcPre = usdc.balanceOf(alice);

        // --- Alice Claims 40% ---
        vm.expectEmit(true, false, false, true, address(vault));
        emit ClaimExecuted(alice, ALICE_SHARE_BPS, 2 ether);

        vm.prank(alice);
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);

        assertEq(vault.hasClaimed(alice), true);
        assertEq(alice.balance - aliceEthPre, 2 ether, "Alice received exact 40% ETH (2.0 ETH)");
        assertEq(usdc.balanceOf(alice) - aliceUsdcPre, 4_000 * 1e6, "Alice received exact 40% USDC (4,000 USDC)");

        // --- Bob Claims 60% ---
        uint256 bobEthPre = bob.balance;
        uint256 bobUsdcPre = usdc.balanceOf(bob);

        vm.expectEmit(true, false, false, true, address(vault));
        emit ClaimExecuted(bob, BOB_SHARE_BPS, 3 ether);

        vm.prank(bob);
        vault.claim(BOB_SHARE_BPS, SALT_BOB, proofBob);

        assertEq(vault.hasClaimed(bob), true);
        assertEq(bob.balance - bobEthPre, 3 ether, "Bob received exact 60% ETH (3.0 ETH)");
        assertEq(usdc.balanceOf(bob) - bobUsdcPre, 6_000 * 1e6, "Bob received exact 60% USDC (6,000 USDC)");

        // --- Residual Vault Balances are Exactly Zero ---
        assertEq(address(vault).balance, 0, "Vault ETH balance is 0 after 100% claims");
        assertEq(usdc.balanceOf(address(vault)), 0, "Vault USDC balance is 0 after 100% claims");
    }

    /// @notice Confirms double-claiming is rejected
    function test_doubleClaim_reverts() public {
        _advanceToFinalized();

        vm.prank(alice);
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(InheritanceVault.AlreadyClaimed.selector, alice));
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);
    }

    /// @notice Confirms caller binding to msg.sender prevents proof theft
    function test_strangerCannotClaimWithAliceProof() public {
        _advanceToFinalized();

        vm.prank(stranger);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claim(ALICE_SHARE_BPS, SALT_ALICE, proofAlice);
    }

    /// @notice Confirms altered share is rejected
    function test_alteredShare_reverts() public {
        _advanceToFinalized();

        vm.prank(alice);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        // Alice attempts to claim 5000 bps instead of 4000 bps
        vault.claim(5000, SALT_ALICE, proofAlice);
    }

    // --- Helper Functions ---

    function _advanceToClaimPending() internal {
        // 1. Timeout expires
        vm.warp(block.timestamp + CHECK_IN_INTERVAL + 1);

        // 2. Guardian 1 attestation
        vm.prank(guardian1);
        guardianRegistry.attest(address(vault), guardianProof1);

        // 3. Guardian 2 attestation
        vm.prank(guardian2);
        guardianRegistry.attest(address(vault), guardianProof2);

        // 4. Trigger ClaimPending transition
        consensus.triggerClaimPending(address(vault));

        assertEq(uint8(vault.getConsensusState()), uint8(IProofOfLifeConsensus.ConsensusState.ClaimPending));
    }

    function _advanceToFinalized() internal {
        _advanceToClaimPending();

        // Advance past contest window
        vm.warp(block.timestamp + CONTEST_WINDOW + 1);

        // Finalize contest
        consensus.finalizeContest(address(vault));

        assertEq(uint8(vault.getConsensusState()), uint8(IProofOfLifeConsensus.ConsensusState.Finalized));
    }
}
