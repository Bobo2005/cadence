// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {BeneficiarySmartAccount, BeneficiaryAccountFactory} from "../src/BeneficiarySmartAccount.sol";
import {IBeneficiarySmartAccount} from "../src/interfaces/IBeneficiarySmartAccount.sol";
import {IProofOfLifeConsensus} from "../src/interfaces/IProofOfLifeConsensus.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {Hashes} from "@openzeppelin/contracts/utils/cryptography/Hashes.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

/// @title BeneficiaryBackupClaimTest
/// @notice Comprehensive tests for the Beneficiary Backup-Claim Address Feature:
///         1. Beneficiary-only control (Non-custodial guard: vault owner and guardians have zero redirect power).
///         2. Delay/veto window lifecycle mirroring Contestable Claim in InheritanceVault.sol.
///         3. Account-level backup activation in BeneficiarySmartAccount.sol.
contract BeneficiaryBackupClaimTest is Test {
    InheritanceVault public vault;
    ProofOfLifeConsensus public consensus;
    GuardianRegistry public guardianRegistry;
    BeneficiaryAccountFactory public factory;
    MockERC20 public usdc;

    address public vaultOwner = address(0x1111);
    address public beneficiary = address(0x2222);
    address public backupAddress = address(0x3333);
    address public stranger = address(0x9999);
    address public entryPoint = address(0xE001);

    // Vault guardians
    address public guardianA = address(0x6001);
    address public guardianB = address(0x6002);
    address public guardianC = address(0x6003);

    uint256 public checkInInterval = 30 days;
    uint256 public contestWindow = 72 hours;
    uint256 public backupVetoWindow = 72 hours;

    // Allocation configuration
    uint256 public beneficiaryShareBps = 10000; // 100%
    bytes32 public beneficiarySalt = keccak256("beneficiary-secret-salt");
    bytes32 public allocationRoot;
    bytes32[] public merkleProof;

    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return Hashes.commutativeKeccak256(a, b);
    }

    function setUp() public {
        vm.warp(1_000_000);

        // 1. Deploy dependencies
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));
        factory = new BeneficiaryAccountFactory(entryPoint);

        usdc = new MockERC20("USD Coin", "USDC", 6);
        address[] memory tokens = new address[](1);
        tokens[0] = address(usdc);

        // 2. Deploy Vault
        vault = new InheritanceVault(vaultOwner, checkInInterval, tokens, address(consensus));

        // 3. Configure Vault Guardians (2-of-3)
        bytes32 leafA = MerkleProofLib.computeGuardianLeaf(guardianA);
        bytes32 leafB = MerkleProofLib.computeGuardianLeaf(guardianB);
        bytes32 leafC = MerkleProofLib.computeGuardianLeaf(guardianC);
        bytes32 rootAB = _hashPair(leafA, leafB);
        bytes32 guardianRoot = _hashPair(rootAB, leafC);

        vm.prank(vaultOwner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 2, 3);
        vm.prank(vaultOwner);
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));

        // 4. Set Allocation Root for Beneficiary
        bytes32 benLeaf = MerkleProofLib.computeAllocationLeaf(beneficiary, beneficiaryShareBps, beneficiarySalt);
        allocationRoot = benLeaf; // single-leaf tree root is the leaf itself
        merkleProof = new bytes32[](0);

        vm.prank(vaultOwner);
        vault.setAllocationRoot(allocationRoot);

        // 5. Fund Vault: 5 ETH + 10,000 USDC
        vm.deal(address(vault), 5 ether);
        usdc.mint(address(vault), 10_000 * 1e6);
    }

    // Helper: Transition vault to Finalized state
    function _transitionVaultToFinalized() internal {
        // Expire timeout
        vm.warp(block.timestamp + checkInInterval + 1);

        // Submit 2 guardian attestations
        bytes32 leafA = MerkleProofLib.computeGuardianLeaf(guardianA);
        bytes32 leafB = MerkleProofLib.computeGuardianLeaf(guardianB);
        bytes32 leafC = MerkleProofLib.computeGuardianLeaf(guardianC);

        bytes32[] memory proofA = new bytes32[](2);
        proofA[0] = leafB;
        proofA[1] = leafC;

        bytes32[] memory proofB = new bytes32[](2);
        proofB[0] = leafA;
        proofB[1] = leafC;

        vm.prank(guardianA);
        guardianRegistry.attest(address(vault), proofA);

        vm.prank(guardianB);
        guardianRegistry.attest(address(vault), proofB);

        // Trigger ClaimPending transition
        consensus.triggerClaimPending(address(vault));
        assertEq(uint256(vault.getConsensusState()), uint256(IProofOfLifeConsensus.ConsensusState.ClaimPending));

        // Warp past contest window without cancel
        vm.warp(block.timestamp + contestWindow + 1);
        consensus.finalizeContest(address(vault));
        assertEq(uint256(vault.getConsensusState()), uint256(IProofOfLifeConsensus.ConsensusState.Finalized));
    }

    // =========================================================================
    // 1. Beneficiary-Only Control & Non-Custodial Invariant
    // =========================================================================

    function test_beneficiaryRegistration_success() public {
        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        (address registeredBackup, uint256 registeredWindow) = vault.getBackupConfig(beneficiary);
        assertEq(registeredBackup, backupAddress);
        assertEq(registeredWindow, backupVetoWindow);
    }

    function test_beneficiaryRegistration_selfBackup_reverts() public {
        vm.prank(beneficiary);
        vm.expectRevert(InheritanceVault.SelfBackupNotAllowed.selector);
        vault.registerBackupClaimAddress(beneficiary, backupVetoWindow);
    }

    function test_beneficiaryRegistration_zeroAddress_reverts() public {
        vm.prank(beneficiary);
        vm.expectRevert(InheritanceVault.ZeroAddress.selector);
        vault.registerBackupClaimAddress(address(0), backupVetoWindow);
    }

    function test_beneficiaryRegistration_zeroVetoWindow_reverts() public {
        vm.prank(beneficiary);
        vm.expectRevert(InheritanceVault.VetoWindowZero.selector);
        vault.registerBackupClaimAddress(backupAddress, 0);
    }

    function test_vaultOwnerCannotRedirectBeneficiaryClaim() public {
        // Beneficiary registers backupAddress
        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        // Vault owner tries to overwrite or alter beneficiary's config:
        // Calling registerBackupClaimAddress as vaultOwner ONLY configures the vaultOwner's personal backup!
        vm.prank(vaultOwner);
        vault.registerBackupClaimAddress(stranger, 12 hours);

        // Beneficiary's config is completely untouched and unaffected
        (address beneficiaryBackup, uint256 beneficiaryWindow) = vault.getBackupConfig(beneficiary);
        assertEq(beneficiaryBackup, backupAddress);
        assertEq(beneficiaryWindow, backupVetoWindow);

        // Vault owner's config is separate
        (address ownerBackup, ) = vault.getBackupConfig(vaultOwner);
        assertEq(ownerBackup, stranger);
    }

    /// @notice Proves that vault owner calling revokeBackupClaimAddress has zero effect on beneficiary
    function test_vaultOwnerCannotRevokeBeneficiaryClaim() public {
        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        // Vault owner calls revokeBackupClaimAddress:
        // Reverts because owner has no backup registered, but even if owner had one,
        // it cannot touch beneficiary's mapping
        vm.prank(vaultOwner);
        vm.expectRevert(InheritanceVault.NotBackupAddress.selector);
        vault.revokeBackupClaimAddress();

        // Beneficiary's config is untouched
        (address beneficiaryBackup, uint256 beneficiaryWindow) = vault.getBackupConfig(beneficiary);
        assertEq(beneficiaryBackup, backupAddress);
        assertEq(beneficiaryWindow, backupVetoWindow);
    }

    /// @notice Proves vault owner cannot initiate a backup claim for a beneficiary
    function test_vaultOwnerCannotInitiateBeneficiaryBackupClaim() public {
        _transitionVaultToFinalized();

        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        vm.prank(vaultOwner);
        vm.expectRevert(InheritanceVault.NotBackupAddress.selector);
        vault.initiateBackupClaim(beneficiary);
    }

    /// @notice Proves consensus guardians cannot initiate a backup claim for a beneficiary
    function test_guardiansCannotInitiateBeneficiaryBackupClaim() public {
        _transitionVaultToFinalized();

        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        vm.prank(guardianA);
        vm.expectRevert(InheritanceVault.NotBackupAddress.selector);
        vault.initiateBackupClaim(beneficiary);
    }

    /// @notice Proves vault owner cannot veto a beneficiary's backup claim
    function test_vaultOwnerCannotVetoBeneficiaryBackupClaim() public {
        _transitionVaultToFinalized();

        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        vm.prank(backupAddress);
        vault.initiateBackupClaim(beneficiary);

        vm.prank(vaultOwner);
        vm.expectRevert(InheritanceVault.Unauthorized.selector);
        vault.vetoBackupClaim(beneficiary);

        (, bool active) = vault.getBackupClaimRequest(beneficiary);
        assertTrue(active);
    }

    /// @notice Proves consensus guardians cannot veto a beneficiary's backup claim
    function test_guardiansCannotVetoBeneficiaryBackupClaim() public {
        _transitionVaultToFinalized();

        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        vm.prank(backupAddress);
        vault.initiateBackupClaim(beneficiary);

        vm.prank(guardianA);
        vm.expectRevert(InheritanceVault.Unauthorized.selector);
        vault.vetoBackupClaim(beneficiary);

        (, bool active) = vault.getBackupClaimRequest(beneficiary);
        assertTrue(active);
    }

    function test_beneficiaryRevocation_success() public {
        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        vm.prank(beneficiary);
        vault.revokeBackupClaimAddress();

        (address registeredBackup, uint256 registeredWindow) = vault.getBackupConfig(beneficiary);
        assertEq(registeredBackup, address(0));
        assertEq(registeredWindow, 0);
    }

    function test_beneficiaryRevocation_whenUnset_reverts() public {
        vm.prank(beneficiary);
        vm.expectRevert(InheritanceVault.NotBackupAddress.selector);
        vault.revokeBackupClaimAddress();
    }

    // =========================================================================
    // 2. Delay / Veto Window Lifecycle in InheritanceVault
    // =========================================================================

    function test_backupClaim_fullLifecycle_success() public {
        _transitionVaultToFinalized();

        // 1. Beneficiary pre-registers backup address
        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        // 2. Backup initiates claim
        vm.prank(backupAddress);
        vault.initiateBackupClaim(beneficiary);

        (uint256 deadline, bool active) = vault.getBackupClaimRequest(beneficiary);
        assertTrue(active);
        assertEq(deadline, block.timestamp + backupVetoWindow);

        // 3. Backup attempts claim before veto window elapses -> reverts
        vm.prank(backupAddress);
        vm.expectRevert(
            abi.encodeWithSelector(
                InheritanceVault.VetoWindowNotElapsed.selector,
                block.timestamp,
                deadline
            )
        );
        vault.claimAsBackup(beneficiary, beneficiaryShareBps, beneficiarySalt, merkleProof);

        // 4. Warp past veto window
        vm.warp(deadline + 1);

        uint256 backupEthBefore = backupAddress.balance;
        uint256 backupUsdcBefore = usdc.balanceOf(backupAddress);

        // 5. Backup finalizes claim
        vm.prank(backupAddress);
        vault.claimAsBackup(beneficiary, beneficiaryShareBps, beneficiarySalt, merkleProof);

        // Asserts
        assertEq(backupAddress.balance - backupEthBefore, 5 ether, "Backup receives full 5 ETH");
        assertEq(usdc.balanceOf(backupAddress) - backupUsdcBefore, 10_000 * 1e6, "Backup receives 10,000 USDC");
        assertTrue(vault.hasClaimed(beneficiary), "Beneficiary marked as claimed");

        (, bool activeAfter) = vault.getBackupClaimRequest(beneficiary);
        assertFalse(activeAfter);
    }

    function test_backupClaim_vetoByBeneficiary_cancelsRequest() public {
        _transitionVaultToFinalized();

        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        vm.prank(backupAddress);
        vault.initiateBackupClaim(beneficiary);

        // Primary beneficiary vetoes
        vm.prank(beneficiary);
        vault.vetoBackupClaim(beneficiary);

        (, bool active) = vault.getBackupClaimRequest(beneficiary);
        assertFalse(active, "Claim request must be inactive after veto");

        // Backup cannot claim even after warp
        vm.warp(block.timestamp + backupVetoWindow + 10);
        vm.prank(backupAddress);
        vm.expectRevert(InheritanceVault.NoActiveBackupClaim.selector);
        vault.claimAsBackup(beneficiary, beneficiaryShareBps, beneficiarySalt, merkleProof);
    }

    function test_backupClaim_vetoByStranger_reverts() public {
        _transitionVaultToFinalized();

        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        vm.prank(backupAddress);
        vault.initiateBackupClaim(beneficiary);

        // Stranger tries to veto
        vm.prank(stranger);
        vm.expectRevert(InheritanceVault.Unauthorized.selector);
        vault.vetoBackupClaim(beneficiary);
    }

    function test_backupClaim_strangerCannotInitiate() public {
        _transitionVaultToFinalized();

        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        vm.prank(stranger);
        vm.expectRevert(InheritanceVault.NotBackupAddress.selector);
        vault.initiateBackupClaim(beneficiary);
    }

    function test_backupClaim_beforeFinalized_reverts() public {
        // Vault is Active
        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        vm.prank(backupAddress);
        vm.expectRevert(
            abi.encodeWithSelector(
                InheritanceVault.VaultNotFinalized.selector,
                IProofOfLifeConsensus.ConsensusState.Active
            )
        );
        vault.initiateBackupClaim(beneficiary);
    }

    function test_backupClaim_alreadyClaimed_reverts() public {
        _transitionVaultToFinalized();

        // Primary beneficiary claims first
        vm.prank(beneficiary);
        vault.claim(beneficiaryShareBps, beneficiarySalt, merkleProof);

        // Register backup
        vm.prank(beneficiary);
        vault.registerBackupClaimAddress(backupAddress, backupVetoWindow);

        // Backup tries to initiate claim
        vm.prank(backupAddress);
        vm.expectRevert(abi.encodeWithSelector(InheritanceVault.AlreadyClaimed.selector, beneficiary));
        vault.initiateBackupClaim(beneficiary);
    }

    // =========================================================================
    // 3. BeneficiarySmartAccount Backup Activation Lifecycle
    // =========================================================================

    function test_smartAccount_backupActivation_fullLifecycle_success() public {
        address[] memory recoveryGuardians = new address[](2);
        recoveryGuardians[0] = guardianA;
        recoveryGuardians[1] = guardianB;

        address accountAddr = factory.createAccount(beneficiary, recoveryGuardians, 2, 123);
        BeneficiarySmartAccount smartAccount = BeneficiarySmartAccount(payable(accountAddr));

        // 1. Owner sets backup address
        vm.prank(beneficiary);
        smartAccount.setBackupAddress(backupAddress, 72 hours);

        assertEq(smartAccount.backupAddress(), backupAddress);
        assertEq(smartAccount.backupVetoWindow(), 72 hours);

        // 2. Backup initiates activation
        vm.prank(backupAddress);
        smartAccount.initiateBackupActivation();

        (uint256 deadline, bool active) = smartAccount.getBackupActivation();
        assertTrue(active);
        assertEq(deadline, block.timestamp + 72 hours);

        // 3. Premature finalization reverts
        vm.prank(backupAddress);
        vm.expectRevert(
            abi.encodeWithSelector(
                IBeneficiarySmartAccount.VetoWindowNotElapsed.selector,
                block.timestamp,
                deadline
            )
        );
        smartAccount.finalizeBackupActivation();

        // 4. Warp past veto window
        vm.warp(deadline + 1);

        // 5. Finalize activation
        vm.prank(backupAddress);
        smartAccount.finalizeBackupActivation();

        assertEq(smartAccount.owner(), backupAddress, "Backup address must become the owner");

        // 6. Backup address can execute transactions
        vm.deal(accountAddr, 1 ether);
        address recipient = address(0x8888);
        vm.prank(backupAddress);
        smartAccount.execute(recipient, 0.5 ether, "");
        assertEq(recipient.balance, 0.5 ether);

        // Previous owner is locked out
        vm.prank(beneficiary);
        vm.expectRevert(IBeneficiarySmartAccount.Unauthorized.selector);
        smartAccount.execute(recipient, 0.1 ether, "");
    }

    function test_smartAccount_backupActivation_vetoByOwner_cancels() public {
        address[] memory recoveryGuardians = new address[](2);
        recoveryGuardians[0] = guardianA;
        recoveryGuardians[1] = guardianB;

        address accountAddr = factory.createAccount(beneficiary, recoveryGuardians, 2, 456);
        BeneficiarySmartAccount smartAccount = BeneficiarySmartAccount(payable(accountAddr));

        vm.prank(beneficiary);
        smartAccount.setBackupAddress(backupAddress, 72 hours);

        vm.prank(backupAddress);
        smartAccount.initiateBackupActivation();

        // Owner vetoes
        vm.prank(beneficiary);
        smartAccount.vetoBackupActivation();

        (, bool active) = smartAccount.getBackupActivation();
        assertFalse(active);

        // Backup cannot finalize
        vm.warp(block.timestamp + 100 hours);
        vm.prank(backupAddress);
        vm.expectRevert(IBeneficiarySmartAccount.NoActiveBackupActivation.selector);
        smartAccount.finalizeBackupActivation();
    }

    function test_smartAccount_backupActivation_strangerCannotInitiate() public {
        address[] memory recoveryGuardians = new address[](2);
        recoveryGuardians[0] = guardianA;
        recoveryGuardians[1] = guardianB;

        address accountAddr = factory.createAccount(beneficiary, recoveryGuardians, 2, 789);
        BeneficiarySmartAccount smartAccount = BeneficiarySmartAccount(payable(accountAddr));

        vm.prank(beneficiary);
        smartAccount.setBackupAddress(backupAddress, 72 hours);

        // Stranger tries to initiate
        vm.prank(stranger);
        vm.expectRevert(IBeneficiarySmartAccount.NotBackupAddress.selector);
        smartAccount.initiateBackupActivation();
    }

    /// @notice Proves vault owner cannot modify or revoke beneficiary's smart account backup settings
    function test_smartAccount_vaultOwnerCannotModifyBackup() public {
        address[] memory recoveryGuardians = new address[](2);
        recoveryGuardians[0] = guardianA;
        recoveryGuardians[1] = guardianB;

        address accountAddr = factory.createAccount(beneficiary, recoveryGuardians, 2, 999);
        BeneficiarySmartAccount smartAccount = BeneficiarySmartAccount(payable(accountAddr));

        // Beneficiary sets backup
        vm.prank(beneficiary);
        smartAccount.setBackupAddress(backupAddress, 72 hours);

        // Vault owner tries to overwrite backup on beneficiary's account -> reverts OnlyOwner
        vm.prank(vaultOwner);
        vm.expectRevert(IBeneficiarySmartAccount.OnlyOwner.selector);
        smartAccount.setBackupAddress(stranger, 24 hours);

        // Beneficiary config unchanged
        assertEq(smartAccount.backupAddress(), backupAddress);
        assertEq(smartAccount.backupVetoWindow(), 72 hours);

        // Vault owner tries to revoke backup -> reverts OnlyOwner
        vm.prank(vaultOwner);
        vm.expectRevert(IBeneficiarySmartAccount.OnlyOwner.selector);
        smartAccount.revokeBackupAddress();

        assertEq(smartAccount.backupAddress(), backupAddress);
    }

    /// @notice Proves consensus guardians cannot modify beneficiary's smart account backup settings
    function test_smartAccount_guardiansCannotModifyBackup() public {
        address[] memory recoveryGuardians = new address[](2);
        recoveryGuardians[0] = guardianA;
        recoveryGuardians[1] = guardianB;

        address accountAddr = factory.createAccount(beneficiary, recoveryGuardians, 2, 1000);
        BeneficiarySmartAccount smartAccount = BeneficiarySmartAccount(payable(accountAddr));

        // Consensus guardian tries to set backup address -> reverts OnlyOwner
        vm.prank(guardianA);
        vm.expectRevert(IBeneficiarySmartAccount.OnlyOwner.selector);
        smartAccount.setBackupAddress(stranger, 24 hours);
    }
}

