// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title MerkleProofLib
/// @notice Helpers for building and verifying Merkle proofs for guardian commitments
///         and allocationRoot. Wraps OpenZeppelin's MerkleProof with project-specific
///         leaf encoding conventions.
library MerkleProofLib {
    /// @notice Computes a double-hashed Merkle leaf for a guardian address.
    /// @dev Double-hashing keccak256(bytes.concat(keccak256(abi.encode(guardian))))
    ///      prevents second pre-image attacks on 64-byte leaf preimages.
    /// @param guardian Address of the guardian.
    /// @return leaf The 32-byte leaf hash.
    function computeGuardianLeaf(address guardian) internal pure returns (bytes32 leaf) {
        return keccak256(bytes.concat(keccak256(abi.encode(guardian))));
    }

    /// @notice Computes a double-hashed Merkle leaf for a beneficiary allocation.
    /// @param beneficiary Address of the beneficiary.
    /// @param shareBps Basis points share (10,000 = 100%).
    /// @param salt Secret blinding salt known only to owner and beneficiary.
    /// @return leaf The 32-byte leaf hash.
    function computeAllocationLeaf(
        address beneficiary,
        uint256 shareBps,
        bytes32 salt
    ) internal pure returns (bytes32 leaf) {
        return keccak256(bytes.concat(keccak256(abi.encode(beneficiary, shareBps, salt))));
    }

    /// @notice Verifies a cryptographic Merkle proof against a committed root.
    /// @param proof Array of sibling hashes on the branch.
    /// @param root The root hash of the Merkle tree.
    /// @param leaf The leaf hash to verify.
    /// @return valid True if leaf is part of the Merkle tree.
    function verify(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool valid) {
        return MerkleProof.verify(proof, root, leaf);
    }
}
