// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMerkleVerifier} from "./interfaces/IMerkleVerifier.sol";
import {MerkleProofLib} from "./libraries/MerkleProofLib.sol";

/// @title StylusMerkleVerifier
/// @notice Solidity ABI reference contract for the Arbitrum Stylus (Rust/WASM) Merkle verifier.
/// @dev In production, this address on Arbitrum Sepolia / Robinhood Chain points to the WASM bytecode
///      deployed via `cargo stylus deploy`. In local Foundry and EVM environments, this contract
///      exposes the identical ABI and logic, enabling full test coverage and direct parity verification.
contract StylusMerkleVerifier is IMerkleVerifier {
    /// @inheritdoc IMerkleVerifier
    function verify(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) external pure override returns (bool valid) {
        return MerkleProofLib.verify(proof, root, leaf);
    }

    /// @inheritdoc IMerkleVerifier
    function computeAllocationLeaf(
        address beneficiary,
        uint256 shareBps,
        bytes32 salt
    ) external pure override returns (bytes32 leaf) {
        return MerkleProofLib.computeAllocationLeaf(beneficiary, shareBps, salt);
    }

    /// @inheritdoc IMerkleVerifier
    function computeGuardianLeaf(address guardian) external pure override returns (bytes32 leaf) {
        return MerkleProofLib.computeGuardianLeaf(guardian);
    }
}
