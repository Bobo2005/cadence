// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IProofOfLifeConsensus} from "./interfaces/IProofOfLifeConsensus.sol";
import {IGuardianRegistry} from "./interfaces/IGuardianRegistry.sol";
import {IChainlinkAutomation} from "./interfaces/IChainlinkAutomation.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712Lib} from "./libraries/EIP712Lib.sol";

/// @title ProofOfLifeConsensus
/// @notice Standalone consensus primitive combining heartbeat timeouts and guardian M-of-N attestations.
/// @dev Implements Feature Spotlight C (docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md).
///      Called by InheritanceVault.sol — the vault does NOT contain this logic directly.
///      States: Active → ClaimPending → Contested → Finalized.
contract ProofOfLifeConsensus is IProofOfLifeConsensus, IChainlinkAutomation, ReentrancyGuard, EIP712 {
    // --- Custom Errors ---
    error ZeroAddress();
    error InvalidInterval();
    error Unauthorized();
    error NotConfigured();
    error InvalidState(ConsensusState current);
    error TimeoutNotExpired(uint256 timeRemaining);
    error GuardianThresholdNotMet();
    error ContestWindowActive(uint256 timeRemaining);
    error UpkeepNotNeeded();
    error InvalidNonce(uint256 expected, uint256 actual);
    error DeadlineExpired(uint256 deadline, uint256 current);
    error ContestWindowExpired();
    error InvalidSignature();

    // --- State Variables ---

    /// @notice GuardianRegistry contract for verifying M-of-N attestations.
    IGuardianRegistry public immutable guardianRegistry;

    /// @notice Consensus configurations mapped by vault address.
    mapping(address => ConsensusConfig) public consensusConfigs;

    /// @notice Authorized owner or creator mapped by vault address.
    mapping(address => address) public vaultOwners;

    /// @notice Nonce tracking per vault for cancelClaimWithSig to prevent replay attacks.
    mapping(address => uint256) public override cancelNonces;

    /// @notice Action identifiers for automated upkeep.
    uint8 internal constant ACTION_TRIGGER_CLAIM_PENDING = 0;
    uint8 internal constant ACTION_FINALIZE_CONTEST = 1;

    /// @notice Default contestation window duration (72 hours).
    uint256 public constant DEFAULT_CONTEST_WINDOW = 72 hours;

    /// @notice Initializes the ProofOfLifeConsensus primitive and EIP-712 domain.
    /// @param _guardianRegistry Address of the GuardianRegistry contract.
    constructor(address _guardianRegistry) EIP712("ProofOfLifeConsensus", "1") {
        if (_guardianRegistry == address(0)) revert ZeroAddress();
        guardianRegistry = IGuardianRegistry(_guardianRegistry);
    }

    // --- Configuration Functions ---

    /// @inheritdoc IProofOfLifeConsensus
    function configureVault(
        address vault,
        address owner,
        uint256 checkInInterval,
        uint256 contestWindowDuration
    ) external override {
        if (vault == address(0) || owner == address(0)) revert ZeroAddress();
        if (checkInInterval == 0) revert InvalidInterval();

        address currentOwner = vaultOwners[vault];
        if (currentOwner != address(0) && currentOwner != msg.sender && vault != msg.sender) {
            revert Unauthorized();
        }

        vaultOwners[vault] = owner;
        uint256 contestDuration = contestWindowDuration == 0 ? DEFAULT_CONTEST_WINDOW : contestWindowDuration;

        consensusConfigs[vault] = ConsensusConfig({
            checkInInterval: checkInInterval,
            lastActiveTimestamp: block.timestamp,
            contestWindowDuration: contestDuration,
            claimPendingTimestamp: 0,
            contestDeadline: 0,
            state: ConsensusState.Active
        });

        emit ConsensusConfigured(vault, owner, checkInInterval, contestDuration);
    }

    /// @inheritdoc IProofOfLifeConsensus
    function recordHeartbeat(address vault) external override {
        address owner = vaultOwners[vault];
        if (owner == address(0)) revert NotConfigured();
        if (msg.sender != owner && msg.sender != vault) revert Unauthorized();

        ConsensusConfig storage config = consensusConfigs[vault];
        if (config.state != ConsensusState.Active) revert InvalidState(config.state);

        config.lastActiveTimestamp = block.timestamp;
        emit HeartbeatRecorded(vault, block.timestamp);
    }

    /// @inheritdoc IProofOfLifeConsensus
    function setCheckInInterval(address vault, uint256 newInterval) external override {
        address owner = vaultOwners[vault];
        if (owner == address(0)) revert NotConfigured();
        if (msg.sender != owner && msg.sender != vault) revert Unauthorized();
        if (newInterval == 0) revert InvalidInterval();

        consensusConfigs[vault].checkInInterval = newInterval;
        emit CheckInIntervalUpdated(vault, newInterval);
    }

    /// @inheritdoc IProofOfLifeConsensus
    function setContestWindow(address vault, uint256 newDuration) external override {
        address owner = vaultOwners[vault];
        if (owner == address(0)) revert NotConfigured();
        if (msg.sender != owner && msg.sender != vault) revert Unauthorized();
        if (newDuration == 0) revert InvalidInterval();

        consensusConfigs[vault].contestWindowDuration = newDuration;
        emit ContestWindowUpdated(vault, newDuration);
    }

    // --- State Transitions ---

    /// @inheritdoc IProofOfLifeConsensus
    function triggerClaimPending(address vault) public override nonReentrant {
        ConsensusConfig storage config = consensusConfigs[vault];
        if (config.lastActiveTimestamp == 0) revert NotConfigured();
        if (config.state != ConsensusState.Active) revert InvalidState(config.state);

        if (!isTimeoutExpired(vault)) {
            revert TimeoutNotExpired(timeUntilTimeout(vault));
        }

        if (!guardianRegistry.isThresholdMet(vault)) {
            revert GuardianThresholdNotMet();
        }

        config.state = ConsensusState.ClaimPending;
        config.claimPendingTimestamp = block.timestamp;
        config.contestDeadline = block.timestamp + config.contestWindowDuration;

        emit StateTransition(vault, ConsensusState.Active, ConsensusState.ClaimPending, block.timestamp);
        emit ClaimPendingTriggered(vault, config.contestDeadline, block.timestamp);
    }

    /// @inheritdoc IProofOfLifeConsensus
    function finalizeContest(address vault) public override nonReentrant {
        ConsensusConfig storage config = consensusConfigs[vault];
        if (config.lastActiveTimestamp == 0) revert NotConfigured();
        if (config.state != ConsensusState.ClaimPending) revert InvalidState(config.state);

        if (block.timestamp < config.contestDeadline) {
            revert ContestWindowActive(config.contestDeadline - block.timestamp);
        }

        config.state = ConsensusState.Finalized;

        emit StateTransition(vault, ConsensusState.ClaimPending, ConsensusState.Finalized, block.timestamp);
        emit ContestFinalized(vault, block.timestamp);
    }

    /// @inheritdoc IProofOfLifeConsensus
    function cancelClaimWithSig(
        address vault,
        uint256 nonce,
        uint256 deadline,
        bytes calldata sig
    ) external override nonReentrant {
        ConsensusConfig storage config = consensusConfigs[vault];
        if (config.lastActiveTimestamp == 0) revert NotConfigured();
        if (config.state != ConsensusState.ClaimPending) revert InvalidState(config.state);
        if (block.timestamp > deadline) revert DeadlineExpired(deadline, block.timestamp);
        if (block.timestamp >= config.contestDeadline) revert ContestWindowExpired();

        uint256 currentNonce = cancelNonces[vault];
        if (nonce != currentNonce) revert InvalidNonce(currentNonce, nonce);
        cancelNonces[vault] = currentNonce + 1;

        // Compute EIP-712 typed-data hash using EIP712Lib and OZ _hashTypedDataV4
        uint256 vaultId = uint256(uint160(vault));
        bytes32 structHash = EIP712Lib.hashCancelClaim(vaultId, nonce, deadline);
        bytes32 digest = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(digest, sig);
        address expectedOwner = vaultOwners[vault];
        if (signer == address(0) || signer != expectedOwner) revert InvalidSignature();

        _executeClaimCancellation(vault, signer);
    }

    /// @inheritdoc IProofOfLifeConsensus
    function cancelClaim(address vault) external override nonReentrant {
        ConsensusConfig storage config = consensusConfigs[vault];
        if (config.lastActiveTimestamp == 0) revert NotConfigured();
        if (config.state != ConsensusState.ClaimPending) revert InvalidState(config.state);
        if (block.timestamp >= config.contestDeadline) revert ContestWindowExpired();

        address expectedOwner = vaultOwners[vault];
        if (msg.sender != expectedOwner && msg.sender != vault) revert Unauthorized();

        _executeClaimCancellation(vault, msg.sender);
    }

    /// @notice Internal logic for claim cancellation, state restoration, and guardian reset.
    function _executeClaimCancellation(address vault, address canceller) internal {
        ConsensusConfig storage config = consensusConfigs[vault];

        // State transition: ClaimPending -> Contested -> Active
        emit StateTransition(vault, ConsensusState.ClaimPending, ConsensusState.Contested, block.timestamp);
        config.state = ConsensusState.Active;
        emit StateTransition(vault, ConsensusState.Contested, ConsensusState.Active, block.timestamp);

        config.lastActiveTimestamp = block.timestamp;
        config.claimPendingTimestamp = 0;
        config.contestDeadline = 0;

        // Reset guardian attestations so any future claim cycle starts fresh
        try guardianRegistry.resetAttestations(vault) {} catch {}

        emit ClaimCancelled(vault, canceller, block.timestamp);
    }

    // --- View Helpers ---

    /// @inheritdoc IProofOfLifeConsensus
    function getState(address vault) external view override returns (ConsensusState) {
        return consensusConfigs[vault].state;
    }

    /// @inheritdoc IProofOfLifeConsensus
    function isTimeoutExpired(address vault) public view override returns (bool) {
        ConsensusConfig storage config = consensusConfigs[vault];
        if (config.lastActiveTimestamp == 0) return false;
        return block.timestamp > config.lastActiveTimestamp + config.checkInInterval;
    }

    /// @inheritdoc IProofOfLifeConsensus
    function timeUntilTimeout(address vault) public view override returns (uint256) {
        ConsensusConfig storage config = consensusConfigs[vault];
        if (config.lastActiveTimestamp == 0) return 0;

        uint256 deadline = config.lastActiveTimestamp + config.checkInInterval;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    /// @inheritdoc IProofOfLifeConsensus
    function timeUntilFinalized(address vault) external view override returns (uint256) {
        ConsensusConfig storage config = consensusConfigs[vault];
        if (config.state != ConsensusState.ClaimPending) return 0;

        if (block.timestamp >= config.contestDeadline) return 0;
        return config.contestDeadline - block.timestamp;
    }

    /// @inheritdoc IProofOfLifeConsensus
    function getLastActiveTimestamp(address vault) external view override returns (uint256) {
        return consensusConfigs[vault].lastActiveTimestamp;
    }

    /// @inheritdoc IProofOfLifeConsensus
    function getCheckInInterval(address vault) external view override returns (uint256) {
        return consensusConfigs[vault].checkInInterval;
    }

    /// @inheritdoc IProofOfLifeConsensus
    function getContestDeadline(address vault) external view override returns (uint256) {
        return consensusConfigs[vault].contestDeadline;
    }

    /// @inheritdoc IProofOfLifeConsensus
    function getConsensusConfig(address vault) external view override returns (ConsensusConfig memory) {
        return consensusConfigs[vault];
    }

    // --- Chainlink Automation Upkeep ---

    /// @inheritdoc IProofOfLifeConsensus
    function checkVaultUpkeep(address vault)
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        ConsensusConfig storage config = consensusConfigs[vault];
        if (config.lastActiveTimestamp == 0) {
            return (false, "");
        }

        if (config.state == ConsensusState.Active) {
            if (isTimeoutExpired(vault) && guardianRegistry.isThresholdMet(vault)) {
                return (true, abi.encode(vault, ACTION_TRIGGER_CLAIM_PENDING));
            }
        } else if (config.state == ConsensusState.ClaimPending) {
            if (block.timestamp >= config.contestDeadline) {
                return (true, abi.encode(vault, ACTION_FINALIZE_CONTEST));
            }
        }

        return (false, "");
    }

    /// @inheritdoc IProofOfLifeConsensus
    function performVaultUpkeep(address vault, bytes calldata performData) public override {
        (address targetVault, uint8 action) = abi.decode(performData, (address, uint8));
        if (targetVault != vault) revert Unauthorized();

        if (action == ACTION_TRIGGER_CLAIM_PENDING) {
            triggerClaimPending(vault);
        } else if (action == ACTION_FINALIZE_CONTEST) {
            finalizeContest(vault);
        } else {
            revert UpkeepNotNeeded();
        }
    }

    /// @notice AutomationCompatibleInterface keeper simulation across arbitrary registered checkData.
    /// @param checkData Encoded vault address to evaluate.
    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        if (checkData.length >= 32) {
            address vault = abi.decode(checkData, (address));
            return checkVaultUpkeep(vault);
        }
        return (false, "");
    }

    /// @notice AutomationCompatibleInterface keeper execution.
    /// @param performData Encoded vault address and action from checkUpkeep.
    function performUpkeep(bytes calldata performData) external override {
        (address vault, ) = abi.decode(performData, (address, uint8));
        performVaultUpkeep(vault, performData);
    }
}
