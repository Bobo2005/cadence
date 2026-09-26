// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";

contract SecretBoxTest is Test {
    GuardianRegistry public guardianRegistry;
    ProofOfLifeConsensus public consensus;
    InheritanceVault public vault;

    address public owner = address(0xCAFE);
    address public beneficiary1 = address(0x1111);
    address public beneficiary2 = address(0x2222);
    address public attacker = address(0xBADD);

    string constant SAMPLE_CID_1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    string constant SAMPLE_CID_2 = "bafybeic3q5e54s7v5s4y6v23efuylqabf3oclgtqy55fbzdizt5sfp7udm";
    string constant SAMPLE_CIPHER_1 = "{\"iv\":\"1234\",\"ephemPublicKey\":\"04abcd...\",\"ciphertext\":\"feed...\",\"mac\":\"5678\"}";
    string constant SAMPLE_CIPHER_2 = "{\"iv\":\"9876\",\"ephemPublicKey\":\"04ef01...\",\"ciphertext\":\"cafe...\",\"mac\":\"1234\"}";

    event SecretBoxAnchored(
        address indexed beneficiary,
        string ipfsCid,
        string encryptedKeyCipher,
        uint64 timestamp
    );

    function setUp() public {
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));

        address[] memory tokens = new address[](0);
        vm.prank(owner);
        vault = new InheritanceVault(owner, 30 days, tokens, address(consensus));
    }

    function test_setSecretBox_asOwner_succeedsAndEmitsEvent() public {
        vm.startPrank(owner);

        vm.expectEmit(true, false, false, true, address(vault));
        emit SecretBoxAnchored(beneficiary1, SAMPLE_CID_1, SAMPLE_CIPHER_1, uint64(block.timestamp));

        vault.setSecretBox(beneficiary1, SAMPLE_CID_1, SAMPLE_CIPHER_1);
        vm.stopPrank();

        (string memory cid, string memory cipher, uint64 ts) = vault.getSecretBox(beneficiary1);
        assertEq(cid, SAMPLE_CID_1, "CID must match");
        assertEq(cipher, SAMPLE_CIPHER_1, "Cipher must match");
        assertEq(ts, uint64(block.timestamp), "Timestamp must match block.timestamp");
    }

    function test_setSecretBox_revertsIfNonOwner() public {
        vm.startPrank(attacker);
        vm.expectRevert();
        vault.setSecretBox(beneficiary1, SAMPLE_CID_1, SAMPLE_CIPHER_1);
        vm.stopPrank();
    }

    function test_setSecretBox_revertsIfEmptyInputs() public {
        vm.startPrank(owner);

        // Empty CID
        vm.expectRevert("Invalid CID");
        vault.setSecretBox(beneficiary1, "", SAMPLE_CIPHER_1);

        // Empty cipher
        vm.expectRevert("Invalid cipher");
        vault.setSecretBox(beneficiary1, SAMPLE_CID_1, "");

        // Zero address beneficiary
        vm.expectRevert(InheritanceVault.ZeroAddress.selector);
        vault.setSecretBox(address(0), SAMPLE_CID_1, SAMPLE_CIPHER_1);

        vm.stopPrank();
    }

    function test_setSecretBoxesBatch_multipleBeneficiaries() public {
        InheritanceVault.SecretBoxAnchorInit[] memory inits = new InheritanceVault.SecretBoxAnchorInit[](2);
        inits[0] = InheritanceVault.SecretBoxAnchorInit(beneficiary1, SAMPLE_CID_1, SAMPLE_CIPHER_1);
        inits[1] = InheritanceVault.SecretBoxAnchorInit(beneficiary2, SAMPLE_CID_2, SAMPLE_CIPHER_2);

        vm.startPrank(owner);
        vault.setSecretBoxesBatch(inits);
        vm.stopPrank();

        (string memory cid1, string memory cipher1, ) = vault.getSecretBox(beneficiary1);
        (string memory cid2, string memory cipher2, ) = vault.getSecretBox(beneficiary2);

        assertEq(cid1, SAMPLE_CID_1, "Beneficiary 1 CID must match");
        assertEq(cipher1, SAMPLE_CIPHER_1, "Beneficiary 1 cipher must match");
        assertEq(cid2, SAMPLE_CID_2, "Beneficiary 2 CID must match");
        assertEq(cipher2, SAMPLE_CIPHER_2, "Beneficiary 2 cipher must match");
    }

    function test_setSecretBox_gasMeasurement() public {
        vm.startPrank(owner);
        uint256 gasBefore = gasleft();
        vault.setSecretBox(beneficiary1, SAMPLE_CID_1, SAMPLE_CIPHER_1);
        uint256 gasUsed = gasBefore - gasleft();
        vm.stopPrank();

        // Gas usage for SSTORE of two strings and a uint64
        console.log("Gas used for setSecretBox:", gasUsed);
        assertTrue(gasUsed > 0, "Gas used must be positive");
    }
}
