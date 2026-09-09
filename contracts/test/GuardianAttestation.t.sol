// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {Hashes} from "@openzeppelin/contracts/utils/cryptography/Hashes.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title GuardianAttestationTest
/// @notice Comprehensive unit tests for GuardianRegistry: Merkle commitments,
///         M-of-N threshold verification, non-guardian rejection, duplicate prevention,
///         and relayed signatures.
contract GuardianAttestationTest is Test {
    GuardianRegistry internal registry;

    address internal vaultOwner = address(0x1111);
    address internal vault = address(0x9999);
    address internal nonGuardian = address(0xDEAD);

    // Guardian private keys and addresses for signatures
    uint256 internal guardianAPKey = 0xA111;
    uint256 internal guardianBPKey = 0xB222;
    uint256 internal guardianCPKey = 0xC333;
    uint256 internal guardianDPKey = 0xD444;

    address internal guardianA;
    address internal guardianB;
    address internal guardianC;
    address internal guardianD;

    bytes32 internal root;
    bytes32[] internal proofA;
    bytes32[] internal proofB;
    bytes32[] internal proofC;
    bytes32[] internal proofD;

    uint256 internal constant THRESHOLD = 2; // 2-of-4
    uint256 internal constant TOTAL_GUARDIANS = 4;

    event GuardianRootCommitted(
        address indexed vault,
        bytes32 indexed guardianRoot,
        uint256 threshold,
        uint256 totalGuardians
    );
    event GuardianAttested(
        address indexed vault,
        address indexed guardian,
        uint256 attestationCount
    );
    event GuardianThresholdMet(
        address indexed vault,
        uint256 attestationCount,
        uint256 threshold
    );
    event AttestationsReset(address indexed vault, uint256 newCycle);

    function setUp() public {
        registry = new GuardianRegistry();

        guardianA = vm.addr(guardianAPKey);
        guardianB = vm.addr(guardianBPKey);
        guardianC = vm.addr(guardianCPKey);
        guardianD = vm.addr(guardianDPKey);

        // Compute 4 double-hashed leaves
        bytes32 leafA = MerkleProofLib.computeGuardianLeaf(guardianA);
        bytes32 leafB = MerkleProofLib.computeGuardianLeaf(guardianB);
        bytes32 leafC = MerkleProofLib.computeGuardianLeaf(guardianC);
        bytes32 leafD = MerkleProofLib.computeGuardianLeaf(guardianD);

        // Build 2-level balanced Merkle tree with commutative hashing
        bytes32 nodeAB = Hashes.commutativeKeccak256(leafA, leafB);
        bytes32 nodeCD = Hashes.commutativeKeccak256(leafC, leafD);
        root = Hashes.commutativeKeccak256(nodeAB, nodeCD);

        // Proof for A: [sibling leafB, sibling nodeCD]
        proofA = new bytes32[](2);
        proofA[0] = leafB;
        proofA[1] = nodeCD;

        // Proof for B: [sibling leafA, sibling nodeCD]
        proofB = new bytes32[](2);
        proofB[0] = leafA;
        proofB[1] = nodeCD;

        // Proof for C: [sibling leafD, sibling nodeAB]
        proofC = new bytes32[](2);
        proofC[0] = leafD;
        proofC[1] = nodeAB;

        // Proof for D: [sibling leafC, sibling nodeAB]
        proofD = new bytes32[](2);
        proofD[0] = leafC;
        proofD[1] = nodeAB;

        // Commit root for test vault
        vm.prank(vaultOwner);
        registry.commitGuardianRoot(vault, root, THRESHOLD, TOTAL_GUARDIANS);
    }

    // =========================================================================
    // Merkle Root Commitment
    // =========================================================================

    function test_commitGuardianRoot() public {
        address newVault = address(0x8888);
        address owner = address(0x2222);

        vm.startPrank(owner);
        vm.expectEmit(true, true, false, true);
        emit GuardianRootCommitted(newVault, root, THRESHOLD, TOTAL_GUARDIANS);

        registry.commitGuardianRoot(newVault, root, THRESHOLD, TOTAL_GUARDIANS);
        vm.stopPrank();

        GuardianRegistry.GuardianConfig memory config = registry.getGuardianConfig(newVault);
        assertEq(config.guardianRoot, root, "Root mismatch");
        assertEq(config.threshold, THRESHOLD, "Threshold mismatch");
        assertEq(config.totalGuardians, TOTAL_GUARDIANS, "Total guardians mismatch");
        assertEq(config.attestationCount, 0, "Initial attestation count must be 0");
        assertFalse(config.thresholdReached, "Threshold must not be reached initially");
        assertEq(registry.vaultOwners(newVault), owner, "Vault owner mismatch");
    }

    function test_commitGuardianRoot_zeroVault_reverts() public {
        vm.prank(vaultOwner);
        vm.expectRevert(GuardianRegistry.ZeroAddress.selector);
        registry.commitGuardianRoot(address(0), root, THRESHOLD, TOTAL_GUARDIANS);
    }

    function test_commitGuardianRoot_zeroRoot_reverts() public {
        vm.prank(vaultOwner);
        vm.expectRevert(GuardianRegistry.InvalidRoot.selector);
        registry.commitGuardianRoot(vault, bytes32(0), THRESHOLD, TOTAL_GUARDIANS);
    }

    function test_commitGuardianRoot_invalidThreshold_reverts() public {
        vm.startPrank(vaultOwner);

        // Threshold = 0
        vm.expectRevert(GuardianRegistry.InvalidThreshold.selector);
        registry.commitGuardianRoot(vault, root, 0, TOTAL_GUARDIANS);

        // Threshold > Total guardians
        vm.expectRevert(GuardianRegistry.InvalidThreshold.selector);
        registry.commitGuardianRoot(vault, root, 5, 4);

        vm.stopPrank();
    }

    function test_unauthorizedRootUpdate_reverts() public {
        address imposter = address(0xDEADBEEF);
        vm.prank(imposter);
        vm.expectRevert(GuardianRegistry.Unauthorized.selector);
        registry.commitGuardianRoot(vault, root, 3, TOTAL_GUARDIANS);
    }

    // =========================================================================
    // Attestation: Valid Guardian
    // =========================================================================

    function test_attestation_validGuardian_accepted() public {
        assertFalse(registry.hasGuardianAttested(vault, guardianA));
        assertEq(registry.getAttestationCount(vault), 0);

        vm.startPrank(guardianA);
        vm.expectEmit(true, true, false, true);
        emit GuardianAttested(vault, guardianA, 1);

        registry.attest(vault, proofA);
        vm.stopPrank();

        assertTrue(registry.hasGuardianAttested(vault, guardianA), "Guardian A should be recorded as attested");
        assertEq(registry.getAttestationCount(vault), 1, "Attestation count should be 1");
        assertFalse(registry.isThresholdMet(vault), "Threshold 2 should not be met with 1 attestation");
    }

    // =========================================================================
    // Attestation: Non-Guardian Rejected
    // =========================================================================

    function test_attestation_nonGuardian_rejected() public {
        vm.startPrank(nonGuardian);

        // Attempt attestation using Guardian A's proof
        vm.expectRevert(GuardianRegistry.InvalidGuardianProof.selector);
        registry.attest(vault, proofA);

        // Attempt attestation using empty proof
        bytes32[] memory emptyProof = new bytes32[](0);
        vm.expectRevert(GuardianRegistry.InvalidGuardianProof.selector);
        registry.attest(vault, emptyProof);

        vm.stopPrank();

        assertEq(registry.getAttestationCount(vault), 0, "No attestations should be recorded");
    }

    // =========================================================================
    // M-of-N Threshold Verification
    // =========================================================================

    function test_mofN_thresholdMet() public {
        // Guardian A attests (1-of-4)
        vm.prank(guardianA);
        registry.attest(vault, proofA);
        assertFalse(registry.isThresholdMet(vault), "Threshold should not be met after 1 attestation");

        // Guardian B attests (2-of-4 -> meets THRESHOLD of 2)
        vm.startPrank(guardianB);
        vm.expectEmit(true, false, false, true);
        emit GuardianThresholdMet(vault, 2, THRESHOLD);

        registry.attest(vault, proofB);
        vm.stopPrank();

        assertTrue(registry.isThresholdMet(vault), "Threshold should be met after 2 attestations");
        assertEq(registry.getAttestationCount(vault), 2);
    }

    function test_mofN_thresholdNotMet() public {
        // Only 1 guardian attests when threshold is 2
        vm.prank(guardianC);
        registry.attest(vault, proofC);

        assertEq(registry.getAttestationCount(vault), 1);
        assertFalse(registry.isThresholdMet(vault), "Threshold must not be met below required count");
    }

    // =========================================================================
    // Duplicate Attestation Rejected
    // =========================================================================

    function test_duplicateAttestation_rejected() public {
        vm.startPrank(guardianA);
        registry.attest(vault, proofA);

        // Second attestation from guardianA must revert
        vm.expectRevert(abi.encodeWithSelector(GuardianRegistry.DuplicateAttestation.selector, guardianA));
        registry.attest(vault, proofA);
        vm.stopPrank();

        assertEq(registry.getAttestationCount(vault), 1);
    }

    // =========================================================================
    // Edge Cases & Resets
    // =========================================================================

    function test_attest_unconfiguredVault_reverts() public {
        address unconfiguredVault = address(0x5555);
        vm.prank(guardianA);
        vm.expectRevert(abi.encodeWithSelector(GuardianRegistry.RootNotCommitted.selector, unconfiguredVault));
        registry.attest(unconfiguredVault, proofA);
    }

    function test_verifyGuardian_viewHelper() public view {
        assertTrue(registry.verifyGuardian(vault, guardianA, proofA), "Guardian A should verify");
        assertTrue(registry.verifyGuardian(vault, guardianB, proofB), "Guardian B should verify");
        assertTrue(registry.verifyGuardian(vault, guardianC, proofC), "Guardian C should verify");
        assertTrue(registry.verifyGuardian(vault, guardianD, proofD), "Guardian D should verify");

        assertFalse(registry.verifyGuardian(vault, nonGuardian, proofA), "Non-guardian should not verify");
        assertFalse(registry.verifyGuardian(vault, guardianA, proofB), "Wrong proof should not verify");
        assertFalse(registry.verifyGuardian(address(0x123), guardianA, proofA), "Unconfigured vault should not verify");
    }

    function test_resetAttestations() public {
        // Guardians A and B attest -> threshold met
        vm.prank(guardianA);
        registry.attest(vault, proofA);
        vm.prank(guardianB);
        registry.attest(vault, proofB);
        assertTrue(registry.isThresholdMet(vault));

        // Vault owner resets attestations
        vm.startPrank(vaultOwner);
        vm.expectEmit(true, false, false, true);
        emit AttestationsReset(vault, 2);

        registry.resetAttestations(vault);
        vm.stopPrank();

        // State is cleanly reset
        assertFalse(registry.isThresholdMet(vault), "Threshold should be cleared after reset");
        assertEq(registry.getAttestationCount(vault), 0, "Attestation count should be 0");
        assertFalse(registry.hasGuardianAttested(vault, guardianA), "Guardian A should be cleared");
        assertFalse(registry.hasGuardianAttested(vault, guardianB), "Guardian B should be cleared");

        // Guardians can attest again in new cycle
        vm.prank(guardianA);
        registry.attest(vault, proofA);
        assertEq(registry.getAttestationCount(vault), 1);
    }

    function test_resetAttestations_unauthorized_reverts() public {
        vm.prank(nonGuardian);
        vm.expectRevert(GuardianRegistry.Unauthorized.selector);
        registry.resetAttestations(vault);
    }

    // =========================================================================
    // Relayed Attestations (attestWithSig)
    // =========================================================================

    function _getGuardianAttestationDigest(
        address _vault,
        address _guardian,
        uint256 _cycle,
        uint256 _deadline
    ) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("GuardianRegistry")),
                keccak256(bytes("1")),
                block.chainid,
                address(registry)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(
                registry.GUARDIAN_ATTESTATION_TYPEHASH(),
                _vault,
                _guardian,
                _cycle,
                _deadline
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function test_attestWithSig_success() public {
        uint256 cycle = registry.attestationCycle(vault);
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = _getGuardianAttestationDigest(vault, guardianA, cycle, deadline);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(guardianAPKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Relayer submits signature
        address relayer = address(0x999);
        vm.prank(relayer);
        registry.attestWithSig(vault, guardianA, proofA, deadline, sig);

        assertTrue(registry.hasGuardianAttested(vault, guardianA));
        assertEq(registry.getAttestationCount(vault), 1);
    }

    function test_attestWithSig_invalidSignature_reverts() public {
        uint256 cycle = registry.attestationCycle(vault);
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = _getGuardianAttestationDigest(vault, guardianA, cycle, deadline);

        // Signed by wrong private key (guardianB instead of guardianA)
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(guardianBPKey, digest);
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.expectRevert(GuardianRegistry.InvalidSignature.selector);
        registry.attestWithSig(vault, guardianA, proofA, deadline, badSig);
    }

    function test_attestWithSig_deadlineExpired_reverts() public {
        uint256 cycle = registry.attestationCycle(vault);
        uint256 deadline = block.timestamp + 100;
        bytes32 digest = _getGuardianAttestationDigest(vault, guardianA, cycle, deadline);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(guardianAPKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.warp(deadline + 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                GuardianRegistry.DeadlineExpired.selector,
                deadline,
                deadline + 1
            )
        );
        registry.attestWithSig(vault, guardianA, proofA, deadline, sig);
    }
}
