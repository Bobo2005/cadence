// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IProofOfLifeConsensus} from "./interfaces/IProofOfLifeConsensus.sol";
import {IChainlinkAutomation} from "./interfaces/IChainlinkAutomation.sol";
import {MerkleProofLib} from "./libraries/MerkleProofLib.sol";

/// @title InheritanceVault
/// @notice Main vault contract for Cadence: deposits, check-in entrypoint, and asset custody.
/// @dev Architectural requirement (Feature Spotlight C): Consensus logic is NOT embedded here.
///      All heartbeat timeouts, guardian attestations, and contest window state transitions are
///      delegated to the standalone ProofOfLifeConsensus contract via IProofOfLifeConsensus.
///
///      ⚠️ ARCHITECTURE CONSTRAINT #3 (Allocation Privacy):
///      The contract stores ONLY `bytes32 public allocationRoot` (a Merkle commitment).
///      Plaintext shares and recipient allocations NEVER exist on-chain or in storage slots.
///      At claim time, beneficiaries submit a Merkle proof with their blinding salt to unlock
///      their share.
contract InheritanceVault is Ownable, ReentrancyGuard, IChainlinkAutomation {
    using SafeERC20 for IERC20;

    // --- Custom Errors ---
    error ZeroAmount();
    error ZeroAddress();
    error TokenNotWhitelisted(address token);
    error InvalidRoot();
    error RootNotCommitted();
    error VaultNotFinalized(IProofOfLifeConsensus.ConsensusState current);
    error AlreadyClaimed(address beneficiary);
    error InvalidProof();
    error TransferFailed();
    error InvalidState(IProofOfLifeConsensus.ConsensusState current);
    error Unauthorized();
    error NotBackupAddress();
    error NoActiveBackupClaim();
    error BackupClaimAlreadyActive();
    error VetoWindowNotElapsed(uint256 currentTimestamp, uint256 vetoDeadline);
    error VetoWindowZero();
    error SelfBackupNotAllowed();

    // --- Events ---
    event Deposit(address indexed sender, address indexed token, uint256 amount);
    event OwnerCheckedIn(address indexed owner, uint256 timestamp);
    event CheckInIntervalUpdated(uint256 newInterval);
    event TokenWhitelistUpdated(address indexed token, bool status);
    event AllocationRootCommitted(bytes32 indexed root, uint256 timestamp);
    event ClaimExecuted(address indexed beneficiary, uint256 shareBps, uint256 ethAmount);
    event UpkeepPerformed(uint256 timestamp, bytes performData);
    event BackupAddressRegistered(address indexed beneficiary, address indexed backupAddress, uint256 vetoWindow);
    event BackupAddressRevoked(address indexed beneficiary, address indexed backupAddress);
    event BackupClaimInitiated(address indexed beneficiary, address indexed backupAddress, uint256 vetoDeadline);
    event BackupClaimVetoed(address indexed beneficiary, address indexed vetoedBy);
    event BackupClaimExecuted(
        address indexed beneficiary,
        address indexed backupAddress,
        uint256 shareBps,
        uint256 ethAmount
    );

    // --- State Variables ---

    // Backup Claim Data Structures
    struct BackupClaimConfig {
        address backupAddress;
        uint256 vetoWindow;
    }

    struct BackupClaimRequest {
        uint256 vetoDeadline;
        bool active;
    }

    /// @notice Pre-registered backup claim address and veto window per beneficiary.
    /// @dev Strictly beneficiary-controlled: only the beneficiary can register or revoke their backup address.
    mapping(address => BackupClaimConfig) public beneficiaryBackups;

    /// @notice Active backup claim requests per beneficiary during their delay/veto window.
    mapping(address => BackupClaimRequest) public backupClaimRequests;


    /// @notice Standalone Proof-of-Life Consensus primitive.
    /// @dev All heartbeat recording, inactivity checking, and consensus state queries are delegated here.
    IProofOfLifeConsensus public immutable consensus;

    /// @notice Whitelisted ERC-20 tokens accepted for deposits (e.g. USDC, USDT, WBTC).
    mapping(address => bool) public isWhitelistedToken;

    /// @notice List of all registered whitelisted tokens for snapshot distribution.
    address[] public whitelistedTokens;

    /// @notice Cumulative deposited amount per token (address(0) denotes native ETH).
    mapping(address => uint256) public totalDeposited;

    /// @notice Merkle commitment over all beneficiary allocations (Constraint #3).
    /// @dev Stores ONLY the root — no plaintext percentages or recipient balances in storage.
    bytes32 public allocationRoot;

    /// @notice Tracks whether a beneficiary has already claimed their allocation share.
    mapping(address => bool) public hasClaimed;

    /// @notice Snapshot of total distributable balance per token taken on first claim.
    mapping(address => uint256) public distributionSnapshot;

    /// @notice Indicates whether the distribution snapshot has been captured.
    bool public isDistributionSnapshotTaken;

    /// @notice Initializes the InheritanceVault and configures it in the consensus primitive.
    /// @param initialOwner The address designated as vault owner.
    /// @param initialCheckInInterval Duration in seconds before inactivity triggers.
    /// @param initialTokens List of initial ERC-20 tokens to whitelist (can be empty).
    /// @param consensusAddress Address of the deployed ProofOfLifeConsensus contract.
    constructor(
        address initialOwner,
        uint256 initialCheckInInterval,
        address[] memory initialTokens,
        address consensusAddress
    ) Ownable(initialOwner) {
        if (consensusAddress == address(0)) revert ZeroAddress();

        consensus = IProofOfLifeConsensus(consensusAddress);

        // Configure consensus parameters in the standalone consensus contract
        consensus.configureVault(address(this), initialOwner, initialCheckInInterval, 72 hours);

        for (uint256 i = 0; i < initialTokens.length; i++) {
            address token = initialTokens[i];
            if (token != address(0)) {
                isWhitelistedToken[token] = true;
                whitelistedTokens.push(token);
                emit TokenWhitelistUpdated(token, true);
            }
        }
    }

    // --- Deposit Logic ---

    /// @notice Deposits native ETH into the vault.
    function depositETH() public payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        totalDeposited[address(0)] += msg.value;
        emit Deposit(msg.sender, address(0), msg.value);
    }

    /// @notice Fallback to accept direct ETH transfers into the vault.
    receive() external payable {
        depositETH();
    }

    /// @notice Deposits a whitelisted ERC-20 token into the vault.
    /// @param token The address of the ERC-20 token.
    /// @param amount The token amount to deposit.
    function depositToken(address token, uint256 amount) external nonReentrant {
        if (token == address(0)) revert ZeroAddress();
        if (!isWhitelistedToken[token]) revert TokenNotWhitelisted(token);
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        totalDeposited[token] += amount;

        emit Deposit(msg.sender, token, amount);
    }

    // --- Consensus Delegation (Check-in & Inactivity) ---

    /// @notice Records owner check-in / heartbeat, delegating to the consensus contract.
    function checkIn() external onlyOwner {
        emit OwnerCheckedIn(msg.sender, block.timestamp);
        consensus.recordHeartbeat(address(this));
    }

    /// @notice Updates the check-in interval duration via the consensus contract.
    /// @param newInterval The new interval in seconds.
    function setCheckInInterval(uint256 newInterval) external onlyOwner {
        emit CheckInIntervalUpdated(newInterval);
        consensus.setCheckInInterval(address(this), newInterval);
    }

    /// @notice Returns true if the owner has not checked in within the required interval.
    /// @dev Delegated directly to ProofOfLifeConsensus.
    function isInactive() external view returns (bool) {
        return consensus.isTimeoutExpired(address(this));
    }

    /// @notice Returns remaining seconds until the vault becomes inactive, or 0 if expired.
    /// @dev Delegated directly to ProofOfLifeConsensus.
    function timeUntilInactive() external view returns (uint256) {
        return consensus.timeUntilTimeout(address(this));
    }

    /// @notice Returns the timestamp of the last active owner heartbeat.
    /// @dev Delegated directly to ProofOfLifeConsensus.
    function lastActiveTimestamp() external view returns (uint256) {
        return consensus.getLastActiveTimestamp(address(this));
    }

    /// @notice Returns the check-in interval for this vault.
    /// @dev Delegated directly to ProofOfLifeConsensus.
    function checkInInterval() external view returns (uint256) {
        return consensus.getCheckInInterval(address(this));
    }

    /// @notice Returns the current consensus state of this vault.
    /// @dev Delegated directly to ProofOfLifeConsensus.
    function getConsensusState() external view returns (IProofOfLifeConsensus.ConsensusState) {
        return consensus.getState(address(this));
    }

    /// @notice Cancels a pending claim during the contest window using an off-chain EIP-712 signature.
    /// @dev Delegated directly to ProofOfLifeConsensus to preserve stealth privacy (avoiding the "Gas Linkage" trap).
    /// @param nonce Owner's cancellation nonce.
    /// @param deadline Signature expiration timestamp.
    /// @param sig ECDSA signature over the EIP-712 typed-data digest.
    function cancelClaimWithSig(
        uint256 nonce,
        uint256 deadline,
        bytes calldata sig
    ) external {
        consensus.cancelClaimWithSig(address(this), nonce, deadline, sig);
    }

    /// @notice Direct cancellation fallback callable only by the vault owner.
    /// @dev Secondary fallback path; primary path is cancelClaimWithSig.
    function cancelClaim() external onlyOwner {
        consensus.cancelClaim(address(this));
    }

    // --- Chainlink Automation Delegation ---

    /// @notice Simulated by Chainlink Automation Keepers off-chain to detect whether upkeep is needed.
    /// @dev Delegated directly to ProofOfLifeConsensus.
    /// @param checkData Optional calldata passed from registration (unused).
    function checkUpkeep(bytes calldata checkData)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        checkData; // silence unused parameter warning
        return consensus.checkVaultUpkeep(address(this));
    }

    /// @notice Executed on-chain by Chainlink Automation when checkUpkeep returns true.
    /// @dev Delegated directly to ProofOfLifeConsensus.
    /// @param performData Encoded instruction from checkVaultUpkeep.
    function performUpkeep(bytes calldata performData) external override nonReentrant {
        emit UpkeepPerformed(block.timestamp, performData);
        consensus.performVaultUpkeep(address(this), performData);
    }

    // --- Whitelist Management ---

    /// @notice Adds or removes an ERC-20 token from the accepted deposit whitelist.
    /// @param token The ERC-20 token address.
    /// @param status True to whitelist, false to delist.
    function setTokenWhitelist(address token, bool status) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (status && !isWhitelistedToken[token]) {
            whitelistedTokens.push(token);
        }
        isWhitelistedToken[token] = status;
        emit TokenWhitelistUpdated(token, status);
    }

    // --- Allocation Commitment & Claim (Architecture Constraint #3) ---

    /// @notice Commits or updates the Merkle root of beneficiary allocations.
    /// @dev Callable only by the owner while the vault is in Active state.
    ///      Enforces Constraint #3: stores ONLY the root, never plaintext shares.
    /// @param _allocationRoot The 32-byte Merkle root of all beneficiary leaves.
    function setAllocationRoot(bytes32 _allocationRoot) external onlyOwner {
        if (_allocationRoot == bytes32(0)) revert InvalidRoot();

        IProofOfLifeConsensus.ConsensusState state = consensus.getState(address(this));
        if (state != IProofOfLifeConsensus.ConsensusState.Active) {
            revert InvalidState(state);
        }

        allocationRoot = _allocationRoot;
        emit AllocationRootCommitted(_allocationRoot, block.timestamp);
    }

    /// @notice Claims a beneficiary's inheritance allocation once the vault is Finalized.
    /// @dev Verifies a cryptographic Merkle proof against allocationRoot.
    ///      At first claim, snapshots distributable vault assets to ensure exact pro-rata payouts.
    /// @param shareBps Basis points allocation of the caller (e.g. 4000 = 40%).
    /// @param salt Blinding salt known only to the owner and this beneficiary.
    /// @param proof Merkle proof verifying leaf membership in allocationRoot.
    function claim(
        uint256 shareBps,
        bytes32 salt,
        bytes32[] calldata proof
    ) external nonReentrant {
        if (allocationRoot == bytes32(0)) revert RootNotCommitted();

        IProofOfLifeConsensus.ConsensusState state = consensus.getState(address(this));
        if (state != IProofOfLifeConsensus.ConsensusState.Finalized) {
            revert VaultNotFinalized(state);
        }

        if (hasClaimed[msg.sender]) revert AlreadyClaimed(msg.sender);

        // Compute leaf and verify membership in allocationRoot
        bytes32 leaf = MerkleProofLib.computeAllocationLeaf(msg.sender, shareBps, salt);
        if (!MerkleProofLib.verify(proof, allocationRoot, leaf)) {
            revert InvalidProof();
        }

        // Snapshot total vault assets on first claim so subsequent claimants receive exact proportions
        if (!isDistributionSnapshotTaken) {
            isDistributionSnapshotTaken = true;
            distributionSnapshot[address(0)] = address(this).balance;
            for (uint256 i = 0; i < whitelistedTokens.length; i++) {
                address token = whitelistedTokens[i];
                if (isWhitelistedToken[token]) {
                    distributionSnapshot[token] = IERC20(token).balanceOf(address(this));
                }
            }
        }

        hasClaimed[msg.sender] = true;

        // Distribute proportional native ETH
        uint256 totalEth = distributionSnapshot[address(0)];
        uint256 ethPayout = (totalEth * shareBps) / 10000;
        if (ethPayout > 0) {
            (bool success, ) = msg.sender.call{value: ethPayout}("");
            if (!success) revert TransferFailed();
        }

        // Distribute proportional whitelisted ERC-20 tokens
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            address token = whitelistedTokens[i];
            uint256 totalToken = distributionSnapshot[token];
            if (totalToken > 0) {
                uint256 tokenPayout = (totalToken * shareBps) / 10000;
                if (tokenPayout > 0) {
                    IERC20(token).safeTransfer(msg.sender, tokenPayout);
                }
            }
        }

        emit ClaimExecuted(msg.sender, shareBps, ethPayout);
    }

    // --- Beneficiary Backup-Claim Address Feature (Delay / Veto Window) ---

    /// @notice Pre-registers a secondary backup claim address and delay/veto window.
    /// @dev STRICTLY BENEFICIARY-CONTROLLED: Only msg.sender can register their own backup address.
    ///      The vault owner and consensus guardians CANNOT set or redirect any beneficiary's claim.
    /// @param backupAddress The pre-authorized secondary address.
    /// @param vetoWindow Duration in seconds of the delay/veto window (e.g. 72 hours).
    function registerBackupClaimAddress(address backupAddress, uint256 vetoWindow) external {
        if (backupAddress == address(0)) revert ZeroAddress();
        if (backupAddress == msg.sender) revert SelfBackupNotAllowed();
        if (vetoWindow == 0) revert VetoWindowZero();

        beneficiaryBackups[msg.sender] = BackupClaimConfig({
            backupAddress: backupAddress,
            vetoWindow: vetoWindow
        });

        emit BackupAddressRegistered(msg.sender, backupAddress, vetoWindow);
    }

    /// @notice Revokes a previously registered backup claim address.
    /// @dev Callable ONLY by the beneficiary (msg.sender).
    function revokeBackupClaimAddress() external {
        address currentBackup = beneficiaryBackups[msg.sender].backupAddress;
        if (currentBackup == address(0)) revert NotBackupAddress();

        delete beneficiaryBackups[msg.sender];
        delete backupClaimRequests[msg.sender];

        emit BackupAddressRevoked(msg.sender, currentBackup);
    }

    /// @notice Initiates a backup claim attempt, opening the public delay/veto window.
    /// @dev Callable ONLY by the pre-registered backup address of the beneficiary.
    ///      Does NOT release funds immediately — mirrors the Contestable Claim pattern.
    /// @param beneficiary The primary beneficiary address whose allocation is being claimed.
    function initiateBackupClaim(address beneficiary) external {
        BackupClaimConfig memory config = beneficiaryBackups[beneficiary];
        if (config.backupAddress != msg.sender) revert NotBackupAddress();
        if (hasClaimed[beneficiary]) revert AlreadyClaimed(beneficiary);

        IProofOfLifeConsensus.ConsensusState state = consensus.getState(address(this));
        if (state != IProofOfLifeConsensus.ConsensusState.Finalized) {
            revert VaultNotFinalized(state);
        }

        if (backupClaimRequests[beneficiary].active) revert BackupClaimAlreadyActive();

        uint256 deadline = block.timestamp + config.vetoWindow;
        backupClaimRequests[beneficiary] = BackupClaimRequest({
            vetoDeadline: deadline,
            active: true
        });

        emit BackupClaimInitiated(beneficiary, msg.sender, deadline);
    }

    /// @notice Vetoes an active backup claim attempt during the delay/veto window.
    /// @dev Callable ONLY by the primary beneficiary (msg.sender == beneficiary).
    ///      Vault owner and guardians CANNOT veto or redirect.
    /// @param beneficiary The beneficiary address.
    function vetoBackupClaim(address beneficiary) external {
        if (msg.sender != beneficiary) revert Unauthorized();
        if (!backupClaimRequests[beneficiary].active) revert NoActiveBackupClaim();

        backupClaimRequests[beneficiary].active = false;
        emit BackupClaimVetoed(beneficiary, msg.sender);
    }

    /// @notice Finalizes and executes a backup claim once the delay/veto window has passed without veto.
    /// @dev Callable ONLY by the pre-registered backup address.
    /// @param beneficiary The primary beneficiary whose leaf is verified in allocationRoot.
    /// @param shareBps Basis points allocation of the beneficiary.
    /// @param salt Blinding salt for the beneficiary leaf.
    /// @param proof Merkle proof verifying beneficiary leaf membership in allocationRoot.
    function claimAsBackup(
        address beneficiary,
        uint256 shareBps,
        bytes32 salt,
        bytes32[] calldata proof
    ) external nonReentrant {
        BackupClaimConfig memory config = beneficiaryBackups[beneficiary];
        if (config.backupAddress != msg.sender) revert NotBackupAddress();

        BackupClaimRequest memory req = backupClaimRequests[beneficiary];
        if (!req.active) revert NoActiveBackupClaim();
        if (block.timestamp < req.vetoDeadline) {
            revert VetoWindowNotElapsed(block.timestamp, req.vetoDeadline);
        }

        if (allocationRoot == bytes32(0)) revert RootNotCommitted();

        IProofOfLifeConsensus.ConsensusState state = consensus.getState(address(this));
        if (state != IProofOfLifeConsensus.ConsensusState.Finalized) {
            revert VaultNotFinalized(state);
        }

        if (hasClaimed[beneficiary]) revert AlreadyClaimed(beneficiary);

        // Verify cryptographic Merkle proof against allocationRoot for the primary beneficiary
        bytes32 leaf = MerkleProofLib.computeAllocationLeaf(beneficiary, shareBps, salt);
        if (!MerkleProofLib.verify(proof, allocationRoot, leaf)) {
            revert InvalidProof();
        }

        // Snapshot total vault assets on first claim
        if (!isDistributionSnapshotTaken) {
            isDistributionSnapshotTaken = true;
            distributionSnapshot[address(0)] = address(this).balance;
            for (uint256 i = 0; i < whitelistedTokens.length; i++) {
                address token = whitelistedTokens[i];
                if (isWhitelistedToken[token]) {
                    distributionSnapshot[token] = IERC20(token).balanceOf(address(this));
                }
            }
        }

        hasClaimed[beneficiary] = true;
        backupClaimRequests[beneficiary].active = false;

        // Distribute proportional native ETH directly to the backup address (msg.sender)
        uint256 totalEth = distributionSnapshot[address(0)];
        uint256 ethPayout = (totalEth * shareBps) / 10000;
        if (ethPayout > 0) {
            (bool success, ) = msg.sender.call{value: ethPayout}("");
            if (!success) revert TransferFailed();
        }

        // Distribute proportional whitelisted ERC-20 tokens directly to the backup address
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            address token = whitelistedTokens[i];
            uint256 totalToken = distributionSnapshot[token];
            if (totalToken > 0) {
                uint256 tokenPayout = (totalToken * shareBps) / 10000;
                if (tokenPayout > 0) {
                    IERC20(token).safeTransfer(msg.sender, tokenPayout);
                }
            }
        }

        emit BackupClaimExecuted(beneficiary, msg.sender, shareBps, ethPayout);
    }

    /// @notice Returns the registered backup address and veto window for a beneficiary.
    function getBackupConfig(address beneficiary)
        external
        view
        returns (address backupAddress, uint256 vetoWindow)
    {
        BackupClaimConfig memory cfg = beneficiaryBackups[beneficiary];
        return (cfg.backupAddress, cfg.vetoWindow);
    }

    /// @notice Returns active backup claim request details for a beneficiary.
    function getBackupClaimRequest(address beneficiary)
        external
        view
        returns (uint256 vetoDeadline, bool active)
    {
        BackupClaimRequest memory req = backupClaimRequests[beneficiary];
        return (req.vetoDeadline, req.active);
    }

    // --- View Helpers ---

    /// @notice Returns the list of registered whitelisted tokens.
    function getWhitelistedTokens() external view returns (address[] memory) {

        return whitelistedTokens;
    }

    /// @notice Queries the vault's live balance of native ETH or any ERC-20 token.
    /// @param token address(0) for ETH, or ERC-20 token address.
    function getVaultBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }
}
