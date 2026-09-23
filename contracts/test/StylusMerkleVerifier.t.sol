// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StylusMerkleVerifier} from "../src/StylusMerkleVerifier.sol";
import {IMerkleVerifier} from "../src/interfaces/IMerkleVerifier.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {IProofOfLifeConsensus} from "../src/interfaces/IProofOfLifeConsensus.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {Hashes} from "@openzeppelin/contracts/utils/cryptography/Hashes.sol";

/// @title StylusMerkleVerifierTest
/// @notice Verifies that the Stylus verification contract's results match the original
///         Solidity MerkleProofLib implementation exactly, and tests standard ABI integration
///         with InheritanceVault.
contract StylusMerkleVerifierTest is Test {
    StylusMerkleVerifier internal stylusVerifier;
    ProofOfLifeConsensus internal consensus;
    GuardianRegistry internal guardianRegistry;
    InheritanceVault internal vault;
    MockERC20 internal usdc;

    address internal owner = address(0xAA11);
    address internal alice = address(0xBB22);
    address internal bob = address(0xCC33);
    address internal charlie = address(0xDD44);
    address internal stranger = address(0xEE55);
    address internal aliceBackup = address(0xFF66);

    address internal guardian1 = address(0x7001);
    address internal guardian2 = address(0x7002);

    bytes32 internal constant SALT_ALICE = keccak256("ALICE_SALT_STYLUS");
    bytes32 internal constant SALT_BOB = keccak256("BOB_SALT_STYLUS");
    bytes32 internal constant SALT_CHARLIE = keccak256("CHARLIE_SALT_STYLUS");

    uint256 internal constant SHARE_ALICE = 4000; // 40%
    uint256 internal constant SHARE_BOB = 3500;   // 35%
    uint256 internal constant SHARE_CHARLIE = 2500; // 25%

    bytes32 internal leafAlice;
    bytes32 internal leafBob;
    bytes32 internal leafCharlie;
    bytes32 internal allocationRoot;

    bytes32[] internal proofAlice;
    bytes32[] internal proofBob;

    bytes32 internal guardianRoot;
    bytes32[] internal guardianProof1;
    bytes32[] internal guardianProof2;

    function setUp() public {
        stylusVerifier = new StylusMerkleVerifier();
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));

        address[] memory initialTokens = new address[](1);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        initialTokens[0] = address(usdc);

        vm.prank(owner);
        vault = new InheritanceVault(owner, 30 days, initialTokens, address(consensus));

        // Build 2-leaf allocation tree for Alice and Bob
        leafAlice = MerkleProofLib.computeAllocationLeaf(alice, SHARE_ALICE, SALT_ALICE);
        leafBob = MerkleProofLib.computeAllocationLeaf(bob, SHARE_BOB, SALT_BOB);
        leafCharlie = MerkleProofLib.computeAllocationLeaf(charlie, SHARE_CHARLIE, SALT_CHARLIE);

        if (leafAlice <= leafBob) {
            allocationRoot = keccak256(abi.encodePacked(leafAlice, leafBob));
        } else {
            allocationRoot = keccak256(abi.encodePacked(leafBob, leafAlice));
        }

        proofAlice = new bytes32[](1);
        proofAlice[0] = leafBob;

        proofBob = new bytes32[](1);
        proofBob[0] = leafAlice;

        vm.prank(owner);
        vault.setAllocationRoot(allocationRoot);

        // Build Guardian Merkle tree (2-of-2)
        bytes32 gLeaf1 = MerkleProofLib.computeGuardianLeaf(guardian1);
        bytes32 gLeaf2 = MerkleProofLib.computeGuardianLeaf(guardian2);
        guardianRoot = Hashes.commutativeKeccak256(gLeaf1, gLeaf2);

        guardianProof1 = new bytes32[](1);
        guardianProof1[0] = gLeaf2;

        guardianProof2 = new bytes32[](1);
        guardianProof2[0] = gLeaf1;

        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 2, 2);
        vm.prank(owner);
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));

        // Fund vault with 10 ETH and 10,000 USDC
        vm.deal(address(vault), 10 ether);
        usdc.mint(address(vault), 10_000 * 1e6);
    }

    // =========================================================================
    // 1. LEAF COMPUTATION PARITY TESTS
    // =========================================================================

    function test_parity_computeGuardianLeaf_exactMatch() public view {
        address[5] memory sampleGuardians = [
            address(0x1),
            address(0x1234567890123456789012345678901234567890),
            address(0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF),
            alice,
            owner
        ];

        for (uint256 i = 0; i < sampleGuardians.length; i++) {
            bytes32 expected = MerkleProofLib.computeGuardianLeaf(sampleGuardians[i]);
            bytes32 actual = stylusVerifier.computeGuardianLeaf(sampleGuardians[i]);
            assertEq(actual, expected, "computeGuardianLeaf mismatch between Stylus and Solidity");
        }
    }

    function test_parity_computeAllocationLeaf_exactMatch() public view {
        address[3] memory beneficiaries = [alice, bob, charlie];
        uint256[3] memory shares = [SHARE_ALICE, SHARE_BOB, SHARE_CHARLIE];
        bytes32[3] memory salts = [SALT_ALICE, SALT_BOB, SALT_CHARLIE];

        for (uint256 i = 0; i < 3; i++) {
            bytes32 expected = MerkleProofLib.computeAllocationLeaf(beneficiaries[i], shares[i], salts[i]);
            bytes32 actual = stylusVerifier.computeAllocationLeaf(beneficiaries[i], shares[i], salts[i]);
            assertEq(actual, expected, "computeAllocationLeaf mismatch between Stylus and Solidity");
        }
    }

    // =========================================================================
    // 2. PROOF VERIFICATION PARITY TESTS
    // =========================================================================

    function test_parity_validProof_bothReturnTrue() public view {
        bool solValid = MerkleProofLib.verify(proofAlice, allocationRoot, leafAlice);
        bool stylusValid = stylusVerifier.verify(proofAlice, allocationRoot, leafAlice);

        assertTrue(solValid, "Solidity should verify valid proof");
        assertTrue(stylusValid, "Stylus should verify valid proof");
        assertEq(stylusValid, solValid, "Stylus and Solidity verification parity mismatch");
    }

    function test_parity_invalidRoot_bothReturnFalse() public view {
        bytes32 corruptedRoot = keccak256("CORRUPTED_ROOT");
        bool solValid = MerkleProofLib.verify(proofAlice, corruptedRoot, leafAlice);
        bool stylusValid = stylusVerifier.verify(proofAlice, corruptedRoot, leafAlice);

        assertFalse(solValid, "Solidity should reject corrupted root");
        assertFalse(stylusValid, "Stylus should reject corrupted root");
        assertEq(stylusValid, solValid, "Parity check failed on corrupted root");
    }

    function test_parity_tamperedSibling_bothReturnFalse() public view {
        bytes32[] memory tamperedProof = new bytes32[](1);
        tamperedProof[0] = keccak256("FAKE_SIBLING");

        bool solValid = MerkleProofLib.verify(tamperedProof, allocationRoot, leafAlice);
        bool stylusValid = stylusVerifier.verify(tamperedProof, allocationRoot, leafAlice);

        assertFalse(solValid, "Solidity should reject tampered proof");
        assertFalse(stylusValid, "Stylus should reject tampered proof");
        assertEq(stylusValid, solValid, "Parity check failed on tampered sibling");
    }

    function test_parity_tamperedLeaf_bothReturnFalse() public view {
        bytes32 tamperedLeaf = keccak256("TAMPERED_LEAF");

        bool solValid = MerkleProofLib.verify(proofAlice, allocationRoot, tamperedLeaf);
        bool stylusValid = stylusVerifier.verify(proofAlice, allocationRoot, tamperedLeaf);

        assertFalse(solValid);
        assertFalse(stylusValid);
        assertEq(stylusValid, solValid);
    }

    function test_parity_multiLevelTree_exactParity() public view {
        // Build 4-leaf balanced tree
        bytes32 leaf1 = keccak256("LEAF_1");
        bytes32 leaf2 = keccak256("LEAF_2");
        bytes32 leaf3 = keccak256("LEAF_3");
        bytes32 leaf4 = keccak256("LEAF_4");

        bytes32 node12 = leaf1 <= leaf2
            ? keccak256(abi.encodePacked(leaf1, leaf2))
            : keccak256(abi.encodePacked(leaf2, leaf1));

        bytes32 node34 = leaf3 <= leaf4
            ? keccak256(abi.encodePacked(leaf3, leaf4))
            : keccak256(abi.encodePacked(leaf4, leaf3));

        bytes32 treeRoot = node12 <= node34
            ? keccak256(abi.encodePacked(node12, node34))
            : keccak256(abi.encodePacked(node34, node12));

        // Proof for leaf1: [leaf2, node34]
        bytes32[] memory proofLeaf1 = new bytes32[](2);
        proofLeaf1[0] = leaf2;
        proofLeaf1[1] = node34;

        bool solValid = MerkleProofLib.verify(proofLeaf1, treeRoot, leaf1);
        bool stylusValid = stylusVerifier.verify(proofLeaf1, treeRoot, leaf1);

        assertTrue(solValid);
        assertTrue(stylusValid);
        assertEq(stylusValid, solValid);

        // Corrupted sibling at depth 2
        proofLeaf1[1] = keccak256("CORRUPT_DEPTH_2");
        solValid = MerkleProofLib.verify(proofLeaf1, treeRoot, leaf1);
        stylusValid = stylusVerifier.verify(proofLeaf1, treeRoot, leaf1);

        assertFalse(solValid);
        assertFalse(stylusValid);
        assertEq(stylusValid, solValid);
    }

    // =========================================================================
    // 3. INHERITANCE VAULT INTEGRATION VIA STANDARD ABI CALLS
    // =========================================================================

    function test_vault_setMerkleVerifier_accessControl() public {
        assertEq(address(vault.merkleVerifier()), address(0));

        // Stranger cannot update
        vm.prank(stranger);
        vm.expectRevert();
        vault.setMerkleVerifier(address(stylusVerifier));

        // Owner can update
        vm.prank(owner);
        vault.setMerkleVerifier(address(stylusVerifier));
        assertEq(address(vault.merkleVerifier()), address(stylusVerifier));
    }

    function test_vault_claimWithStylusVerifier_success() public {
        // Plug in Stylus verifier
        vm.prank(owner);
        vault.setMerkleVerifier(address(stylusVerifier));

        // Finalize consensus
        _finalizeVault();

        // Alice claims her 40%
        uint256 aliceEthBefore = alice.balance;
        uint256 aliceUsdcBefore = usdc.balanceOf(alice);

        vm.prank(alice);
        vault.claim(SHARE_ALICE, SALT_ALICE, proofAlice);

        assertEq(alice.balance - aliceEthBefore, 4 ether, "Alice should receive 40% ETH");
        assertEq(usdc.balanceOf(alice) - aliceUsdcBefore, 4_000 * 1e6, "Alice should receive 40% USDC");
        assertTrue(vault.hasClaimed(alice));
    }

    function test_vault_claimWithStylusVerifier_invalidProofReverts() public {
        vm.prank(owner);
        vault.setMerkleVerifier(address(stylusVerifier));

        _finalizeVault();

        // Alice attempts claim with wrong share
        bytes32[] memory fakeProof = new bytes32[](1);
        fakeProof[0] = bytes32(uint256(0x9999));

        vm.prank(alice);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claim(SHARE_ALICE, SALT_ALICE, fakeProof);

        // Stranger attempts claim with Alice's proof
        vm.prank(stranger);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claim(SHARE_ALICE, SALT_ALICE, proofAlice);
    }

    function test_vault_claimAsBackup_withStylusVerifier_success() public {
        vm.prank(owner);
        vault.setMerkleVerifier(address(stylusVerifier));

        // Register backup for Alice
        vm.prank(alice);
        vault.registerBackupClaimAddress(aliceBackup, 3 days);

        _finalizeVault();

        // Alice backup initiates claim
        vm.prank(aliceBackup);
        vault.initiateBackupClaim(alice);

        // Warp past veto window
        vm.warp(block.timestamp + 3 days + 1);

        // Backup executes claim using Alice's share and proof
        uint256 backupEthBefore = aliceBackup.balance;
        uint256 backupUsdcBefore = usdc.balanceOf(aliceBackup);

        vm.prank(aliceBackup);
        vault.claimAsBackup(alice, SHARE_ALICE, SALT_ALICE, proofAlice);

        assertEq(aliceBackup.balance - backupEthBefore, 4 ether, "Backup should receive Alice's 40% ETH");
        assertEq(usdc.balanceOf(aliceBackup) - backupUsdcBefore, 4_000 * 1e6, "Backup should receive Alice's 40% USDC");
        assertTrue(vault.hasClaimed(alice));
    }

    function test_vault_claimAsBackup_withStylusVerifier_invalidProofReverts() public {
        vm.prank(owner);
        vault.setMerkleVerifier(address(stylusVerifier));

        vm.prank(alice);
        vault.registerBackupClaimAddress(aliceBackup, 3 days);

        _finalizeVault();

        vm.prank(aliceBackup);
        vault.initiateBackupClaim(alice);
        vm.warp(block.timestamp + 3 days + 1);

        // Tampered proof
        bytes32[] memory tamperedProof = new bytes32[](1);
        tamperedProof[0] = keccak256("TAMPERED");

        vm.prank(aliceBackup);
        vm.expectRevert(InheritanceVault.InvalidProof.selector);
        vault.claimAsBackup(alice, SHARE_ALICE, SALT_ALICE, tamperedProof);
    }

    // =========================================================================
    // INTERNAL HELPER
    // =========================================================================

    function _finalizeVault() internal {
        // Warp past check-in interval to trigger inactivity
        vm.warp(block.timestamp + 30 days + 1);

        // Guardian 1 attests
        vm.prank(guardian1);
        guardianRegistry.attest(address(vault), guardianProof1);

        // Guardian 2 attests (2-of-2 threshold met)
        vm.prank(guardian2);
        guardianRegistry.attest(address(vault), guardianProof2);

        // Trigger ClaimPending
        consensus.triggerClaimPending(address(vault));
        assertEq(
            uint8(consensus.getState(address(vault))),
            uint8(IProofOfLifeConsensus.ConsensusState.ClaimPending),
            "Vault must be ClaimPending"
        );

        // Warp past 72h contest window
        vm.warp(block.timestamp + 72 hours + 1);

        // Finalize contest
        consensus.finalizeContest(address(vault));

        assertEq(
            uint8(consensus.getState(address(vault))),
            uint8(IProofOfLifeConsensus.ConsensusState.Finalized),
            "Vault must be finalized"
        );
    }
}
