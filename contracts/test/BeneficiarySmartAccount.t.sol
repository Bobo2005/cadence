// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PackedUserOperation} from "@openzeppelin/contracts/interfaces/IERC4337.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {
    BeneficiarySmartAccount,
    BeneficiaryAccountFactory
} from "../src/BeneficiarySmartAccount.sol";
import {
    IBeneficiarySmartAccount,
    IBeneficiaryAccountFactory
} from "../src/interfaces/IBeneficiarySmartAccount.sol";

/// @title BeneficiarySmartAccountTest
/// @notice Comprehensive tests for BeneficiarySmartAccount and BeneficiaryAccountFactory:
///         1. Account provisioning with mandatory nominated recovery guardians.
///         2. ERC-4337 UserOp validation and owner execution.
///         3. Guardian-assisted social recovery (multi-step and signature-based).
///         4. Rejection of recovery attempts from non-nominated addresses.
contract BeneficiarySmartAccountTest is Test {
    BeneficiaryAccountFactory public factory;
    address public entryPoint = address(0xE001);

    // Beneficiary owner keypair
    uint256 public ownerPrivateKey = 0xA11CE;
    address public beneficiaryOwner;

    // New owner keypair (for recovery)
    uint256 public newOwnerPrivateKey = 0xB0B;
    address public newBeneficiaryOwner;

    // Nominated recovery guardians (independent of vault guardians)
    uint256 public guardian1Key = 0x601;
    address public guardian1;

    uint256 public guardian2Key = 0x602;
    address public guardian2;

    uint256 public guardian3Key = 0x603;
    address public guardian3;

    // Stranger (non-nominated)
    uint256 public strangerKey = 0x999;
    address public stranger;

    address[] public initialGuardians;
    uint256 public recoveryThreshold = 2; // 2-of-3 threshold

    function setUp() public {
        beneficiaryOwner = vm.addr(ownerPrivateKey);
        newBeneficiaryOwner = vm.addr(newOwnerPrivateKey);
        guardian1 = vm.addr(guardian1Key);
        guardian2 = vm.addr(guardian2Key);
        guardian3 = vm.addr(guardian3Key);
        stranger = vm.addr(strangerKey);

        initialGuardians = new address[](3);
        initialGuardians[0] = guardian1;
        initialGuardians[1] = guardian2;
        initialGuardians[2] = guardian3;

        factory = new BeneficiaryAccountFactory(entryPoint);
    }

    // =========================================================================
    // 1. Provisioning & Invariant Tests
    // =========================================================================

    function test_createAccount_success() public {
        uint256 salt = 42;
        address smartAccountAddress = factory.createAccount(
            beneficiaryOwner,
            initialGuardians,
            recoveryThreshold,
            salt
        );

        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(smartAccountAddress));

        assertEq(account.owner(), beneficiaryOwner);
        assertEq(account.entryPoint(), entryPoint);
        assertEq(account.recoveryThreshold(), 2);
        assertTrue(account.isGuardian(guardian1));
        assertTrue(account.isGuardian(guardian2));
        assertTrue(account.isGuardian(guardian3));
        assertFalse(account.isGuardian(stranger));

        address[] memory storedGuardians = account.getGuardians();
        assertEq(storedGuardians.length, 3);
        assertEq(storedGuardians[0], guardian1);
        assertEq(storedGuardians[1], guardian2);
        assertEq(storedGuardians[2], guardian3);

        assertTrue(factory.isDeployedAccount(smartAccountAddress));
        address[] memory beneficiaryAccounts = factory.getAccountsForBeneficiary(beneficiaryOwner);
        assertEq(beneficiaryAccounts.length, 1);
        assertEq(beneficiaryAccounts[0], smartAccountAddress);
    }

    function test_createAccount_deterministicAddress() public {
        uint256 salt = 777;
        address counterfactual = factory.getAddress(
            beneficiaryOwner,
            initialGuardians,
            recoveryThreshold,
            salt
        );

        address deployed = factory.createAccount(
            beneficiaryOwner,
            initialGuardians,
            recoveryThreshold,
            salt
        );

        assertEq(counterfactual, deployed, "Counterfactual CREATE2 address must match deployed address");
    }

    function test_createAccount_zeroGuardians_reverts() public {
        address[] memory emptyGuardians = new address[](0);

        vm.expectRevert(IBeneficiarySmartAccount.InvalidGuardians.selector);
        factory.createAccount(beneficiaryOwner, emptyGuardians, 1, 1);
    }

    function test_createAccount_zeroThreshold_reverts() public {
        vm.expectRevert(IBeneficiarySmartAccount.InvalidThreshold.selector);
        factory.createAccount(beneficiaryOwner, initialGuardians, 0, 1);
    }

    function test_createAccount_thresholdExceedsGuardians_reverts() public {
        vm.expectRevert(IBeneficiarySmartAccount.InvalidThreshold.selector);
        factory.createAccount(beneficiaryOwner, initialGuardians, 4, 1); // 4 > 3
    }

    function test_createAccount_duplicateGuardians_reverts() public {
        address[] memory duplicateGuardians = new address[](2);
        duplicateGuardians[0] = guardian1;
        duplicateGuardians[1] = guardian1; // Duplicate

        vm.expectRevert(abi.encodeWithSelector(IBeneficiarySmartAccount.DuplicateGuardian.selector, guardian1));
        factory.createAccount(beneficiaryOwner, duplicateGuardians, 1, 1);
    }

    function test_createAccount_zeroBeneficiary_reverts() public {
        vm.expectRevert(IBeneficiarySmartAccount.ZeroAddress.selector);
        factory.createAccount(address(0), initialGuardians, 2, 1);
    }

    // =========================================================================
    // 2. Account Execution & ERC-4337 Tests
    // =========================================================================

    function test_execute_byOwner_success() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        // Fund account with 1 ETH
        vm.deal(accountAddr, 1 ether);

        address recipient = address(0x5555);
        assertEq(recipient.balance, 0);

        // Owner executes native transfer
        vm.prank(beneficiaryOwner);
        account.execute(recipient, 0.4 ether, "");

        assertEq(recipient.balance, 0.4 ether);
        assertEq(accountAddr.balance, 0.6 ether);
    }

    function test_execute_byStranger_reverts() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        vm.deal(accountAddr, 1 ether);

        vm.prank(stranger);
        vm.expectRevert(IBeneficiarySmartAccount.Unauthorized.selector);
        account.execute(stranger, 0.5 ether, "");
    }

    function test_validateUserOp_validSignature_success() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        bytes32 userOpHash = keccak256("test-user-op-hash");
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        PackedUserOperation memory userOp;
        userOp.sender = accountAddr;
        userOp.signature = signature;

        // Call from EntryPoint
        vm.prank(entryPoint);
        uint256 validationData = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validationData, 0, "Valid signature must return 0 (SIG_VALIDATION_SUCCESS)");
    }

    function test_validateUserOp_invalidSignature_returnsOne() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        bytes32 userOpHash = keccak256("test-user-op-hash");
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        // Stranger signs instead of owner
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(strangerKey, ethSignedHash);
        bytes memory invalidSignature = abi.encodePacked(r, s, v);

        PackedUserOperation memory userOp;
        userOp.sender = accountAddr;
        userOp.signature = invalidSignature;

        vm.prank(entryPoint);
        uint256 validationData = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validationData, 1, "Invalid signature must return 1 (SIG_VALIDATION_FAILED)");
    }

    function test_validateUserOp_unauthorizedCaller_reverts() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        PackedUserOperation memory userOp;

        vm.prank(stranger);
        vm.expectRevert(IBeneficiarySmartAccount.OnlyEntryPoint.selector);
        account.validateUserOp(userOp, bytes32(0), 0);
    }

    // =========================================================================
    // 3. Social Recovery: Multi-Step Guardian Recovery
    // =========================================================================

    function test_guardianAssistedRecovery_multiStep_success() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        // 1. Guardian 1 initiates recovery to newBeneficiaryOwner
        vm.prank(guardian1);
        account.initiateRecovery(newBeneficiaryOwner);

        (address proposed, uint256 count, bool active, uint256 nonce) = account.currentRecovery();
        assertEq(proposed, newBeneficiaryOwner);
        assertEq(count, 1);
        assertTrue(active);
        assertEq(nonce, 1);
        assertTrue(account.hasSupportedRecovery(1, guardian1));
        assertFalse(account.hasSupportedRecovery(1, guardian2));

        // Ownership not changed yet (threshold is 2)
        assertEq(account.owner(), beneficiaryOwner);

        // 2. Guardian 2 supports recovery
        vm.prank(guardian2);
        account.supportRecovery(newBeneficiaryOwner);

        // Threshold reached (2 of 3)! Recovery auto-executes
        assertEq(account.owner(), newBeneficiaryOwner, "Ownership must transfer to newBeneficiaryOwner");

        (, , bool activeAfter, ) = account.currentRecovery();
        assertFalse(activeAfter, "Recovery must no longer be active");

        // 3. Verify new owner can execute, previous owner cannot
        vm.deal(accountAddr, 1 ether);

        // Previous owner fails
        vm.prank(beneficiaryOwner);
        vm.expectRevert(IBeneficiarySmartAccount.Unauthorized.selector);
        account.execute(beneficiaryOwner, 0.1 ether, "");

        // New owner succeeds
        address target = address(0x7777);
        vm.prank(newBeneficiaryOwner);
        account.execute(target, 0.5 ether, "");
        assertEq(target.balance, 0.5 ether);
    }

    function test_recovery_byNonNominatedAddress_reverts() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        // Stranger tries to initiate recovery
        vm.prank(stranger);
        vm.expectRevert(IBeneficiarySmartAccount.OnlyGuardian.selector);
        account.initiateRecovery(newBeneficiaryOwner);

        // Guardian 1 initiates
        vm.prank(guardian1);
        account.initiateRecovery(newBeneficiaryOwner);

        // Stranger tries to support recovery
        vm.prank(stranger);
        vm.expectRevert(IBeneficiarySmartAccount.OnlyGuardian.selector);
        account.supportRecovery(newBeneficiaryOwner);
    }

    function test_recovery_duplicateSupport_reverts() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        vm.prank(guardian1);
        account.initiateRecovery(newBeneficiaryOwner);

        // Guardian 1 tries to vote again
        vm.prank(guardian1);
        vm.expectRevert(abi.encodeWithSelector(IBeneficiarySmartAccount.AlreadySupported.selector, guardian1));
        account.supportRecovery(newBeneficiaryOwner);
    }

    function test_recovery_insufficientThreshold_cannotExecute() public {
        // Deploy with 3-of-3 threshold
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 3, 99);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        vm.prank(guardian1);
        account.initiateRecovery(newBeneficiaryOwner);

        vm.prank(guardian2);
        account.supportRecovery(newBeneficiaryOwner);

        // Support count is 2, threshold is 3
        vm.expectRevert(abi.encodeWithSelector(IBeneficiarySmartAccount.ThresholdNotMet.selector, 2, 3));
        account.executeRecovery(newBeneficiaryOwner);

        assertEq(account.owner(), beneficiaryOwner);
    }

    // =========================================================================
    // 4. Social Recovery: Signature-Based Relayed Recovery
    // =========================================================================

    function test_guardianAssistedRecovery_withSignatures_success() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        uint256 expectedNonce = 1;
        bytes32 digest = keccak256(
            abi.encode(
                accountAddr,
                "RECOVER_OWNERSHIP",
                newBeneficiaryOwner,
                expectedNonce,
                block.chainid
            )
        );
        bytes32 ethSignedDigest = MessageHashUtils.toEthSignedMessageHash(digest);

        // Guardian 1 signs
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(guardian1Key, ethSignedDigest);
        bytes memory sig1 = abi.encodePacked(r1, s1, v1);

        // Guardian 2 signs
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(guardian2Key, ethSignedDigest);
        bytes memory sig2 = abi.encodePacked(r2, s2, v2);

        bytes[] memory signatures = new bytes[](2);
        signatures[0] = sig1;
        signatures[1] = sig2;

        // Relayer (even stranger) submits recovery
        vm.prank(stranger);
        account.recoverWithSignatures(newBeneficiaryOwner, signatures);

        assertEq(account.owner(), newBeneficiaryOwner, "Signature recovery must transfer ownership to newBeneficiaryOwner");
    }

    function test_recoveryWithSignatures_nonGuardianSignature_reverts() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        uint256 expectedNonce = 1;
        bytes32 digest = keccak256(
            abi.encode(
                accountAddr,
                "RECOVER_OWNERSHIP",
                newBeneficiaryOwner,
                expectedNonce,
                block.chainid
            )
        );
        bytes32 ethSignedDigest = MessageHashUtils.toEthSignedMessageHash(digest);

        // Guardian 1 signs
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(guardian1Key, ethSignedDigest);
        bytes memory sig1 = abi.encodePacked(r1, s1, v1);

        // Stranger signs
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(strangerKey, ethSignedDigest);
        bytes memory sigStranger = abi.encodePacked(r2, s2, v2);

        bytes[] memory signatures = new bytes[](2);
        signatures[0] = sig1;
        signatures[1] = sigStranger;

        vm.expectRevert(IBeneficiarySmartAccount.OnlyGuardian.selector);
        account.recoverWithSignatures(newBeneficiaryOwner, signatures);
    }

    function test_recoveryWithSignatures_duplicateSignatures_reverts() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        uint256 expectedNonce = 1;
        bytes32 digest = keccak256(
            abi.encode(
                accountAddr,
                "RECOVER_OWNERSHIP",
                newBeneficiaryOwner,
                expectedNonce,
                block.chainid
            )
        );
        bytes32 ethSignedDigest = MessageHashUtils.toEthSignedMessageHash(digest);

        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(guardian1Key, ethSignedDigest);
        bytes memory sig1 = abi.encodePacked(r1, s1, v1);

        bytes[] memory signatures = new bytes[](2);
        signatures[0] = sig1;
        signatures[1] = sig1; // Duplicate guardian signature

        vm.expectRevert(abi.encodeWithSelector(IBeneficiarySmartAccount.AlreadySupported.selector, guardian1));
        account.recoverWithSignatures(newBeneficiaryOwner, signatures);
    }

    // =========================================================================
    // 5. Recovery Cancellation by Owner
    // =========================================================================

    function test_cancelRecovery_byOwner() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        vm.prank(guardian1);
        account.initiateRecovery(newBeneficiaryOwner);

        // Owner cancels
        vm.prank(beneficiaryOwner);
        account.cancelRecovery();

        (, , bool active, ) = account.currentRecovery();
        assertFalse(active);

        // Can start fresh proposal later
        vm.prank(guardian2);
        account.initiateRecovery(newBeneficiaryOwner);
        (, , bool newActive, uint256 newNonce) = account.currentRecovery();
        assertTrue(newActive);
        assertEq(newNonce, 2);
    }

    function test_cancelRecovery_byStranger_reverts() public {
        address accountAddr = factory.createAccount(beneficiaryOwner, initialGuardians, 2, 1);
        BeneficiarySmartAccount account = BeneficiarySmartAccount(payable(accountAddr));

        vm.prank(guardian1);
        account.initiateRecovery(newBeneficiaryOwner);

        vm.prank(stranger);
        vm.expectRevert(IBeneficiarySmartAccount.OnlyOwner.selector);
        account.cancelRecovery();
    }
}
