// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IGuardianRegistry
/// @notice Interface for guardian commitment and M-of-N attestation verification.
interface IGuardianRegistry {
    struct GuardianConfig {
        bytes32 guardianRoot;
        uint256 threshold;
        uint256 totalGuardians;
        uint256 attestationCount;
        bool thresholdReached;
    }

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

    function commitGuardianRoot(
        address vault,
        bytes32 guardianRoot,
        uint256 threshold,
        uint256 totalGuardians
    ) external;

    function attest(address vault, bytes32[] calldata proof) external;

    function attestWithSig(
        address vault,
        address guardian,
        bytes32[] calldata proof,
        uint256 deadline,
        bytes calldata signature
    ) external;

    function resetAttestations(address vault) external;

    function setConsensusForVault(address vault, address _consensus) external;

    function isThresholdMet(address vault) external view returns (bool);

    function getAttestationCount(address vault) external view returns (uint256);

    function hasGuardianAttested(address vault, address guardian) external view returns (bool);

    function verifyGuardian(
        address vault,
        address guardian,
        bytes32[] calldata proof
    ) external view returns (bool);

    event GuardianBackupRegistered(
        address indexed guardian,
        address indexed backup
    );
    event BackupGuardianAttested(
        address indexed vault,
        address indexed originalGuardian,
        address indexed backupGuardian,
        uint256 attestationCount
    );
    event AttestationPeriodOpened(
        address indexed vault,
        uint256 indexed cycle,
        uint256 openedAt
    );

    function registerGuardianBackup(address backup) external;

    function guardianBackupOf(address guardian) external view returns (address);

    function attestAsBackup(
        address vault,
        address originalGuardian,
        bytes32[] calldata proof
    ) external;

    function verifyGuardianOrBackup(
        address vault,
        address caller,
        address originalGuardian,
        bytes32[] calldata proof
    ) external view returns (bool);

    function openAttestationPeriod(address vault) external;

    function BACKUP_WAITING_PERIOD() external view returns (uint256);
    function setBackupWaitingPeriod(address vault, uint256 period) external;
    function getBackupWaitingPeriod(address vault) external view returns (uint256);

    function cycleFirstAttestationTime(address vault, uint256 cycle) external view returns (uint256);

    function getGuardianConfig(address vault) external view returns (GuardianConfig memory);
    function DEFAULT_THRESHOLD() external view returns (uint256);
    function DEFAULT_TOTAL_GUARDIANS() external view returns (uint256);
}
