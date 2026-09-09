// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {StealthAddressRegistry} from "../src/StealthAddressRegistry.sol";
import {BalanceCommitment} from "../src/BalanceCommitment.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {IProofOfLifeConsensus} from "../src/interfaces/IProofOfLifeConsensus.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @dev Mock token that reverts on transfer to simulate paused / blacklisted tokens
contract MaliciousRevertingERC20 is ERC20 {
    bool public shouldRevert = false;

    constructor() ERC20("Malicious Token", "MAL") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function setReverting(bool _revert) external {
        shouldRevert = _revert;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (shouldRevert) {
            revert("TOKEN_TRANSFER_PAUSED_OR_BLACKLISTED");
        }
        return super.transfer(to, amount);
    }
}

contract HealthyERC20 is ERC20 {
    constructor() ERC20("Healthy Token", "HLT") {
        _mint(msg.sender, 1_000_000 ether);
    }
}

contract SecurityHardeningTest is Test {
    GuardianRegistry public guardianRegistry;
    ProofOfLifeConsensus public consensus;
    StealthAddressRegistry public stealthRegistry;
    BalanceCommitment public balanceCommitment;

    address public owner = address(0xAA11);
    address public beneficiary = address(0xBB22);
    address public attacker = address(0xDEAD);
    uint256 public guardianPrivateKey = 0xBEEF1;
    address public guardianAddress;

    bytes32 public guardianRoot;
    bytes32[] public guardianProof;

    function setUp() public {
        guardianAddress = vm.addr(guardianPrivateKey);
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));
        stealthRegistry = new StealthAddressRegistry();
        balanceCommitment = new BalanceCommitment();

        bytes32 leaf = MerkleProofLib.computeGuardianLeaf(guardianAddress);
        guardianRoot = leaf;
        guardianProof = new bytes32[](0);
    }

    // =========================================================================
    // 1. GuardianRegistry Front-Running Prevention & EIP-712 Replay Defense
    // =========================================================================

    function test_revertIf_unauthorizedConsensusRegistration() public {
        address unconfiguredVault = address(0x123456);

        // Attacker attempts to pre-register consensus before owner commits guardian root
        vm.prank(attacker);
        vm.expectRevert(GuardianRegistry.Unauthorized.selector);
        guardianRegistry.setConsensusForVault(unconfiguredVault, address(consensus));
    }

    function test_revertIf_attestWithSigExpired() public {
        address[] memory emptyTokens = new address[](0);
        InheritanceVault vault = new InheritanceVault(owner, 30 days, emptyTokens, address(consensus));

        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 1, 1);

        uint256 cycle = guardianRegistry.attestationCycle(address(vault));
        uint256 deadline = block.timestamp + 100;

        // Build valid EIP-712 digest
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("GuardianRegistry")),
                keccak256(bytes("1")),
                block.chainid,
                address(guardianRegistry)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(
                guardianRegistry.GUARDIAN_ATTESTATION_TYPEHASH(),
                address(vault),
                guardianAddress,
                cycle,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(guardianPrivateKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Advance time past deadline
        vm.warp(deadline + 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                GuardianRegistry.DeadlineExpired.selector,
                deadline,
                deadline + 1
            )
        );
        guardianRegistry.attestWithSig(address(vault), guardianAddress, guardianProof, deadline, sig);
    }

    function test_revertIf_attestWithSigWrongChainId() public {
        address[] memory emptyTokens = new address[](0);
        InheritanceVault vault = new InheritanceVault(owner, 30 days, emptyTokens, address(consensus));

        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 1, 1);

        uint256 cycle = guardianRegistry.attestationCycle(address(vault));
        uint256 deadline = block.timestamp + 1 hours;

        // Sign with a different chainId (e.g. mainnet 1 vs testnet)
        uint256 foreignChainId = 1;
        bytes32 foreignDomain = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("GuardianRegistry")),
                keccak256(bytes("1")),
                foreignChainId,
                address(guardianRegistry)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(
                guardianRegistry.GUARDIAN_ATTESTATION_TYPEHASH(),
                address(vault),
                guardianAddress,
                cycle,
                deadline
            )
        );
        bytes32 foreignDigest = keccak256(abi.encodePacked("\x19\x01", foreignDomain, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(guardianPrivateKey, foreignDigest);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.expectRevert(GuardianRegistry.InvalidSignature.selector);
        guardianRegistry.attestWithSig(address(vault), guardianAddress, guardianProof, deadline, sig);
    }

    // =========================================================================
    // 2. Token Claim Isolation (Failure Resilience Against DoS)
    // =========================================================================

    function test_claimSucceedsEvenIfOneTokenReverts() public {
        HealthyERC20 healthy = new HealthyERC20();
        MaliciousRevertingERC20 broken = new MaliciousRevertingERC20();

        address[] memory tokens = new address[](2);
        tokens[0] = address(healthy);
        tokens[1] = address(broken);

        InheritanceVault vault = new InheritanceVault(owner, 1 days, tokens, address(consensus));

        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 1, 1);
        vm.prank(owner);
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));

        // Setup allocation for beneficiary (100% share = 10,000 bps)
        bytes32 salt = bytes32(uint256(0x5555));
        bytes32 leaf = MerkleProofLib.computeAllocationLeaf(beneficiary, 10000, salt);
        vm.prank(owner);
        vault.setAllocationRoot(leaf);

        // Fund vault with 2 ETH, 500 Healthy tokens, and 500 Broken tokens
        vm.deal(address(vault), 2 ether);
        healthy.transfer(address(vault), 500 ether);
        broken.transfer(address(vault), 500 ether);

        // Advance vault to Finalized state
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(guardianAddress);
        guardianRegistry.attest(address(vault), guardianProof);
        consensus.triggerClaimPending(address(vault));
        vm.warp(block.timestamp + 72 hours + 1);
        consensus.finalizeContest(address(vault));

        bytes32[] memory emptyProof = new bytes32[](0);

        // Beneficiary claims: broken token fails, but ETH and Healthy token MUST be received!
        uint256 ethBefore = beneficiary.balance;
        uint256 healthyBefore = healthy.balanceOf(beneficiary);

        broken.setReverting(true);

        vm.prank(beneficiary);
        vault.claim(10000, salt, emptyProof);

        assertEq(beneficiary.balance - ethBefore, 2 ether, "Beneficiary must receive ETH despite broken token");
        assertEq(healthy.balanceOf(beneficiary) - healthyBefore, 500 ether, "Beneficiary must receive Healthy token");
        assertEq(broken.balanceOf(beneficiary), 0, "Broken token transfer caught gracefully");
    }

    // =========================================================================
    // 3. Max Whitelisted Tokens & Clean Removal
    // =========================================================================

    function test_maxWhitelistedTokens_enforced() public {
        address[] memory tokens = new address[](21);
        for (uint256 i = 0; i < 21; i++) {
            tokens[i] = address(uint160(0x9000 + i));
        }

        vm.expectRevert(InheritanceVault.MaxTokensExceeded.selector);
        new InheritanceVault(owner, 1 days, tokens, address(consensus));
    }

    function test_cleanTokenRemovalFromWhitelist() public {
        address[] memory tokens = new address[](3);
        address t1 = address(0x7001);
        address t2 = address(0x7002);
        address t3 = address(0x7003);
        tokens[0] = t1;
        tokens[1] = t2;
        tokens[2] = t3;

        InheritanceVault vault = new InheritanceVault(owner, 1 days, tokens, address(consensus));
        assertEq(vault.getWhitelistedTokens().length, 3);

        // Delist t2
        vm.prank(owner);
        vault.setTokenWhitelist(t2, false);

        address[] memory currentTokens = vault.getWhitelistedTokens();
        assertEq(currentTokens.length, 2, "Array length must decrease upon delisting");
        assertTrue(!vault.isWhitelistedToken(t2), "Token must not be whitelisted");
    }

    // =========================================================================
    // 4. StealthAddressRegistry Replay Defense
    // =========================================================================

    function test_stealthAddressRegistry_deadlineEnforced() public {
        uint256 pkey = 0xCAFE;
        address registrant = vm.addr(pkey);
        uint256 deadline = block.timestamp + 10;

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("RegisterKeysOnBehalf(address registrant,uint256 schemeId,bytes spendingPubKey,bytes viewingPubKey,uint256 nonce,uint256 deadline,uint256 chainId,address verifyingContract)"),
                registrant,
                1,
                keccak256(hex"02"),
                keccak256(hex"03"),
                0,
                deadline,
                block.chainid,
                address(stealthRegistry)
            )
        );
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pkey, ethHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Warp past deadline
        vm.warp(deadline + 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                StealthAddressRegistry.DeadlineExpired.selector,
                deadline,
                deadline + 1
            )
        );
        stealthRegistry.registerKeysOnBehalf(
            registrant,
            1,
            sig,
            hex"02",
            hex"03",
            deadline
        );
    }
}
