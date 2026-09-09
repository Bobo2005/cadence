// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProofLib} from "./libraries/MerkleProofLib.sol";
import {IGuardianRegistry} from "./interfaces/IGuardianRegistry.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GuardianRegistry
/// @notice Merkle commitment storage and M-of-N attestation verification for guardians.
/// @dev Guardian identities remain private (hidden as a Merkle root) while the vault is active.
///      At claim-eligibility time, guardians prove membership via Merkle proofs and attest.
///      See docs/ARCHITECTURE.md and docs/PROJECT-PLAN.md Days 5–7.
contract GuardianRegistry is ReentrancyGuard, EIP712, IGuardianRegistry {
    // --- Custom Errors ---
    error ZeroAddress();
    error InvalidRoot();
    error InvalidThreshold();
    error Unauthorized();
    error RootNotCommitted(address vault);
    error InvalidGuardianProof();
    error DuplicateAttestation(address guardian);
    error InvalidSignature();
    error DeadlineExpired(uint256 deadline, uint256 current);

    // --- Constants ---
    bytes32 public constant GUARDIAN_ATTESTATION_TYPEHASH =
        keccak256("GuardianAttestation(address vault,address guardian,uint256 cycle,uint256 deadline)");

    // --- State Variables ---

    /// @notice Guardian configuration per vault.
    mapping(address => GuardianConfig) public guardianConfigs;

    /// @notice Authorized owner or deployer permitted to configure guardian root per vault.
    mapping(address => address) public vaultOwners;

    /// @notice Tracks active attestation cycle per vault (increments on reset).
    mapping(address => uint256) public attestationCycle;

    /// @notice Tracks whether a guardian has attested in a given cycle: [vault][cycle][guardian] => bool.
    mapping(address => mapping(uint256 => mapping(address => bool))) public hasAttestedByCycle;

    /// @notice Authorized consensus contract mapped by vault address.
    mapping(address => address) public consensusContracts;

    constructor() EIP712("GuardianRegistry", "1") {}

    // --- Configuration Functions ---

    /// @notice Commits or updates the Merkle root of guardians for a vault.
    /// @dev First call sets the caller as the vaultOwner. Subsequent updates require caller to be vaultOwner or the vault itself.
    /// @param vault The vault contract address.
    /// @param guardianRoot The Merkle root of all valid guardian leaves.
    /// @param threshold The M-of-N threshold required to satisfy consensus (M).
    /// @param totalGuardians Total number of guardians in the Merkle tree (N).
    function commitGuardianRoot(
        address vault,
        bytes32 guardianRoot,
        uint256 threshold,
        uint256 totalGuardians
    ) external {
        if (vault == address(0)) revert ZeroAddress();
        if (guardianRoot == bytes32(0)) revert InvalidRoot();
        if (threshold == 0) revert InvalidThreshold();
        if (totalGuardians < threshold) revert InvalidThreshold();

        if (vaultOwners[vault] == address(0)) {
            vaultOwners[vault] = msg.sender;
        } else if (msg.sender != vaultOwners[vault] && msg.sender != vault) {
            revert Unauthorized();
        }

        GuardianConfig storage config = guardianConfigs[vault];
        config.guardianRoot = guardianRoot;
        config.threshold = threshold;
        config.totalGuardians = totalGuardians;
        config.attestationCount = 0;
        config.thresholdReached = false;

        attestationCycle[vault]++;

        emit GuardianRootCommitted(vault, guardianRoot, threshold, totalGuardians);
    }

    // --- Attestation Functions ---

    /// @notice Submits a direct attestation from a guardian with their Merkle proof.
    /// @param vault The vault being attested for.
    /// @param proof The Merkle proof showing msg.sender is in the guardian tree.
    function attest(address vault, bytes32[] calldata proof) external nonReentrant {
        _processAttestation(vault, msg.sender, proof);
    }

    /// @notice Submits a relayed attestation on behalf of a guardian using an ECDSA signature.
    /// @dev Enables gasless attestations where guardians sign off-chain and a relayer submits the transaction.
    /// @param vault The vault being attested for.
    /// @param guardian The guardian's address.
    /// @param proof The Merkle proof showing the guardian is in the guardian tree.
    /// @param deadline Signature expiration timestamp.
    /// @param signature The ECDSA signature of the guardian approving the attestation.
    function attestWithSig(
        address vault,
        address guardian,
        bytes32[] calldata proof,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant {
        if (guardian == address(0)) revert ZeroAddress();
        if (block.timestamp > deadline) revert DeadlineExpired(deadline, block.timestamp);

        uint256 currentCycle = attestationCycle[vault];
        bytes32 structHash = keccak256(
            abi.encode(
                GUARDIAN_ATTESTATION_TYPEHASH,
                vault,
                guardian,
                currentCycle,
                deadline
            )
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        if (signer != guardian) revert InvalidSignature();

        _processAttestation(vault, guardian, proof);
    }

    /// @notice Internal logic for verifying guardian membership and updating consensus counters.
    function _processAttestation(
        address vault,
        address guardian,
        bytes32[] calldata proof
    ) internal {
        GuardianConfig storage config = guardianConfigs[vault];
        if (config.guardianRoot == bytes32(0)) revert RootNotCommitted(vault);

        uint256 currentCycle = attestationCycle[vault];
        if (hasAttestedByCycle[vault][currentCycle][guardian]) {
            revert DuplicateAttestation(guardian);
        }

        bytes32 leaf = MerkleProofLib.computeGuardianLeaf(guardian);
        if (!MerkleProofLib.verify(proof, config.guardianRoot, leaf)) {
            revert InvalidGuardianProof();
        }

        hasAttestedByCycle[vault][currentCycle][guardian] = true;
        config.attestationCount++;

        emit GuardianAttested(vault, guardian, config.attestationCount);

        if (config.attestationCount >= config.threshold && !config.thresholdReached) {
            config.thresholdReached = true;
            emit GuardianThresholdMet(vault, config.attestationCount, config.threshold);
        }
    }

    /// @notice Sets the consensus contract permitted to reset attestations for a vault.
    /// @param vault The vault address.
    /// @param _consensus The consensus contract address.
    function setConsensusForVault(address vault, address _consensus) external {
        if (vaultOwners[vault] == address(0) || (msg.sender != vaultOwners[vault] && msg.sender != vault)) {
            revert Unauthorized();
        }
        if (_consensus == address(0)) revert ZeroAddress();
        consensusContracts[vault] = _consensus;
    }

    /// @notice Resets attestations for a vault (e.g. after a cancelled claim or owner check-in).
    /// @param vault The vault address.
    function resetAttestations(address vault) external {
        if (
            msg.sender != vaultOwners[vault] &&
            msg.sender != vault &&
            msg.sender != consensusContracts[vault]
        ) {
            revert Unauthorized();
        }

        GuardianConfig storage config = guardianConfigs[vault];
        config.attestationCount = 0;
        config.thresholdReached = false;
        attestationCycle[vault]++;

        emit AttestationsReset(vault, attestationCycle[vault]);
    }

    // --- View Helpers ---

    /// @notice Returns true if the M-of-N guardian attestation threshold is met.
    /// @param vault The vault address.
    function isThresholdMet(address vault) external view returns (bool) {
        return guardianConfigs[vault].thresholdReached;
    }

    /// @notice Returns the number of valid attestations recorded in the current cycle.
    /// @param vault The vault address.
    function getAttestationCount(address vault) external view returns (uint256) {
        return guardianConfigs[vault].attestationCount;
    }

    /// @notice Checks if a specific guardian has already attested in the current cycle.
    /// @param vault The vault address.
    /// @param guardian The guardian address.
    function hasGuardianAttested(address vault, address guardian) external view returns (bool) {
        return hasAttestedByCycle[vault][attestationCycle[vault]][guardian];
    }

    /// @notice Verifies if an address and proof belong to the committed guardian set.
    /// @param vault The vault address.
    /// @param guardian The candidate guardian address.
    /// @param proof The Merkle proof.
    function verifyGuardian(
        address vault,
        address guardian,
        bytes32[] calldata proof
    ) external view returns (bool) {
        bytes32 root = guardianConfigs[vault].guardianRoot;
        if (root == bytes32(0)) return false;

        bytes32 leaf = MerkleProofLib.computeGuardianLeaf(guardian);
        return MerkleProofLib.verify(proof, root, leaf);
    }

    /// @notice Returns the full GuardianConfig for a vault.
    /// @param vault The vault address.
    function getGuardianConfig(address vault) external view returns (GuardianConfig memory) {
        return guardianConfigs[vault];
    }
}
