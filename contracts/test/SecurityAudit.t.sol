// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {StealthAddressRegistry} from "../src/StealthAddressRegistry.sol";
import {BalanceCommitment} from "../src/BalanceCommitment.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Mock ERC-20 token that can be toggled to revert on transfers
contract MockBrokenERC20 is ERC20 {
    bool public shouldRevert = false;

    constructor() ERC20("Broken Token", "BRK") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function setReverting(bool _revert) external {
        shouldRevert = _revert;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (shouldRevert) {
            revert("TRANSFER_PAUSED_OR_BLACKLISTED");
        }
        return super.transfer(to, amount);
    }
}

/// @dev Mock ERC-20 token that transfers cleanly
contract MockHealthyERC20 is ERC20 {
    constructor() ERC20("Healthy Token", "HLT") {
        _mint(msg.sender, 1_000_000 ether);
    }
}

/**
 * @title SecurityAuditTest
 * @notice Automated Security Regression Test Suite for Cadence Protocol (Phase 3.2)
 * Validates:
 * 1. Front-run protection on consensus registration
 * 2. EIP-712 cross-chain replay rejection on guardian attestations
 * 3. Token claim failure isolation (resilient non-blocking payouts)
 * 4. Access control on balance accounting
 */
contract SecurityAuditTest is Test {
    GuardianRegistry public guardianRegistry;
    ProofOfLifeConsensus public consensus;
    StealthAddressRegistry public stealthRegistry;
    BalanceCommitment public balanceCommitment;

    address public owner = address(0xA001);
    address public beneficiary = address(0xB001);
    address public attacker = address(0xDEAD);

    uint256 public guardianPrivateKey = 0x123456789;
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
    // 1. Unauthorized Consensus Registration Revert (Front-Run Protection)
    // =========================================================================

    function test_RevertIf_UnauthorizedConsensusRegistration() public {
        address unconfiguredVault = address(0x999999);

        // Case A: Attacker attempts to pre-register consensus before vault owner commits root
        vm.prank(attacker);
        vm.expectRevert(GuardianRegistry.Unauthorized.selector);
        guardianRegistry.setConsensusForVault(unconfiguredVault, address(consensus));

        // Case B: Owner commits guardian root, but attacker tries to set consensus
        address[] memory emptyTokens = new address[](0);
        InheritanceVault vault = new InheritanceVault(owner, 30 days, emptyTokens, address(consensus));

        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 1, 1);

        vm.prank(attacker);
        vm.expectRevert(GuardianRegistry.Unauthorized.selector);
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));

        // Case C: Owner legitimately sets consensus -> SUCCEEDS
        vm.prank(owner);
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));
        assertEq(guardianRegistry.consensusContracts(address(vault)), address(consensus));
    }

    // =========================================================================
    // 2. Cross-Chain Attestation Replay Revert (EIP-712 Domain Separation)
    // =========================================================================

    function test_RevertIf_CrossChainAttestationReplay() public {
        address[] memory emptyTokens = new address[](0);
        InheritanceVault vault = new InheritanceVault(owner, 30 days, emptyTokens, address(consensus));

        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 1, 1);

        uint256 cycle = guardianRegistry.attestationCycle(address(vault));
        uint256 deadline = block.timestamp + 1 hours;

        // Attacker intercepts or captures an attestation signed for Ethereum Mainnet (chainId = 1)
        uint256 foreignChainId = 1;
        bytes32 foreignDomainSeparator = keccak256(
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
        bytes32 foreignDigest = keccak256(abi.encodePacked("\x19\x01", foreignDomainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(guardianPrivateKey, foreignDigest);
        bytes memory foreignSig = abi.encodePacked(r, s, v);

        // Attacker attempts to replay signature on current chain (block.chainid != 1)
        // Must strictly revert with InvalidSignature
        vm.expectRevert(GuardianRegistry.InvalidSignature.selector);
        guardianRegistry.attestWithSig(address(vault), guardianAddress, guardianProof, deadline, foreignSig);
    }

    // =========================================================================
    // 3. Token Claim Isolation (Failure Resilience Against DoS)
    // =========================================================================

    function test_Claim_Succeeds_EvenIfOneTokenReverts() public {
        MockHealthyERC20 healthyToken = new MockHealthyERC20();
        MockBrokenERC20 brokenToken = new MockBrokenERC20();

        address[] memory tokens = new address[](2);
        tokens[0] = address(healthyToken);
        tokens[1] = address(brokenToken);

        InheritanceVault vault = new InheritanceVault(owner, 1 days, tokens, address(consensus));

        vm.prank(owner);
        guardianRegistry.commitGuardianRoot(address(vault), guardianRoot, 1, 1);
        vm.prank(owner);
        guardianRegistry.setConsensusForVault(address(vault), address(consensus));

        // 100% allocation to beneficiary (10,000 bps)
        bytes32 salt = bytes32(uint256(0x7777));
        bytes32 leaf = MerkleProofLib.computeAllocationLeaf(beneficiary, 10000, salt);
        vm.prank(owner);
        vault.setAllocationRoot(leaf);

        // Fund vault with 3 ETH, 1000 Healthy tokens, and 1000 Broken tokens
        vm.deal(address(vault), 3 ether);
        healthyToken.transfer(address(vault), 1000 ether);
        brokenToken.transfer(address(vault), 1000 ether);

        // Advance vault to Finalized state
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(guardianAddress);
        guardianRegistry.attest(address(vault), guardianProof);
        consensus.triggerClaimPending(address(vault));
        vm.warp(block.timestamp + 72 hours + 1);
        consensus.finalizeContest(address(vault));

        // Simulate broken token becoming paused / blacklisted / reverting
        brokenToken.setReverting(true);

        uint256 ethBefore = beneficiary.balance;
        uint256 healthyBefore = healthyToken.balanceOf(beneficiary);

        bytes32[] memory emptyProof = new bytes32[](0);

        // Beneficiary executes claim
        // Invariant: Transaction MUST NOT revert; ETH and healthy tokens must be distributed cleanly!
        vm.prank(beneficiary);
        vault.claim(10000, salt, emptyProof);

        assertEq(beneficiary.balance - ethBefore, 3 ether, "Beneficiary must receive full ETH allocation");
        assertEq(healthyToken.balanceOf(beneficiary) - healthyBefore, 1000 ether, "Beneficiary must receive healthy tokens");
        assertEq(brokenToken.balanceOf(beneficiary), 0, "Reverting token failure was caught without reverting whole transaction");
    }

    // =========================================================================
    // 4. Unauthorized Balance Commitment Revert (Access Control on Accounting)
    // =========================================================================

    function test_RevertIf_UnauthorizedBalanceCommitment() public {
        address mockVault = address(0xCAFE);

        // Attacker attempts unauthorized mutations on BalanceCommitment
        vm.prank(attacker);
        vm.expectRevert(BalanceCommitment.Unauthorized.selector);
        balanceCommitment.recordDeposit(mockVault, 50 ether);

        vm.prank(attacker);
        vm.expectRevert(BalanceCommitment.Unauthorized.selector);
        balanceCommitment.commitTransparentBalance(mockVault, 100 ether);

        vm.prank(attacker);
        vm.expectRevert(BalanceCommitment.Unauthorized.selector);
        balanceCommitment.deductPayout(mockVault, 25 ether);

        // Legitimate authorized vault or contract owner CAN mutate balances
        balanceCommitment.setAuthorizedVault(mockVault, true);

        vm.prank(mockVault);
        balanceCommitment.recordDeposit(mockVault, 50 ether);
        assertEq(balanceCommitment.balances(mockVault), 50 ether);

        vm.prank(mockVault);
        balanceCommitment.deductPayout(mockVault, 20 ether);
        assertEq(balanceCommitment.balances(mockVault), 30 ether);
    }
}
