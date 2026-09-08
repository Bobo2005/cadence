// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IProofOfLifeConsensus
/// @notice Interface for the standalone Proof-of-Life Consensus primitive.
/// @dev InheritanceVault calls this interface — it does not embed consensus logic directly.
///      This separation allows the primitive to be reused by other protocols (DAO succession,
///      insurance payouts, dead-hand governance). See docs/ARCHITECTURE.md Feature Spotlight C.
interface IProofOfLifeConsensus {
    /// @notice States of the Proof-of-Life consensus lifecycle.
    /// @dev Active: Normal operation, owner checking in.
    ///      ClaimPending: Timeout expired AND guardian M-of-N threshold met; contest window running.
    ///      Contested: Claim challenged by owner (deferred to Prompt 7 with stealth keys).
    ///      Finalized: Contest window elapsed without contestation; vault claimable.
    enum ConsensusState {
        Active,
        ClaimPending,
        Contested,
        Finalized
    }

    /// @notice Vault-specific configuration and consensus tracking.
    struct ConsensusConfig {
        uint256 checkInInterval;
        uint256 lastActiveTimestamp;
        uint256 contestWindowDuration;
        uint256 claimPendingTimestamp;
        uint256 contestDeadline;
        ConsensusState state;
    }

    // --- Events ---
    event ConsensusConfigured(
        address indexed vault,
        address indexed owner,
        uint256 checkInInterval,
        uint256 contestWindowDuration
    );
    event HeartbeatRecorded(address indexed vault, uint256 timestamp);
    event CheckInIntervalUpdated(address indexed vault, uint256 newInterval);
    event ContestWindowUpdated(address indexed vault, uint256 newDuration);
    event StateTransition(
        address indexed vault,
        ConsensusState indexed previousState,
        ConsensusState indexed newState,
        uint256 timestamp
    );
    event ClaimPendingTriggered(
        address indexed vault,
        uint256 contestDeadline,
        uint256 timestamp
    );
    event ContestFinalized(address indexed vault, uint256 timestamp);
    event ClaimCancelled(address indexed vault, address indexed owner, uint256 timestamp);

    // --- Configuration Functions ---

    /// @notice Configures consensus parameters for a vault.
    /// @param vault The vault address.
    /// @param owner The designated owner of the vault.
    /// @param checkInInterval The duration in seconds before heartbeat expires.
    /// @param contestWindowDuration The duration in seconds of the contest window (default: 72 hours).
    function configureVault(
        address vault,
        address owner,
        uint256 checkInInterval,
        uint256 contestWindowDuration
    ) external;

    /// @notice Records a heartbeat for a vault, resetting its inactivity timer.
    /// @param vault The vault address.
    function recordHeartbeat(address vault) external;

    /// @notice Updates the check-in interval for a vault.
    /// @param vault The vault address.
    /// @param newInterval The new interval in seconds.
    function setCheckInInterval(address vault, uint256 newInterval) external;

    /// @notice Updates the contest window duration for a vault.
    /// @param vault The vault address.
    /// @param newDuration The new contest duration in seconds.
    function setContestWindow(address vault, uint256 newDuration) external;

    // --- State Transitions ---

    /// @notice Transitions a vault from Active to ClaimPending if BOTH timeout has expired AND guardian threshold is met.
    /// @param vault The vault address.
    function triggerClaimPending(address vault) external;

    /// @notice Transitions a vault from ClaimPending to Finalized once the contest window has expired.
    /// @param vault The vault address.
    function finalizeContest(address vault) external;

    /// @notice Cancels a pending claim during the contest window using an off-chain EIP-712 signature
    ///         from the owner's stealth key, preventing the "Gas Linkage" trap.
    /// @param vault The vault address.
    /// @param nonce The owner's cancellation nonce.
    /// @param deadline Signature expiry timestamp.
    /// @param sig The ECDSA signature over the EIP-712 typed-data digest.
    function cancelClaimWithSig(
        address vault,
        uint256 nonce,
        uint256 deadline,
        bytes calldata sig
    ) external;

    /// @notice Direct cancellation fallback (callable only if caller is the vault owner or vault itself).
    /// @dev Secondary fallback path only; primary path is cancelClaimWithSig to preserve stealth privacy.
    /// @param vault The vault address.
    function cancelClaim(address vault) external;

    // --- View Helpers ---

    /// @notice Returns the current cancellation nonce for a vault.
    /// @param vault The vault address.
    function cancelNonces(address vault) external view returns (uint256);

    /// @notice Returns the current consensus state of a vault.
    /// @param vault The vault address.
    function getState(address vault) external view returns (ConsensusState);

    /// @notice Returns true if the vault's heartbeat timeout has elapsed.
    /// @param vault The vault address.
    function isTimeoutExpired(address vault) external view returns (bool);

    /// @notice Returns remaining seconds until heartbeat timeout, or 0 if expired.
    /// @param vault The vault address.
    function timeUntilTimeout(address vault) external view returns (uint256);

    /// @notice Returns remaining seconds until contest window closes, or 0 if closed.
    /// @param vault The vault address.
    function timeUntilFinalized(address vault) external view returns (uint256);

    /// @notice Returns the timestamp of the last recorded heartbeat for a vault.
    /// @param vault The vault address.
    function getLastActiveTimestamp(address vault) external view returns (uint256);

    /// @notice Returns the check-in interval for a vault.
    /// @param vault The vault address.
    function getCheckInInterval(address vault) external view returns (uint256);

    /// @notice Returns the contest deadline timestamp for a vault in ClaimPending state.
    /// @param vault The vault address.
    function getContestDeadline(address vault) external view returns (uint256);

    /// @notice Returns the full ConsensusConfig struct for a vault.
    /// @param vault The vault address.
    function getConsensusConfig(address vault) external view returns (ConsensusConfig memory);

    // --- Chainlink Automation Delegation ---

    /// @notice Evaluates whether automated upkeep is needed for a specific vault.
    /// @param vault The vault address.
    function checkVaultUpkeep(address vault)
        external
        view
        returns (bool upkeepNeeded, bytes memory performData);

    /// @notice Executes automated upkeep for a specific vault.
    /// @param vault The vault address.
    /// @param performData Encoded execution instruction from checkVaultUpkeep.
    function performVaultUpkeep(address vault, bytes calldata performData) external;
}
