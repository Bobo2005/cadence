// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PackedUserOperation, IAccount, IEntryPoint} from "@openzeppelin/contracts/interfaces/IERC4337.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {IBeneficiarySmartAccount, IBeneficiaryAccountFactory} from "./interfaces/IBeneficiarySmartAccount.sol";

/// @title BeneficiarySmartAccount
/// @notice Lightweight ERC-4337 compliant smart account with mandatory beneficiary-nominated recovery guardians.
/// @dev Implements social recovery allowing M-of-N nominated guardians to restore account access.
///      Independent of the vault's consensus guardian set. See docs/PROJECT-PLAN.md Section 7.
contract BeneficiarySmartAccount is IBeneficiarySmartAccount {
    // --- ERC-4337 Constants ---
    uint256 internal constant SIG_VALIDATION_SUCCESS = 0;
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    // --- State Variables ---
    address public override owner;
    address public override entryPoint;
    address[] public guardians;
    mapping(address => bool) public override isGuardian;
    uint256 public override recoveryThreshold;

    // Social Recovery State
    RecoveryProposal public override currentRecovery;
    uint256 public recoveryNonce;
    // nonce => guardian => supported
    mapping(uint256 => mapping(address => bool)) internal _recoverySupport;

    // Backup Address Feature State
    address public override backupAddress;
    uint256 public override backupVetoWindow;

    struct BackupActivation {
        uint256 vetoDeadline;
        bool active;
    }
    BackupActivation internal _backupActivation;


    // --- Modifiers ---
    modifier onlyEntryPointOrOwner() {
        if (msg.sender != owner && msg.sender != entryPoint) {
            revert Unauthorized();
        }
        _;
    }

    modifier onlyGuardian() {
        if (!isGuardian[msg.sender]) {
            revert OnlyGuardian();
        }
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert OnlyOwner();
        }
        _;
    }

    // --- Initialization ---

    /// @notice Initializes the beneficiary smart account with owner and nominated guardians.
    /// @dev Enforces the mandatory guardian invariant: at least 1 guardian and valid threshold.
    /// @param _owner The beneficiary primary address.
    /// @param _entryPoint The ERC-4337 EntryPoint contract.
    /// @param _guardians Beneficiary-nominated recovery guardians.
    /// @param _recoveryThreshold M-of-N threshold required for social recovery.
    function initialize(
        address _owner,
        address _entryPoint,
        address[] calldata _guardians,
        uint256 _recoveryThreshold
    ) external {
        if (owner != address(0)) revert AlreadyInitialized();
        if (_owner == address(0) || _entryPoint == address(0)) revert ZeroAddress();
        if (_guardians.length == 0) revert InvalidGuardians();
        if (_recoveryThreshold == 0 || _recoveryThreshold > _guardians.length) {
            revert InvalidThreshold();
        }

        owner = _owner;
        entryPoint = _entryPoint;
        recoveryThreshold = _recoveryThreshold;

        for (uint256 i = 0; i < _guardians.length; i++) {
            address g = _guardians[i];
            if (g == address(0)) revert ZeroAddress();
            if (isGuardian[g]) revert DuplicateGuardian(g);
            isGuardian[g] = true;
            guardians.push(g);
        }

        emit AccountInitialized(_owner, _entryPoint, _guardians, _recoveryThreshold);
    }

    // --- ERC-4337 Account Implementation ---

    /// @notice Validates a user operation per ERC-4337 specification.
    /// @param userOp The packed user operation.
    /// @param userOpHash The hash of the user operation.
    /// @param missingAccountFunds Gas prefund required by the EntryPoint.
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        if (msg.sender != entryPoint) revert OnlyEntryPoint();

        // Validate signature over userOpHash against the account owner
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address recovered = ECDSA.recover(ethSignedHash, userOp.signature);
        if (recovered != owner) {
            // Check raw userOpHash without Ethereum prefix
            recovered = ECDSA.recover(userOpHash, userOp.signature);
        }

        if (recovered != owner) {
            return SIG_VALIDATION_FAILED;
        }

        // Refund missing account funds to EntryPoint if needed
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            (success); // EntryPoint handles failed prefund check
        }

        return SIG_VALIDATION_SUCCESS;
    }

    // --- Execution ---

    /// @notice Executes a transaction from this smart account.
    /// @dev Callable only by the EntryPoint or directly by the owner.
    /// @param dest Target contract or recipient address.
    /// @param value Native ETH value in wei.
    /// @param data Calldata for the call.
    function execute(
        address dest,
        uint256 value,
        bytes calldata data
    ) external override onlyEntryPointOrOwner returns (bytes memory) {
        (bool success, bytes memory result) = dest.call{value: value}(data);
        if (!success) {
            revert CallFailed(result);
        }
        emit TransactionExecuted(dest, value, data);
        return result;
    }

    // --- Social Recovery (M-of-N Nominated Guardians) ---

    /// @notice Initiates a social recovery proposal to transfer ownership to a new address.
    /// @dev Callable only by a nominated recovery guardian.
    /// @param newOwner The new beneficiary address proposed.
    function initiateRecovery(address newOwner) external override onlyGuardian {
        if (newOwner == address(0) || newOwner == owner) revert Unauthorized();
        if (currentRecovery.active) revert RecoveryAlreadyActive();

        recoveryNonce++;
        currentRecovery = RecoveryProposal({
            proposedOwner: newOwner,
            supportCount: 1,
            active: true,
            proposalNonce: recoveryNonce
        });

        _recoverySupport[recoveryNonce][msg.sender] = true;

        emit RecoveryInitiated(msg.sender, newOwner, recoveryNonce);
        emit RecoverySupported(msg.sender, newOwner, 1, recoveryThreshold);

        // Auto-execute if threshold is 1-of-N
        if (recoveryThreshold == 1) {
            _executeRecoveryInternal(newOwner, recoveryNonce);
        }
    }

    /// @notice Confirms support for an ongoing recovery proposal.
    /// @dev Callable only by a nominated recovery guardian who has not yet supported this proposal.
    /// @param newOwner The proposed new owner address.
    function supportRecovery(address newOwner) external override onlyGuardian {
        if (!currentRecovery.active) revert RecoveryNotActive();
        if (currentRecovery.proposedOwner != newOwner) revert ProposalMismatch();
        if (_recoverySupport[currentRecovery.proposalNonce][msg.sender]) {
            revert AlreadySupported(msg.sender);
        }

        _recoverySupport[currentRecovery.proposalNonce][msg.sender] = true;
        currentRecovery.supportCount += 1;

        emit RecoverySupported(
            msg.sender,
            newOwner,
            currentRecovery.supportCount,
            recoveryThreshold
        );

        // If threshold reached, execute recovery
        if (currentRecovery.supportCount >= recoveryThreshold) {
            _executeRecoveryInternal(newOwner, currentRecovery.proposalNonce);
        }
    }

    /// @notice Explicitly executes a recovery proposal once the threshold is satisfied.
    /// @param newOwner The proposed new owner address.
    function executeRecovery(address newOwner) external override {
        if (!currentRecovery.active) revert RecoveryNotActive();
        if (currentRecovery.proposedOwner != newOwner) revert ProposalMismatch();
        if (currentRecovery.supportCount < recoveryThreshold) {
            revert ThresholdNotMet(currentRecovery.supportCount, recoveryThreshold);
        }

        _executeRecoveryInternal(newOwner, currentRecovery.proposalNonce);
    }

    /// @notice Executes social recovery in a single transaction using signed guardian authorizations.
    /// @dev Enables gasless relayed recovery without multiple transactions.
    /// @param newOwner The new beneficiary address.
    /// @param signatures Array of ECDSA signatures from distinct nominated recovery guardians.
    function recoverWithSignatures(
        address newOwner,
        bytes[] calldata signatures
    ) external override {
        if (newOwner == address(0) || newOwner == owner) revert Unauthorized();
        if (signatures.length < recoveryThreshold) {
            revert ThresholdNotMet(signatures.length, recoveryThreshold);
        }

        uint256 nextNonce = recoveryNonce + 1;
        bytes32 digest = keccak256(
            abi.encode(
                address(this),
                "RECOVER_OWNERSHIP",
                newOwner,
                nextNonce,
                block.chainid
            )
        );
        bytes32 ethSignedDigest = MessageHashUtils.toEthSignedMessageHash(digest);

        address[] memory seenGuardians = new address[](signatures.length);
        uint256 validCount = 0;

        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = ECDSA.recover(ethSignedDigest, signatures[i]);
            if (!isGuardian[signer]) {
                revert OnlyGuardian();
            }

            // Check for duplicate signers in array
            for (uint256 j = 0; j < validCount; j++) {
                if (seenGuardians[j] == signer) {
                    revert AlreadySupported(signer);
                }
            }

            seenGuardians[validCount] = signer;
            validCount++;
        }

        if (validCount < recoveryThreshold) {
            revert ThresholdNotMet(validCount, recoveryThreshold);
        }

        recoveryNonce = nextNonce;
        _executeRecoveryInternal(newOwner, nextNonce);
    }

    /// @notice Cancels an active recovery proposal.
    /// @dev Callable only by the active owner (e.g. if the owner is still in control of their key).
    function cancelRecovery() external override onlyOwner {
        if (!currentRecovery.active) revert RecoveryNotActive();
        address proposed = currentRecovery.proposedOwner;
        uint256 nonce = currentRecovery.proposalNonce;
        currentRecovery.active = false;

        emit RecoveryCancelled(msg.sender, proposed, nonce);
    }

    // --- Internal Helpers ---

    function _executeRecoveryInternal(address newOwner, uint256 nonce) internal {
        address previousOwner = owner;
        owner = newOwner;
        currentRecovery.active = false;

        emit RecoveryExecuted(previousOwner, newOwner, nonce);
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    // --- View Helpers ---

    function getGuardians() external view override returns (address[] memory) {
        return guardians;
    }

    function hasSupportedRecovery(
        uint256 nonce,
        address guardian
    ) external view override returns (bool) {
        return _recoverySupport[nonce][guardian];
    }

    // --- Beneficiary Backup Address Feature (Delay / Veto Window) ---


    /// @notice Pre-registers a secondary backup address and delay/veto window.
    /// @dev STRICTLY BENEFICIARY-CONTROLLED: Callable ONLY by the smart account owner.
    ///      Neither vault owner nor guardians can set or modify this.
    /// @param _backupAddress The secondary wallet address.
    /// @param _vetoWindow Duration in seconds of the delay/veto window.
    function setBackupAddress(
        address _backupAddress,
        uint256 _vetoWindow
    ) external override onlyOwner {
        if (_backupAddress == address(0)) revert ZeroAddress();
        if (_backupAddress == owner) revert SelfBackupNotAllowed();
        if (_vetoWindow == 0) revert VetoWindowZero();

        backupAddress = _backupAddress;
        backupVetoWindow = _vetoWindow;

        emit BackupAddressSet(_backupAddress, _vetoWindow);
    }

    /// @notice Revokes a previously configured backup address.
    /// @dev Callable ONLY by the smart account owner.
    function revokeBackupAddress() external override onlyOwner {
        if (backupAddress == address(0)) revert NotBackupAddress();
        address previousBackup = backupAddress;
        backupAddress = address(0);
        backupVetoWindow = 0;
        _backupActivation.active = false;

        emit BackupAddressRevoked(previousBackup);
    }

    /// @notice Initiates backup activation if the primary owner key is unreachable.
    /// @dev Callable ONLY by the pre-registered backup address.
    ///      Opens the delay/veto window mirroring Contestable Claim.
    function initiateBackupActivation() external override {
        if (msg.sender != backupAddress) revert NotBackupAddress();
        if (_backupActivation.active) revert BackupActivationAlreadyActive();

        uint256 deadline = block.timestamp + backupVetoWindow;
        _backupActivation = BackupActivation({vetoDeadline: deadline, active: true});

        emit BackupActivationInitiated(msg.sender, deadline);
    }

    /// @notice Vetoes an active backup activation attempt.
    /// @dev Callable ONLY by the primary owner (msg.sender == owner).
    function vetoBackupActivation() external override onlyOwner {
        if (!_backupActivation.active) revert NoActiveBackupActivation();
        _backupActivation.active = false;

        emit BackupActivationVetoed(msg.sender);
    }

    /// @notice Finalizes backup activation once the delay/veto window has passed without veto.
    /// @dev Callable ONLY by the pre-registered backup address.
    function finalizeBackupActivation() external override {
        if (msg.sender != backupAddress) revert NotBackupAddress();
        if (!_backupActivation.active) revert NoActiveBackupActivation();
        if (block.timestamp < _backupActivation.vetoDeadline) {
            revert VetoWindowNotElapsed(block.timestamp, _backupActivation.vetoDeadline);
        }

        address previousOwner = owner;
        owner = backupAddress;
        _backupActivation.active = false;

        emit BackupActivationFinalized(previousOwner, backupAddress);
        emit OwnershipTransferred(previousOwner, backupAddress);
    }

    function getBackupActivation()
        external
        view
        override
        returns (uint256 vetoDeadline, bool active)
    {
        return (_backupActivation.vetoDeadline, _backupActivation.active);
    }

    receive() external payable {}
}


/// @title BeneficiaryAccountFactory
/// @notice Deterministic CREATE2 factory for provisioning BeneficiarySmartAccount instances.
contract BeneficiaryAccountFactory is IBeneficiaryAccountFactory {
    address public override immutable entryPoint;

    // Beneficiary => Deployed Accounts
    mapping(address => address[]) internal _beneficiaryAccounts;
    mapping(address => bool) public override isDeployedAccount;

    constructor(address _entryPoint) {
        if (_entryPoint == address(0)) revert IBeneficiarySmartAccount.ZeroAddress();
        entryPoint = _entryPoint;
    }

    /// @notice Deploys a new BeneficiarySmartAccount via CREATE2.
    /// @param beneficiary The beneficiary primary owner.
    /// @param nominatedGuardians The beneficiary's nominated recovery guardians (mandatory).
    /// @param recoveryThreshold M-of-N social recovery threshold.
    /// @param salt Salt for deterministic CREATE2 address derivation.
    function createAccount(
        address beneficiary,
        address[] calldata nominatedGuardians,
        uint256 recoveryThreshold,
        uint256 salt
    ) external override returns (address) {
        if (beneficiary == address(0)) revert IBeneficiarySmartAccount.ZeroAddress();
        if (nominatedGuardians.length == 0) revert IBeneficiarySmartAccount.InvalidGuardians();
        if (recoveryThreshold == 0 || recoveryThreshold > nominatedGuardians.length) {
            revert IBeneficiarySmartAccount.InvalidThreshold();
        }

        bytes32 actualSalt = keccak256(abi.encode(beneficiary, salt));
        bytes memory creationBytecode = type(BeneficiarySmartAccount).creationCode;

        address smartAccount = Create2.deploy(0, actualSalt, creationBytecode);

        _beneficiaryAccounts[beneficiary].push(smartAccount);
        isDeployedAccount[smartAccount] = true;

        BeneficiarySmartAccount(payable(smartAccount)).initialize(
            beneficiary,
            entryPoint,
            nominatedGuardians,
            recoveryThreshold
        );

        emit BeneficiaryAccountCreated(
            beneficiary,
            smartAccount,
            recoveryThreshold,
            salt
        );

        return smartAccount;
    }

    /// @notice Computes the counterfactual CREATE2 address of a beneficiary account prior to deployment.
    /// @param beneficiary The beneficiary address.
    /// @param salt The derivation salt.
    function getAddress(
        address beneficiary,
        address[] calldata /*nominatedGuardians*/,
        uint256 /*recoveryThreshold*/,
        uint256 salt
    ) external view override returns (address) {
        bytes32 actualSalt = keccak256(abi.encode(beneficiary, salt));
        bytes32 bytecodeHash = keccak256(type(BeneficiarySmartAccount).creationCode);
        return Create2.computeAddress(actualSalt, bytecodeHash, address(this));
    }

    /// @notice Returns all smart accounts deployed for a beneficiary.
    function getAccountsForBeneficiary(
        address beneficiary
    ) external view override returns (address[] memory) {
        return _beneficiaryAccounts[beneficiary];
    }
}
