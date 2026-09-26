// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IProofOfLifeConsensus} from "./interfaces/IProofOfLifeConsensus.sol";
import {IGuardianRegistry} from "./interfaces/IGuardianRegistry.sol";
import {IChainlinkAutomation} from "./interfaces/IChainlinkAutomation.sol";
import {MerkleProofLib} from "./libraries/MerkleProofLib.sol";
import {IAavePool} from "./interfaces/IAavePool.sol";
import {IAToken} from "./interfaces/IAToken.sol";
import {IMerkleVerifier} from "./interfaces/IMerkleVerifier.sol";

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
    error MaxTokensExceeded();
    error StreamNotActive();
    error StreamIsPaused();
    error InvalidStreamingConfig();
    error OnlyBeneficiaryOrRecipient();
    error OnlyBeneficiaryOrBackup();
    error UnauthorizedGuardian();
    error NothingToClaim();

    // --- Events ---
    event Deposit(address indexed sender, address indexed token, uint256 amount);
    event OwnerCheckedIn(address indexed owner, uint256 timestamp);
    event CheckInIntervalUpdated(uint256 newInterval);
    event TokenWhitelistUpdated(address indexed token, bool status);
    event TokenTransferFailed(address indexed token, address indexed beneficiary, uint256 amount);
    event AllocationRootCommitted(bytes32 indexed root, uint256 timestamp);
    event MerkleVerifierUpdated(address indexed verifier);
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
    event StreamingConfigUpdated(uint256 duration, uint256 initialReleaseBps, uint256 yieldBps);
    event StreamStarted(address indexed beneficiary, uint256 totalShareEth, uint256 initialPayoutEth, uint256 duration);
    event StreamClaimed(address indexed beneficiary, address indexed recipient, uint256 claimableEth, uint256 accruedYieldEth);
    event StreamPaused(address indexed beneficiary, address indexed pausedBy);
    event StreamResumed(address indexed beneficiary, address indexed resumedBy);
    event StreamRedirected(address indexed beneficiary, address indexed oldRecipient, address indexed newRecipient);
    event AavePoolUpdated(address indexed pool);
    event ATokenConfigured(address indexed asset, address indexed aToken);
    event SecretBoxAnchored(
        address indexed beneficiary,
        string ipfsCid,
        string encryptedKeyCipher,
        uint64 timestamp
    );

    // --- Constants ---
    uint256 public constant MAX_WHITELISTED_TOKENS = 20;

    // --- State Variables ---

    // Encrypted Secret Box Anchor Structure (Off-Chain Secrets: CEX, Seed Shards, Passwords)
    struct SecretBoxAnchor {
        string ipfsCid;
        string encryptedKeyCipher;
        uint64 timestamp;
    }

    struct SecretBoxAnchorInit {
        address beneficiary;
        string ipfsCid;
        string encryptedKeyCipher;
    }

    /// @notice Anchored encrypted secret box metadata per beneficiary
    mapping(address => SecretBoxAnchor) public beneficiarySecretBoxes;

    // Backup Claim Data Structures
    struct BackupClaimConfig {
        address backupAddress;
        uint256 vetoWindow;
    }

    struct BackupClaimRequest {
        uint256 vetoDeadline;
        bool active;
    }

    // Cadence Streams Data Structure
    struct BeneficiaryStream {
        uint256 totalShareEth;
        uint256 claimedEth;
        uint256 initialPayoutEth;
        uint256 startTime;
        uint256 duration;
        bool isPaused;
        address streamRecipient;
        address streamingAsset;
        uint256 streamingPrincipal;
        uint256 streamingClaimed;
    }

    /// @notice Duration in seconds over which remaining inheritance is streamed (0 = instant lump-sum).
    uint256 public streamingDuration;

    /// @notice Basis points of total share unlocked immediately on first claim (e.g. 1000 = 10%).
    uint256 public initialReleaseBps;

    /// @notice Simulated annual yield rate in basis points accrued on locked principal (e.g. 420 = 4.20% APY).
    uint256 public streamingYieldBps;

    /// @notice Beneficiary stream records.
    mapping(address => BeneficiaryStream) public beneficiaryStreams;

    /// @notice Aave v3 Pool integration for streaming unvested capital yield.
    IAavePool public aavePool;

    /// @notice Mapping from underlying asset to corresponding overlying aToken.
    mapping(address => address) public aTokens;

    /// @notice Secondary mapping for token-specific stream records.
    mapping(address => mapping(address => BeneficiaryStream)) public beneficiaryTokenStreams;

    /// @notice Pre-registered backup claim address and veto window per beneficiary.
    /// @dev Strictly beneficiary-controlled: only the beneficiary can register or revoke their backup address.
    mapping(address => BackupClaimConfig) public beneficiaryBackups;

    /// @notice Active backup claim requests per beneficiary during their delay/veto window.
    mapping(address => BackupClaimRequest) public backupClaimRequests;


    /// @notice Standalone Proof-of-Life Consensus primitive.
    /// @dev All heartbeat recording, inactivity checking, and consensus state queries are delegated here.
    IProofOfLifeConsensus public immutable consensus;

    /// @notice Whitelisted ERC-20 tokens accepted for deposits (e.g. USDC, USDT, WBTC, USDG).
    mapping(address => bool) public isWhitelistedToken;

    /// @notice List of all registered whitelisted tokens for snapshot distribution.
    address[] public whitelistedTokens;

    /// @notice Cumulative deposited amount per token (address(0) denotes native ETH).
    mapping(address => uint256) public totalDeposited;

    /// @notice Merkle commitment over all beneficiary allocations (Constraint #3).
    /// @dev Stores ONLY the root — no plaintext percentages or recipient balances in storage.
    bytes32 public allocationRoot;

    /// @notice External Merkle Verifier primitive (Arbitrum Stylus WASM contract on Arbitrum Sepolia / Robinhood Chain).
    /// @dev If configured, verification calls are delegated via standard ABI to the Stylus WASM contract,
    ///      mirroring the composable ProofOfLifeConsensus architecture.
    IMerkleVerifier public merkleVerifier;

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

        if (initialTokens.length > MAX_WHITELISTED_TOKENS) revert MaxTokensExceeded();

        for (uint256 i = 0; i < initialTokens.length; i++) {
            address token = initialTokens[i];
            if (token != address(0) && !isWhitelistedToken[token]) {
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
    function checkUpkeep(bytes calldata)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
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
        if (status) {
            if (!isWhitelistedToken[token]) {
                if (whitelistedTokens.length >= MAX_WHITELISTED_TOKENS) revert MaxTokensExceeded();
                whitelistedTokens.push(token);
                isWhitelistedToken[token] = true;
            }
        } else {
            if (isWhitelistedToken[token]) {
                isWhitelistedToken[token] = false;
                // Clean removal from whitelistedTokens array
                uint256 len = whitelistedTokens.length;
                for (uint256 i = 0; i < len; i++) {
                    if (whitelistedTokens[i] == token) {
                        whitelistedTokens[i] = whitelistedTokens[len - 1];
                        whitelistedTokens.pop();
                        break;
                    }
                }
            }
        }
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

    /// @notice Sets or updates the external Merkle verification primitive (Arbitrum Stylus WASM contract).
    /// @dev Allows swapping in a Stylus WASM contract on Arbitrum Sepolia / Robinhood Chain via standard ABI.
    /// @param _merkleVerifier Address of the deployed IMerkleVerifier contract.
    function setMerkleVerifier(address _merkleVerifier) external onlyOwner {
        merkleVerifier = IMerkleVerifier(_merkleVerifier);
        emit MerkleVerifierUpdated(_merkleVerifier);
    }

    /// @notice Configures Cadence Streams streaming trust parameters before finalization.
    /// @dev For Aave-supported assets, unvested funds are deposited to Aave v3 earning live Arbitrum Sepolia interest.
    ///      For USDG specifically (not on Aave), yield is calculated via this modeled formula pegged to
    ///      USDG's real published Robinhood Earn APY (currently cited publicly around 7.00% / 700 bps).
    /// @param duration Duration in seconds over which remaining inheritance is streamed (0 = immediate lump-sum).
    /// @param initialBps Portion of share unlocked immediately (e.g. 1000 = 10%).
    /// @param yieldBps Annualized yield rate in basis points for modeled streams (e.g. 700 = 7.00% APY).
    function setStreamingConfig(
        uint256 duration,
        uint256 initialBps,
        uint256 yieldBps
    ) external onlyOwner {
        if (duration > 10 * 365 days) revert InvalidStreamingConfig();
        if (initialBps > 10000) revert InvalidStreamingConfig();
        if (yieldBps > 2000) revert InvalidStreamingConfig(); // max 20% APY guard

        IProofOfLifeConsensus.ConsensusState state = consensus.getState(address(this));
        if (state == IProofOfLifeConsensus.ConsensusState.Finalized) {
            revert InvalidState(state);
        }

        streamingDuration = duration;
        initialReleaseBps = initialBps;
        streamingYieldBps = yieldBps;

        emit StreamingConfigUpdated(duration, initialBps, yieldBps);
    }

    /// @notice Configures the Aave v3 Pool contract address for yield generation on unvested streaming capital.
    /// @param _pool The address of the Aave v3 Pool.
    function setAavePool(address _pool) external onlyOwner {
        aavePool = IAavePool(_pool);
        emit AavePoolUpdated(_pool);
    }

    /// @notice Configures the aToken address corresponding to an underlying asset.
    /// @param asset The address of the underlying asset.
    /// @param aToken The address of the corresponding aToken.
    function setAToken(address asset, address aToken) external onlyOwner {
        aTokens[asset] = aToken;
        emit ATokenConfigured(asset, aToken);
    }

    /// @dev Internal helper taking distribution snapshot of vault assets on first claim.
    function _takeDistributionSnapshot() internal {
        isDistributionSnapshotTaken = true;
        distributionSnapshot[address(0)] = address(this).balance;
        uint256 tokensCount = whitelistedTokens.length;
        for (uint256 i = 0; i < tokensCount; i++) {
            address token = whitelistedTokens[i];
            if (isWhitelistedToken[token]) {
                distributionSnapshot[token] = IERC20(token).balanceOf(address(this));
            }
        }
    }

    /// @dev Internal helper distributing proportional whitelisted tokens and depositing unvested amounts into Aave.
    function _distributeTokensAndStream(
        address beneficiary,
        address recipient,
        uint256 shareBps
    ) internal returns (address primaryAsset, uint256 primaryPrincipal) {
        uint256 tokensCount = whitelistedTokens.length;
        for (uint256 i = 0; i < tokensCount; i++) {
            address token = whitelistedTokens[i];
            uint256 totalToken = distributionSnapshot[token];
            if (totalToken == 0) continue;

            uint256 fullTokenShare = (totalToken * shareBps) / 10000;
            if (fullTokenShare == 0) continue;

            if (streamingDuration == 0) {
                _safeTransferCatching(token, recipient, fullTokenShare);
            } else {
                uint256 initialTokenPayout = (fullTokenShare * initialReleaseBps) / 10000;
                uint256 unvestedToken = fullTokenShare > initialTokenPayout
                    ? fullTokenShare - initialTokenPayout
                    : 0;

                if (unvestedToken > 0) {
                    beneficiaryTokenStreams[beneficiary][token] = BeneficiaryStream({
                        totalShareEth: fullTokenShare,
                        claimedEth: initialTokenPayout,
                        initialPayoutEth: initialTokenPayout,
                        startTime: block.timestamp,
                        duration: streamingDuration,
                        isPaused: false,
                        streamRecipient: recipient,
                        streamingAsset: token,
                        streamingPrincipal: unvestedToken,
                        streamingClaimed: 0
                    });

                    if (primaryAsset == address(0)) {
                        primaryAsset = token;
                        primaryPrincipal = unvestedToken;
                    }

                    address aTokenAddr = aTokens[token];
                    if (aTokenAddr == address(0) && address(aavePool) != address(0)) {
                        try aavePool.getReserveAToken(token) returns (address reserveAToken) {
                            aTokenAddr = reserveAToken;
                        } catch {}
                    }

                    if (address(aavePool) != address(0) && aTokenAddr != address(0)) {
                        IERC20(token).forceApprove(address(aavePool), unvestedToken);
                        aavePool.supply(token, unvestedToken, address(this), 0);
                    }
                }

                if (initialTokenPayout > 0) {
                    _safeTransferCatching(token, recipient, initialTokenPayout);
                }
            }
        }
    }

    /// @dev Internal helper executing distribution and stream setup for a claimant.
    function _executeDistribution(
        address beneficiary,
        address recipient,
        uint256 shareBps
    ) internal returns (uint256 payoutEth) {
        uint256 totalEth = distributionSnapshot[address(0)];
        uint256 fullEthShare = (totalEth * shareBps) / 10000;

        if (streamingDuration == 0) {
            payoutEth = fullEthShare;
            _distributeTokensAndStream(beneficiary, recipient, shareBps);
            if (fullEthShare > 0) {
                (bool success, ) = recipient.call{value: fullEthShare}("");
                if (!success) revert TransferFailed();
            }
        } else {
            payoutEth = (fullEthShare * initialReleaseBps) / 10000;

            (address primaryAsset, uint256 primaryPrincipal) = _distributeTokensAndStream(
                beneficiary,
                recipient,
                shareBps
            );

            beneficiaryStreams[beneficiary] = BeneficiaryStream({
                totalShareEth: fullEthShare,
                claimedEth: payoutEth,
                initialPayoutEth: payoutEth,
                startTime: block.timestamp,
                duration: streamingDuration,
                isPaused: false,
                streamRecipient: recipient,
                streamingAsset: primaryAsset,
                streamingPrincipal: primaryPrincipal,
                streamingClaimed: 0
            });

            emit StreamStarted(beneficiary, fullEthShare, payoutEth, streamingDuration);

            if (payoutEth > 0) {
                (bool success, ) = recipient.call{value: payoutEth}("");
                if (!success) revert TransferFailed();
            }
        }
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

        // Compute leaf and verify membership in allocationRoot (via external Stylus verifier if set, or MerkleProofLib)
        if (!_verifyAllocationProof(msg.sender, shareBps, salt, proof)) {
            revert InvalidProof();
        }

        // Snapshot total vault assets on first claim so subsequent claimants receive exact proportions
        if (!isDistributionSnapshotTaken) {
            isDistributionSnapshotTaken = true;
            distributionSnapshot[address(0)] = address(this).balance;
            uint256 tokensCount = whitelistedTokens.length;
            for (uint256 i = 0; i < tokensCount; i++) {
                address token = whitelistedTokens[i];
                if (isWhitelistedToken[token]) {
                    distributionSnapshot[token] = IERC20(token).balanceOf(address(this));
                }
            }
        }


        hasClaimed[msg.sender] = true;

        uint256 payoutEth = _executeDistribution(msg.sender, msg.sender, shareBps);
        emit ClaimExecuted(msg.sender, shareBps, payoutEth);
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
        if (!_verifyAllocationProof(beneficiary, shareBps, salt, proof)) {
            revert InvalidProof();
        }

        // Snapshot total vault assets on first claim
        if (!isDistributionSnapshotTaken) {
            _takeDistributionSnapshot();
        }

        hasClaimed[beneficiary] = true;
        backupClaimRequests[beneficiary].active = false;

        uint256 payoutEth = _executeDistribution(beneficiary, msg.sender, shareBps);
        emit BackupClaimExecuted(beneficiary, msg.sender, shareBps, payoutEth);
    }

    // --- Cadence Streams — Autonomous Streaming Trust & Circuit Breakers ---

    /// @notice Returns current claimable amount, remaining locked, and accrued yield for a beneficiary's primary stream.
    /// @param beneficiary The primary beneficiary address.
    function claimableStreamAmount(address beneficiary)
        public
        view
        returns (
            uint256 claimableEth,
            uint256 totalVestedEth,
            uint256 remainingLockedEth,
            uint256 accruedYieldEth
        )
    {
        BeneficiaryStream memory stream = beneficiaryStreams[beneficiary];
        if (stream.totalShareEth > 0) {
            return claimableStreamAmount(beneficiary, address(0));
        } else if (stream.streamingAsset != address(0)) {
            return claimableStreamAmount(beneficiary, stream.streamingAsset);
        } else {
            return (0, 0, 0, 0);
        }
    }

    /// @notice Returns current claimable amount, remaining locked, and accrued yield for a beneficiary's specific asset stream.
    /// @param beneficiary The primary beneficiary address.
    /// @param asset The asset address (address(0) for native ETH, or ERC20 token address).
    function claimableStreamAmount(address beneficiary, address asset)
        public
        view
        returns (
            uint256 claimableAmount,
            uint256 totalVestedAmount,
            uint256 remainingLockedAmount,
            uint256 accruedYieldAmount
        )
    {
        BeneficiaryStream memory stream = (asset == address(0))
            ? beneficiaryStreams[beneficiary]
            : beneficiaryTokenStreams[beneficiary][asset];

        if (stream.isPaused) {
            return (0, 0, 0, 0);
        }

        if (asset != address(0) && address(aavePool) != address(0) && aTokens[asset] != address(0)) {
            // Aave v3 dynamic yield accounting path:
            // Read aToken.balanceOf(address(this)) to determine current principal-plus-interest total for vesting math
            if (stream.streamingPrincipal == 0) return (0, 0, 0, 0);

            uint256 elapsed = block.timestamp > stream.startTime ? block.timestamp - stream.startTime : 0;
            uint256 effectiveElapsed = elapsed > stream.duration ? stream.duration : elapsed;

            address aToken = aTokens[asset];
            uint256 aTokenBal = IAToken(aToken).balanceOf(address(this));
            uint256 totalValue = aTokenBal + stream.streamingClaimed;

            totalVestedAmount = stream.duration > 0
                ? (totalValue * effectiveElapsed) / stream.duration
                : totalValue;

            claimableAmount = totalVestedAmount > stream.streamingClaimed
                ? totalVestedAmount - stream.streamingClaimed
                : 0;

            if (claimableAmount > aTokenBal) {
                claimableAmount = aTokenBal;
            }

            remainingLockedAmount = totalValue > totalVestedAmount ? totalValue - totalVestedAmount : 0;
            accruedYieldAmount = totalValue > stream.streamingPrincipal ? totalValue - stream.streamingPrincipal : 0;
        } else {
            // Standard / Modeled yield calculation (native ETH or USDG / non-Aave assets).
            // Per Day 11 outcome, USDG-denominated vaults use this modeled rate pegged to USDG's
            // real published Robinhood Earn APY (currently cited publicly around 7.00% / 700 bps).
            if (stream.totalShareEth == 0) return (0, 0, 0, 0);

            uint256 elapsed = block.timestamp > stream.startTime ? block.timestamp - stream.startTime : 0;
            uint256 effectiveElapsed = elapsed > stream.duration ? stream.duration : elapsed;

            uint256 streamablePrincipal = stream.totalShareEth > stream.initialPayoutEth
                ? stream.totalShareEth - stream.initialPayoutEth
                : 0;

            uint256 vestedStream = stream.duration > 0
                ? (streamablePrincipal * effectiveElapsed) / stream.duration
                : streamablePrincipal;

            totalVestedAmount = stream.initialPayoutEth + vestedStream;
            uint256 baseClaimable = totalVestedAmount > stream.claimedEth ? totalVestedAmount - stream.claimedEth : 0;

            remainingLockedAmount = stream.totalShareEth > totalVestedAmount ? stream.totalShareEth - totalVestedAmount : 0;

            if (streamingYieldBps > 0 && remainingLockedAmount > 0 && elapsed > 0) {
                accruedYieldAmount = (remainingLockedAmount * streamingYieldBps * effectiveElapsed) / (10000 * 365 days);
            }

            claimableAmount = baseClaimable + accruedYieldAmount;
        }
    }

    /// @notice Claims accrued per-second streaming allowance for a beneficiary's primary stream.
    /// @param beneficiary The beneficiary whose stream is being claimed.
    function claimStream(address beneficiary) external nonReentrant {
        BeneficiaryStream storage stream = beneficiaryStreams[beneficiary];
        if (stream.totalShareEth > 0) {
            _claimStreamForAsset(beneficiary, address(0));
        } else if (stream.streamingAsset != address(0)) {
            _claimStreamForAsset(beneficiary, stream.streamingAsset);
        } else {
            revert StreamNotActive();
        }
    }

    /// @notice Claims accrued per-second streaming allowance for a beneficiary's specific asset stream.
    /// @param beneficiary The beneficiary whose stream is being claimed.
    /// @param asset The asset address being claimed.
    function claimStream(address beneficiary, address asset) external nonReentrant {
        _claimStreamForAsset(beneficiary, asset);
    }

    function _claimStreamForAsset(address beneficiary, address asset) internal {
        BeneficiaryStream storage stream = (asset == address(0))
            ? beneficiaryStreams[beneficiary]
            : beneficiaryTokenStreams[beneficiary][asset];

        if (asset != address(0) && address(aavePool) != address(0) && aTokens[asset] != address(0)) {
            if (stream.streamingPrincipal == 0) revert StreamNotActive();
        } else {
            if (stream.totalShareEth == 0) revert StreamNotActive();
        }

        if (stream.isPaused) revert StreamIsPaused();

        address recipient = stream.streamRecipient;
        if (msg.sender != recipient && msg.sender != beneficiary) {
            revert OnlyBeneficiaryOrRecipient();
        }

        (
            uint256 claimableAmount,
            uint256 totalVestedAmount,
            ,
            uint256 accruedYieldAmount
        ) = claimableStreamAmount(beneficiary, asset);

        if (claimableAmount == 0) revert NothingToClaim();

        if (asset != address(0) && address(aavePool) != address(0) && aTokens[asset] != address(0)) {
            // Aave v3 streaming withdrawal path:
            stream.streamingClaimed += claimableAmount;

            // Call pool.withdraw(asset, claimableAmount, recipient) to send directly from Aave
            uint256 withdrawn = aavePool.withdraw(asset, claimableAmount, recipient);

            emit StreamClaimed(beneficiary, recipient, withdrawn, accruedYieldAmount);
        } else {
            // Modeled / standard streaming path
            stream.claimedEth = totalVestedAmount > stream.totalShareEth ? stream.totalShareEth : totalVestedAmount;

            if (asset == address(0)) {
                uint256 payout = claimableAmount > address(this).balance ? address(this).balance : claimableAmount;
                if (payout > 0) {
                    (bool success, ) = recipient.call{value: payout}("");
                    if (!success) revert TransferFailed();
                }
                emit StreamClaimed(beneficiary, recipient, payout, accruedYieldAmount);
            } else {
                _safeTransferCatching(asset, recipient, claimableAmount);
                emit StreamClaimed(beneficiary, recipient, claimableAmount, accruedYieldAmount);
            }
        }
    }

    /// @notice Emergency pauses an active stream. Callable by beneficiary or current recipient.
    function pauseStream(address beneficiary) external {
        BeneficiaryStream storage stream = beneficiaryStreams[beneficiary];
        if (stream.totalShareEth == 0 && stream.streamingPrincipal == 0) revert StreamNotActive();
        if (msg.sender != beneficiary && msg.sender != stream.streamRecipient) {
            revert OnlyBeneficiaryOrRecipient();
        }
        stream.isPaused = true;
        if (stream.streamingAsset != address(0)) {
            beneficiaryTokenStreams[beneficiary][stream.streamingAsset].isPaused = true;
        }
        emit StreamPaused(beneficiary, msg.sender);
    }

    /// @notice Guardian emergency circuit breaker: pauses a stream upon detecting drainer activity.
    /// @param beneficiary The beneficiary stream to pause.
    /// @param guardianProof Merkle proof verifying caller is a consensus guardian for this vault.
    function pauseStreamWithGuardian(address beneficiary, bytes32[] calldata guardianProof) external {
        _pauseStreamWithGuardian(beneficiary, msg.sender, guardianProof);
    }

    /// @notice Guardian emergency circuit breaker: pauses a stream via registered backup guardian.
    /// @dev Allows a registered backup to act if the original guardian is unreachable, subject to waiting-period rules.
    /// @param beneficiary The beneficiary stream to pause.
    /// @param originalGuardian The guardian slot the caller is backing up.
    /// @param guardianProof Merkle proof verifying the original guardian is in the guardian tree.
    function pauseStreamWithGuardian(
        address beneficiary,
        address originalGuardian,
        bytes32[] calldata guardianProof
    ) external {
        _pauseStreamWithGuardian(beneficiary, originalGuardian, guardianProof);
    }

    /// @dev Internal stream pausing reusing GuardianRegistry's verifyGuardianOrBackup eligibility check.
    function _pauseStreamWithGuardian(
        address beneficiary,
        address originalGuardian,
        bytes32[] calldata guardianProof
    ) internal {
        BeneficiaryStream storage stream = beneficiaryStreams[beneficiary];
        if (stream.totalShareEth == 0 && stream.streamingPrincipal == 0) revert StreamNotActive();

        IGuardianRegistry guardianReg = consensus.guardianRegistry();
        bool isEligible = guardianReg.verifyGuardianOrBackup(
            address(this),
            msg.sender,
            originalGuardian,
            guardianProof
        );
        if (!isEligible) revert UnauthorizedGuardian();

        stream.isPaused = true;
        if (stream.streamingAsset != address(0)) {
            beneficiaryTokenStreams[beneficiary][stream.streamingAsset].isPaused = true;
        }
        emit StreamPaused(beneficiary, msg.sender);
    }

    /// @notice Resumes a paused stream. Callable by beneficiary or recipient.
    function resumeStream(address beneficiary) external {
        BeneficiaryStream storage stream = beneficiaryStreams[beneficiary];
        if (stream.totalShareEth == 0 && stream.streamingPrincipal == 0) revert StreamNotActive();
        if (msg.sender != beneficiary && msg.sender != stream.streamRecipient) {
            revert OnlyBeneficiaryOrRecipient();
        }
        stream.isPaused = false;
        if (stream.streamingAsset != address(0)) {
            beneficiaryTokenStreams[beneficiary][stream.streamingAsset].isPaused = false;
        }
        emit StreamResumed(beneficiary, msg.sender);
    }

    /// @notice Reroutes future streaming payouts to a safe address if the primary wallet was compromised.
    /// @dev Callable by beneficiary OR by the pre-registered backup claim address.
    function redirectStream(address beneficiary, address newRecipient) external {
        if (newRecipient == address(0)) revert ZeroAddress();
        BeneficiaryStream storage stream = beneficiaryStreams[beneficiary];
        if (stream.totalShareEth == 0 && stream.streamingPrincipal == 0) revert StreamNotActive();

        address backup = beneficiaryBackups[beneficiary].backupAddress;
        if (msg.sender != beneficiary && msg.sender != backup && msg.sender != stream.streamRecipient) {
            revert OnlyBeneficiaryOrBackup();
        }

        address oldRecipient = stream.streamRecipient;
        stream.streamRecipient = newRecipient;
        if (stream.streamingAsset != address(0)) {
            beneficiaryTokenStreams[beneficiary][stream.streamingAsset].streamRecipient = newRecipient;
        }
        emit StreamRedirected(beneficiary, oldRecipient, newRecipient);
    }

    /// @notice Returns full stream details for a beneficiary.
    function getBeneficiaryStream(address beneficiary)
        external
        view
        returns (BeneficiaryStream memory)
    {
        return beneficiaryStreams[beneficiary];
    }

    /// @notice Attempts ERC-20 token transfer safely without reverting the whole transaction on failure.
    function _safeTransferCatching(address token, address to, uint256 amount) internal {
        (bool success, bytes memory returndata) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        if (!success || (returndata.length != 0 && !abi.decode(returndata, (bool)))) {
            emit TokenTransferFailed(token, to, amount);
        }
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

    /// @notice Verifies beneficiary allocation proof using either external Stylus verifier or MerkleProofLib.
    /// @param beneficiary Beneficiary address to verify.
    /// @param shareBps Basis points share.
    /// @param salt Secret blinding salt.
    /// @param proof Merkle proof siblings.
    function _verifyAllocationProof(
        address beneficiary,
        uint256 shareBps,
        bytes32 salt,
        bytes32[] calldata proof
    ) internal view returns (bool) {
        if (address(merkleVerifier) != address(0)) {
            bytes32 leaf = merkleVerifier.computeAllocationLeaf(beneficiary, shareBps, salt);
            return merkleVerifier.verify(proof, allocationRoot, leaf);
        } else {
            bytes32 leaf = MerkleProofLib.computeAllocationLeaf(beneficiary, shareBps, salt);
            return MerkleProofLib.verify(proof, allocationRoot, leaf);
        }
    }

    // --- Secret Box Functions ---

    /// @notice Anchors an encrypted off-chain legacy secret box for a beneficiary.
    /// @param beneficiary The designated beneficiary address.
    /// @param ipfsCid The IPFS CID or Arweave URI of the encrypted payload blob.
    /// @param encryptedKeyCipher The stringified ECIES ciphertext containing the wrapped AES key.
    function setSecretBox(
        address beneficiary,
        string calldata ipfsCid,
        string calldata encryptedKeyCipher
    ) external onlyOwner {
        if (beneficiary == address(0)) revert ZeroAddress();
        require(bytes(ipfsCid).length > 0, "Invalid CID");
        require(bytes(encryptedKeyCipher).length > 0, "Invalid cipher");

        beneficiarySecretBoxes[beneficiary] = SecretBoxAnchor(
            ipfsCid,
            encryptedKeyCipher,
            uint64(block.timestamp)
        );

        emit SecretBoxAnchored(
            beneficiary,
            ipfsCid,
            encryptedKeyCipher,
            uint64(block.timestamp)
        );
    }

    /// @notice Batch anchors encrypted secret boxes for multiple beneficiaries.
    /// @param secretBoxes Array of SecretBoxAnchorInit structs.
    function setSecretBoxesBatch(SecretBoxAnchorInit[] calldata secretBoxes) external onlyOwner {
        for (uint256 i = 0; i < secretBoxes.length; i++) {
            address beneficiary = secretBoxes[i].beneficiary;
            string memory ipfsCid = secretBoxes[i].ipfsCid;
            string memory encryptedKeyCipher = secretBoxes[i].encryptedKeyCipher;

            if (beneficiary == address(0)) revert ZeroAddress();
            require(bytes(ipfsCid).length > 0, "Invalid CID");
            require(bytes(encryptedKeyCipher).length > 0, "Invalid cipher");

            beneficiarySecretBoxes[beneficiary] = SecretBoxAnchor(
                ipfsCid,
                encryptedKeyCipher,
                uint64(block.timestamp)
            );

            emit SecretBoxAnchored(
                beneficiary,
                ipfsCid,
                encryptedKeyCipher,
                uint64(block.timestamp)
            );
        }
    }

    /// @notice Returns the anchored secret box metadata for a beneficiary.
    function getSecretBox(address beneficiary)
        external
        view
        returns (
            string memory ipfsCid,
            string memory encryptedKeyCipher,
            uint64 timestamp
        )
    {
        SecretBoxAnchor storage box = beneficiarySecretBoxes[beneficiary];
        return (box.ipfsCid, box.encryptedKeyCipher, box.timestamp);
    }
}

