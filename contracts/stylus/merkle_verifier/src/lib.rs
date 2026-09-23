//! Arbitrum Stylus Merkle Proof Verifier Contract
//!
//! Re-implements Merkle proof verification and leaf hashing in Rust for compilation to WASM.
//! Deployed on Arbitrum Sepolia and Robinhood Chain Testnet to provide high-throughput,
//! gas-efficient cryptographic verification alongside EVM Solidity contracts.
//!
//! Exposes standard ABI matching `IMerkleVerifier.sol`.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{Address, B256, U256, keccak256},
    prelude::*,
};

sol_storage! {
    #[entrypoint]
    pub struct StylusMerkleVerifier {
        // Stateless verifier contract; zero persistent storage slots required.
    }
}

#[public]
impl StylusMerkleVerifier {
    /// Verifies whether a leaf is part of a Merkle tree given a root and proof.
    ///
    /// Implements commutative sorting matching OpenZeppelin / MerkleProofLib:
    /// for each sibling, if current <= sibling then hash(current, sibling),
    /// else hash(sibling, current).
    pub fn verify(&self, proof: Vec<B256>, root: B256, leaf: B256) -> bool {
        let mut computed_hash = leaf;
        for proof_element in proof {
            if computed_hash <= proof_element {
                let mut buf = [0u8; 64];
                buf[..32].copy_from_slice(computed_hash.as_slice());
                buf[32..].copy_from_slice(proof_element.as_slice());
                computed_hash = keccak256(&buf);
            } else {
                let mut buf = [0u8; 64];
                buf[..32].copy_from_slice(proof_element.as_slice());
                buf[32..].copy_from_slice(computed_hash.as_slice());
                computed_hash = keccak256(&buf);
            }
        }
        computed_hash == root
    }

    /// Computes a double-hashed allocation leaf for a beneficiary.
    /// Matches Solidity: keccak256(bytes.concat(keccak256(abi.encode(beneficiary, shareBps, salt))))
    pub fn compute_allocation_leaf(
        &self,
        beneficiary: Address,
        share_bps: U256,
        salt: B256,
    ) -> B256 {
        // abi.encode(address, uint256, bytes32): 96 bytes total
        let mut encoded = [0u8; 96];
        // Address padded to 32 bytes (12 zero bytes followed by 20 bytes)
        encoded[12..32].copy_from_slice(beneficiary.as_slice());
        // uint256 is 32-byte big-endian
        encoded[32..64].copy_from_slice(&share_bps.to_be_bytes::<32>());
        // bytes32 salt
        encoded[64..96].copy_from_slice(salt.as_slice());

        let inner_hash = keccak256(&encoded);
        // Double hash against second preimage attack
        keccak256(inner_hash.as_slice())
    }

    /// Computes a double-hashed Merkle leaf for a guardian address.
    /// Matches Solidity: keccak256(bytes.concat(keccak256(abi.encode(guardian))))
    pub fn compute_guardian_leaf(&self, guardian: Address) -> B256 {
        let mut encoded = [0u8; 32];
        encoded[12..32].copy_from_slice(guardian.as_slice());

        let inner_hash = keccak256(&encoded);
        keccak256(inner_hash.as_slice())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leaf_and_proof_verification() {
        let verifier = StylusMerkleVerifier {};
        let beneficiary = Address::repeat_byte(0x11);
        let share_bps = U256::from(5000);
        let salt = B256::repeat_byte(0xaa);

        let leaf1 = verifier.compute_allocation_leaf(beneficiary, share_bps, salt);
        assert_ne!(leaf1, B256::ZERO);

        let beneficiary2 = Address::repeat_byte(0x22);
        let share_bps2 = U256::from(5000);
        let salt2 = B256::repeat_byte(0xbb);
        let leaf2 = verifier.compute_allocation_leaf(beneficiary2, share_bps2, salt2);

        // Compute parent / root
        let root = if leaf1 <= leaf2 {
            let mut buf = [0u8; 64];
            buf[..32].copy_from_slice(leaf1.as_slice());
            buf[32..].copy_from_slice(leaf2.as_slice());
            keccak256(&buf)
        } else {
            let mut buf = [0u8; 64];
            buf[..32].copy_from_slice(leaf2.as_slice());
            buf[32..].copy_from_slice(leaf1.as_slice());
            keccak256(&buf)
        };

        // Valid proof for leaf1
        assert!(verifier.verify(vec![leaf2], root, leaf1));
        // Valid proof for leaf2
        assert!(verifier.verify(vec![leaf1], root, leaf2));

        // Invalid proof with corrupted root
        assert!(!verifier.verify(vec![leaf2], B256::repeat_byte(0xff), leaf1));
        // Invalid proof with wrong sibling
        assert!(!verifier.verify(vec![B256::repeat_byte(0x01)], root, leaf1));
    }
}
