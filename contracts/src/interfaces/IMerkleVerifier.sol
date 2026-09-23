// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IMerkleVerifier
/// @notice Interface for the Arbitrum Stylus (Rust/WASM) Merkle Proof Verifier.
/// @dev Implements standard Solidity ABI matching the Stylus WASM contract export.
///      Called by InheritanceVault.sol as an external composable primitive,
///      identical to how ProofOfLifeConsensus.sol is integrated.
interface IMerkleVerifier {
    /// @notice Verifies whether a leaf is part of a Merkle tree given a root and proof.
    /// @param proof Array of sibling hashes on the branch.
    /// @param root The root hash of the Merkle tree.
    /// @param leaf The leaf hash to verify.
    /// @return valid True if leaf is part of the Merkle tree, false otherwise.
    function verify(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) external view returns (bool valid);

    /// @notice Computes a double-hashed allocation leaf for a beneficiary.
    /// @param beneficiary Address of the beneficiary.
    /// @param shareBps Basis points share (10,000 = 100%).
    /// @param salt Secret blinding salt known only to owner and beneficiary.
    /// @return leaf The 32-byte leaf hash.
    function computeAllocationLeaf(
        address beneficiary,
        uint256 shareBps,
        bytes32 salt
    ) external pure returns (bytes32 leaf);

    /// @notice Computes a double-hashed Merkle leaf for a guardian address.
    /// @param guardian Address of the guardian.
    /// @return leaf The 32-byte leaf hash.
    function computeGuardianLeaf(address guardian) external pure returns (bytes32 leaf);
}
