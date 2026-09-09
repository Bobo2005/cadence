// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStealthAddressRegistry} from "./interfaces/IStealthAddressRegistry.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title StealthAddressRegistry
/// @notice Standalone EIP-5564 stealth meta-address registry and announcement primitive.
/// @dev Enables vault owners to register their stealth meta-address and callers to announce
///      stealth deposits and vault creations, preventing identity linkage on-chain.
///      See docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md Days 8–9.
contract StealthAddressRegistry is IStealthAddressRegistry {
    // --- Constants ---
    uint256 public constant SECP256K1_SCHEME_ID = 1;

    // --- Custom Errors ---
    error ZeroAddress();
    error InvalidSchemeId();
    error InvalidKeyLength();
    error InvalidSignature();
    error DeadlineExpired(uint256 deadline, uint256 current);

    // --- State Variables ---

    /// @notice Registered stealth meta-addresses: [registrant][schemeId] => StealthMetaAddress.
    mapping(address => mapping(uint256 => StealthMetaAddress)) internal _stealthMetaAddresses;

    /// @notice Nonces for relayed meta-transaction registrations.
    mapping(address => uint256) public nonces;

    // --- Core Functions ---

    /// @inheritdoc IStealthAddressRegistry
    function registerKeys(
        uint256 schemeId,
        bytes calldata spendingPubKey,
        bytes calldata viewingPubKey
    ) external override {
        _registerKeys(msg.sender, schemeId, spendingPubKey, viewingPubKey);
    }

    /// @inheritdoc IStealthAddressRegistry
    function registerKeysOnBehalf(
        address registrant,
        uint256 schemeId,
        bytes calldata signature,
        bytes calldata spendingPubKey,
        bytes calldata viewingPubKey,
        uint256 deadline
    ) external override {
        if (registrant == address(0)) revert ZeroAddress();
        if (block.timestamp > deadline) revert DeadlineExpired(deadline, block.timestamp);

        uint256 currentNonce = nonces[registrant]++;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("RegisterKeysOnBehalf(address registrant,uint256 schemeId,bytes spendingPubKey,bytes viewingPubKey,uint256 nonce,uint256 deadline,uint256 chainId,address verifyingContract)"),
                registrant,
                schemeId,
                keccak256(spendingPubKey),
                keccak256(viewingPubKey),
                currentNonce,
                deadline,
                block.chainid,
                address(this)
            )
        );
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(structHash);
        address signer = ECDSA.recover(ethHash, signature);
        if (signer != registrant) revert InvalidSignature();

        _registerKeys(registrant, schemeId, spendingPubKey, viewingPubKey);
    }

    /// @notice Internal logic for validating and storing stealth meta-address keys.
    function _registerKeys(
        address registrant,
        uint256 schemeId,
        bytes calldata spendingPubKey,
        bytes calldata viewingPubKey
    ) internal {
        if (schemeId != SECP256K1_SCHEME_ID) revert InvalidSchemeId();

        // Valid secp256k1 public keys are either 33 bytes (compressed) or 65 bytes (uncompressed)
        if (
            (spendingPubKey.length != 33 && spendingPubKey.length != 65) ||
            (viewingPubKey.length != 33 && viewingPubKey.length != 65)
        ) {
            revert InvalidKeyLength();
        }

        _stealthMetaAddresses[registrant][schemeId] = StealthMetaAddress({
            spendingPubKey: spendingPubKey,
            viewingPubKey: viewingPubKey
        });

        emit StealthMetaAddressRegistered(registrant, schemeId, spendingPubKey, viewingPubKey);
    }

    /// @inheritdoc IStealthAddressRegistry
    function getStealthMetaAddress(address registrant, uint256 schemeId)
        external
        view
        override
        returns (bytes memory spendingPubKey, bytes memory viewingPubKey)
    {
        StealthMetaAddress storage meta = _stealthMetaAddresses[registrant][schemeId];
        return (meta.spendingPubKey, meta.viewingPubKey);
    }

    /// @inheritdoc IStealthAddressRegistry
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external override {
        if (stealthAddress == address(0)) revert ZeroAddress();
        if (schemeId != SECP256K1_SCHEME_ID) revert InvalidSchemeId();

        if (ephemeralPubKey.length != 33 && ephemeralPubKey.length != 65) {
            revert InvalidKeyLength();
        }

        emit Announcement(schemeId, stealthAddress, msg.sender, ephemeralPubKey, metadata);
    }
}
