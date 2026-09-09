// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StealthAddressRegistry} from "../src/StealthAddressRegistry.sol";
import {IStealthAddressRegistry} from "../src/interfaces/IStealthAddressRegistry.sol";
import {StealthKeyHelper} from "./helpers/StealthKeyHelper.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title StealthAddressRegistryTest
/// @notice Comprehensive unit tests for StealthAddressRegistry and EIP-5564 stealth keypair verification.
/// @dev Enforces Architecture Constraint #2: tests verify real stealth keypairs, not mock EOAs.
contract StealthAddressRegistryTest is Test {
    StealthAddressRegistry internal registry;

    uint256 internal constant SCHEME_ID = 1;

    address internal user = address(0xAAAA);
    address internal relayer = address(0xBBBB);

    uint256 internal userPrivateKey = 0x123456789;
    address internal userFromKey;

    event StealthMetaAddressRegistered(
        address indexed registrant,
        uint256 indexed schemeId,
        bytes spendingPubKey,
        bytes viewingPubKey
    );

    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    function setUp() public {
        registry = new StealthAddressRegistry();
        userFromKey = vm.addr(userPrivateKey);
    }

    // =========================================================================
    // 1. Direct Key Registration
    // =========================================================================

    function test_registerKeys_direct_success() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();

        vm.startPrank(user);
        vm.expectEmit(true, true, false, true);
        emit StealthMetaAddressRegistered(
            user,
            SCHEME_ID,
            primary.spendingPublicKey,
            primary.viewingPublicKey
        );

        registry.registerKeys(
            SCHEME_ID,
            primary.spendingPublicKey,
            primary.viewingPublicKey
        );
        vm.stopPrank();

        (bytes memory storedSpend, bytes memory storedView) = registry.getStealthMetaAddress(
            user,
            SCHEME_ID
        );

        assertEq(storedSpend, primary.spendingPublicKey, "Stored spending key mismatch");
        assertEq(storedView, primary.viewingPublicKey, "Stored viewing key mismatch");
    }

    function test_registerKeys_invalidSchemeId_reverts() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();

        vm.prank(user);
        vm.expectRevert(StealthAddressRegistry.InvalidSchemeId.selector);
        registry.registerKeys(999, primary.spendingPublicKey, primary.viewingPublicKey);
    }

    function test_registerKeys_invalidKeyLength_reverts() public {
        bytes memory shortKey = hex"01020304";
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();

        vm.startPrank(user);
        vm.expectRevert(StealthAddressRegistry.InvalidKeyLength.selector);
        registry.registerKeys(
            SCHEME_ID,
            shortKey,
            primary.viewingPublicKey
        );

        vm.expectRevert(StealthAddressRegistry.InvalidKeyLength.selector);
        registry.registerKeys(
            SCHEME_ID,
            primary.spendingPublicKey,
            shortKey
        );
        vm.stopPrank();
    }

    // =========================================================================
    // 2. Relayed Registration On Behalf (Meta-Transactions)
    // =========================================================================

    function test_registerKeysOnBehalf_success() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();
        uint256 nonce = registry.nonces(userFromKey);
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("RegisterKeysOnBehalf(address registrant,uint256 schemeId,bytes spendingPubKey,bytes viewingPubKey,uint256 nonce,uint256 deadline,uint256 chainId,address verifyingContract)"),
                userFromKey,
                SCHEME_ID,
                keccak256(primary.spendingPublicKey),
                keccak256(primary.viewingPublicKey),
                nonce,
                deadline,
                block.chainid,
                address(registry)
            )
        );
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Relayer submits registration on behalf of user
        vm.prank(relayer);
        registry.registerKeysOnBehalf(
            userFromKey,
            SCHEME_ID,
            signature,
            primary.spendingPublicKey,
            primary.viewingPublicKey,
            deadline
        );

        assertEq(registry.nonces(userFromKey), nonce + 1, "Nonce should increment");

        (bytes memory storedSpend, bytes memory storedView) = registry.getStealthMetaAddress(
            userFromKey,
            SCHEME_ID
        );
        assertEq(storedSpend, primary.spendingPublicKey);
        assertEq(storedView, primary.viewingPublicKey);
    }

    function test_registerKeysOnBehalf_wrongSigner_reverts() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();
        uint256 nonce = registry.nonces(userFromKey);
        uint256 deadline = block.timestamp + 1 hours;

        // Sign with stranger key instead of userPrivateKey
        uint256 strangerKey = 0x999999;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("RegisterKeysOnBehalf(address registrant,uint256 schemeId,bytes spendingPubKey,bytes viewingPubKey,uint256 nonce,uint256 deadline,uint256 chainId,address verifyingContract)"),
                userFromKey,
                SCHEME_ID,
                keccak256(primary.spendingPublicKey),
                keccak256(primary.viewingPublicKey),
                nonce,
                deadline,
                block.chainid,
                address(registry)
            )
        );
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(strangerKey, ethHash);
        bytes memory wrongSig = abi.encodePacked(r, s, v);

        vm.prank(relayer);
        vm.expectRevert(StealthAddressRegistry.InvalidSignature.selector);
        registry.registerKeysOnBehalf(
            userFromKey,
            SCHEME_ID,
            wrongSig,
            primary.spendingPublicKey,
            primary.viewingPublicKey,
            deadline
        );
    }

    function test_registerKeysOnBehalf_deadlineExpired_reverts() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();
        uint256 nonce = registry.nonces(userFromKey);
        uint256 deadline = block.timestamp + 100;

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("RegisterKeysOnBehalf(address registrant,uint256 schemeId,bytes spendingPubKey,bytes viewingPubKey,uint256 nonce,uint256 deadline,uint256 chainId,address verifyingContract)"),
                userFromKey,
                SCHEME_ID,
                keccak256(primary.spendingPublicKey),
                keccak256(primary.viewingPublicKey),
                nonce,
                deadline,
                block.chainid,
                address(registry)
            )
        );
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.warp(deadline + 1);

        vm.prank(relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                StealthAddressRegistry.DeadlineExpired.selector,
                deadline,
                deadline + 1
            )
        );
        registry.registerKeysOnBehalf(
            userFromKey,
            SCHEME_ID,
            signature,
            primary.spendingPublicKey,
            primary.viewingPublicKey,
            deadline
        );
    }

    function test_registerKeysOnBehalf_malformedSignature_reverts() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();
        bytes memory badSig = new bytes(65);

        vm.prank(relayer);
        vm.expectRevert(ECDSA.ECDSAInvalidSignature.selector);
        registry.registerKeysOnBehalf(
            userFromKey,
            SCHEME_ID,
            badSig,
            primary.spendingPublicKey,
            primary.viewingPublicKey,
            block.timestamp + 1 hours
        );
    }

    function test_registerKeysOnBehalf_zeroAddress_reverts() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();
        bytes memory dummySig = new bytes(65);

        vm.prank(relayer);
        vm.expectRevert(StealthAddressRegistry.ZeroAddress.selector);
        registry.registerKeysOnBehalf(
            address(0),
            SCHEME_ID,
            dummySig,
            primary.spendingPublicKey,
            primary.viewingPublicKey,
            block.timestamp + 1 hours
        );
    }

    // =========================================================================
    // 3. Announcements
    // =========================================================================

    function test_announce_success() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();
        bytes memory metadata = abi.encodePacked(primary.viewTag, "vault-1");

        vm.startPrank(user);
        vm.expectEmit(true, true, true, true);
        emit Announcement(
            SCHEME_ID,
            primary.stealthAddress,
            user,
            primary.ephemeralPublicKey,
            metadata
        );

        registry.announce(
            SCHEME_ID,
            primary.stealthAddress,
            primary.ephemeralPublicKey,
            metadata
        );
        vm.stopPrank();
    }

    function test_announce_zeroAddress_reverts() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();

        vm.prank(user);
        vm.expectRevert(StealthAddressRegistry.ZeroAddress.selector);
        registry.announce(
            SCHEME_ID,
            address(0),
            primary.ephemeralPublicKey,
            ""
        );
    }

    function test_announce_invalidKeyLength_reverts() public {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();
        bytes memory invalidKey = hex"1234";

        vm.prank(user);
        vm.expectRevert(StealthAddressRegistry.InvalidKeyLength.selector);
        registry.announce(
            SCHEME_ID,
            primary.stealthAddress,
            invalidKey,
            ""
        );
    }

    // =========================================================================
    // 4. Cryptographic Keypair Verification (Architecture Constraint #2)
    // =========================================================================

    function test_stealthKeypairVerification_primaryOwner() public pure {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();
        address derivedAddr = vm.addr(primary.stealthPrivateKey);

        assertEq(
            derivedAddr,
            primary.stealthAddress,
            "Primary stealth private key must derive exact stealth address"
        );
    }

    function test_stealthKeypairVerification_secondaryOwner() public pure {
        StealthKeyHelper.StealthKeypair memory secondary = StealthKeyHelper.getSecondaryStealthKeypair();
        address derivedAddr = vm.addr(secondary.stealthPrivateKey);

        assertEq(
            derivedAddr,
            secondary.stealthAddress,
            "Secondary stealth private key must derive exact stealth address"
        );
    }

    function test_stealthKeypairVerification_thirdOwner() public pure {
        StealthKeyHelper.StealthKeypair memory third = StealthKeyHelper.getThirdStealthKeypair();
        address derivedAddr = vm.addr(third.stealthPrivateKey);

        assertEq(
            derivedAddr,
            third.stealthAddress,
            "Third stealth private key must derive exact stealth address"
        );
    }

    function test_stealthSignatureAndRecovery() public pure {
        StealthKeyHelper.StealthKeypair memory primary = StealthKeyHelper.getPrimaryStealthKeypair();

        // Simulate an EIP-712 / message digest for cancelClaimWithSig
        bytes32 digest = keccak256("CancelClaim(uint256 vaultId,uint256 nonce,uint256 deadline)");
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(digest);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(primary.stealthPrivateKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        address recovered = ECDSA.recover(ethHash, signature);
        assertEq(
            recovered,
            primary.stealthAddress,
            "Recovered address from stealth signature must equal stealth address"
        );
    }
}
