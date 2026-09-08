// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title EIP712Lib
/// @notice EIP-712 typed-data hash helper for the cancelClaimWithSig path.
/// @dev Implements CANCEL_CLAIM_TYPEHASH exactly per docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md Feature Spotlight A.
///      Used by ProofOfLifeConsensus to verify stealth-key signatures without exposing
///      the owner's funding trail (avoiding the "Gas Linkage" trap).
library EIP712Lib {
    /// @notice Typehash for the CancelClaim EIP-712 struct.
    bytes32 public constant CANCEL_CLAIM_TYPEHASH =
        keccak256("CancelClaim(uint256 vaultId,uint256 nonce,uint256 deadline)");

    /// @notice Hashes the CancelClaim struct according to EIP-712 encoding rules.
    /// @param vaultId The integer identifier of the vault (uint256(uint160(vault))).
    /// @param nonce The user's cancellation nonce to prevent replay attacks.
    /// @param deadline Timestamp after which the signature expires.
    /// @return The 32-byte struct hash.
    function hashCancelClaim(
        uint256 vaultId,
        uint256 nonce,
        uint256 deadline
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(CANCEL_CLAIM_TYPEHASH, vaultId, nonce, deadline));
    }
}
