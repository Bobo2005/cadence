// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStealthAddressRegistry
/// @notice Interface for the EIP-5564 Stealth Address Registry.
/// @dev Enables vault owners to register their stealth meta-addresses on-chain,
///      enabling unlinkable one-time stealth deposits and signature-based cancellations.
///      See docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md Days 8–9.
interface IStealthAddressRegistry {
    /// @notice Storage struct for a registered stealth meta-address.
    struct StealthMetaAddress {
        bytes spendingPubKey;
        bytes viewingPubKey;
    }

    // --- Events ---

    /// @notice Emitted when a user registers or updates their stealth meta-address.
    event StealthMetaAddressRegistered(
        address indexed registrant,
        uint256 indexed schemeId,
        bytes spendingPubKey,
        bytes viewingPubKey
    );

    /// @notice Emitted when a stealth transaction or vault association is announced.
    /// @param schemeId Identifier for the elliptic curve cryptographic scheme (1 = secp256k1).
    /// @param stealthAddress The one-time stealth address generated for the interaction.
    /// @param caller The address initiating the announcement.
    /// @param ephemeralPubKey Ephemeral public key (R = r*G) used to compute the shared secret.
    /// @param metadata View tag (1 byte) and optional contextual data.
    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    // --- Core Functions ---

    /// @notice Registers stealth meta-address public keys for the caller.
    /// @param schemeId The scheme ID (1 for secp256k1).
    /// @param spendingPubKey The spending public key bytes.
    /// @param viewingPubKey The viewing public key bytes.
    function registerKeys(
        uint256 schemeId,
        bytes calldata spendingPubKey,
        bytes calldata viewingPubKey
    ) external;

    /// @notice Registers stealth meta-address public keys on behalf of a registrant via signature.
    /// @param registrant The address for which keys are being registered.
    /// @param schemeId The scheme ID (1 for secp256k1).
    /// @param signature ECDSA signature of registrant authorizing registration.
    /// @param spendingPubKey The spending public key bytes.
    /// @param viewingPubKey The viewing public key bytes.
    function registerKeysOnBehalf(
        address registrant,
        uint256 schemeId,
        bytes calldata signature,
        bytes calldata spendingPubKey,
        bytes calldata viewingPubKey
    ) external;

    /// @notice Retrieves the registered stealth meta-address for an account and scheme.
    /// @param registrant The account address.
    /// @param schemeId The scheme ID.
    /// @return spendingPubKey The registered spending public key.
    /// @return viewingPubKey The registered viewing public key.
    function getStealthMetaAddress(address registrant, uint256 schemeId)
        external
        view
        returns (bytes memory spendingPubKey, bytes memory viewingPubKey);

    /// @notice Emits an Announcement event to alert stealth address owners of incoming transactions or vaults.
    /// @param schemeId The scheme ID.
    /// @param stealthAddress The derived one-time stealth address.
    /// @param ephemeralPubKey The ephemeral public key (R).
    /// @param metadata View tag and optional ciphertext or identifier.
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external;
}
