// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PackedUserOperation, IAccount} from "@openzeppelin/contracts/interfaces/IERC4337.sol";

/// @title IBeneficiarySmartAccount
/// @notice Interface for a lightweight ERC-4337 beneficiary smart account with social recovery.
interface IBeneficiarySmartAccount is IAccount {
    struct RecoveryProposal {
        address proposedOwner;
        uint256 supportCount;
        bool active;
        uint256 proposalNonce;
    }

    // --- Events ---
    event AccountInitialized(
        address indexed owner,
        address indexed entryPoint,
        address[] guardians,
        uint256 recoveryThreshold
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RecoveryInitiated(address indexed guardian, address indexed proposedOwner, uint256 proposalNonce);
    event RecoverySupported(
        address indexed guardian,
        address indexed proposedOwner,
        uint256 currentSupport,
        uint256 threshold
    );
    event RecoveryExecuted(address indexed previousOwner, address indexed newOwner, uint256 proposalNonce);
    event RecoveryCancelled(address indexed cancelledBy, address indexed proposedOwner, uint256 proposalNonce);
    event TransactionExecuted(address indexed dest, uint256 value, bytes data);
    event BackupAddressSet(address indexed backupAddress, uint256 vetoWindow);
    event BackupAddressRevoked(address indexed previousBackup);
    event BackupActivationInitiated(address indexed backupAddress, uint256 vetoDeadline);
    event BackupActivationVetoed(address indexed owner);
    event BackupActivationFinalized(address indexed previousOwner, address indexed newOwner);

    // --- Custom Errors ---
    error Unauthorized();
    error OnlyEntryPoint();
    error OnlyOwner();
    error OnlyGuardian();
    error AlreadyInitialized();
    error InvalidGuardians();
    error InvalidThreshold();
    error ZeroAddress();
    error DuplicateGuardian(address guardian);
    error RecoveryNotActive();
    error RecoveryAlreadyActive();
    error ProposalMismatch();
    error AlreadySupported(address guardian);
    error ThresholdNotMet(uint256 current, uint256 required);
    error InvalidSignature();
    error CallFailed(bytes returnData);
    error NotBackupAddress();
    error VetoWindowNotElapsed(uint256 currentTimestamp, uint256 vetoDeadline);
    error VetoWindowZero();
    error BackupActivationAlreadyActive();
    error NoActiveBackupActivation();
    error SelfBackupNotAllowed();

    // --- View Methods ---
    function owner() external view returns (address);
    function entryPoint() external view returns (address);
    function recoveryThreshold() external view returns (uint256);
    function getGuardians() external view returns (address[] memory);
    function isGuardian(address account) external view returns (bool);
    function hasSupportedRecovery(uint256 nonce, address guardian) external view returns (bool);
    function currentRecovery()
        external
        view
        returns (address proposedOwner, uint256 supportCount, bool active, uint256 proposalNonce);
    function backupAddress() external view returns (address);
    function backupVetoWindow() external view returns (uint256);
    function getBackupActivation() external view returns (uint256 vetoDeadline, bool active);

    // --- Execution ---
    function execute(address dest, uint256 value, bytes calldata data) external returns (bytes memory);

    // --- Social Recovery ---
    function initiateRecovery(address newOwner) external;
    function supportRecovery(address newOwner) external;
    function executeRecovery(address newOwner) external;
    function recoverWithSignatures(address newOwner, bytes[] calldata signatures) external;
    function cancelRecovery() external;

    // --- Backup Address Feature ---
    function setBackupAddress(address _backupAddress, uint256 _vetoWindow) external;
    function revokeBackupAddress() external;
    function initiateBackupActivation() external;
    function vetoBackupActivation() external;
    function finalizeBackupActivation() external;
}


/// @title IBeneficiaryAccountFactory
/// @notice Interface for provisioning BeneficiarySmartAccount instances via CREATE2.
interface IBeneficiaryAccountFactory {
    event BeneficiaryAccountCreated(
        address indexed beneficiary,
        address indexed smartAccount,
        uint256 recoveryThreshold,
        uint256 salt
    );

    function createAccount(
        address beneficiary,
        address[] calldata nominatedGuardians,
        uint256 recoveryThreshold,
        uint256 salt
    ) external returns (address);

    function getAddress(
        address beneficiary,
        address[] calldata nominatedGuardians,
        uint256 recoveryThreshold,
        uint256 salt
    ) external view returns (address);

    function getAccountsForBeneficiary(address beneficiary) external view returns (address[] memory);
    function isDeployedAccount(address account) external view returns (bool);
    function entryPoint() external view returns (address);
}
