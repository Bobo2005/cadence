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

    function getGuardianConfig(address vault) external view returns (GuardianConfig memory);
}
