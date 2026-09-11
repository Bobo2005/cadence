// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OneClickInheritanceVault} from "../src/OneClickInheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {IProofOfLifeConsensus} from "../src/interfaces/IProofOfLifeConsensus.sol";

contract OneClickVaultTest is Test {
    GuardianRegistry public guardianRegistry;
    ProofOfLifeConsensus public consensus;
    address public user = address(0xABCD);
    address public g1 = address(0x1111);
    address public g2 = address(0x2222);

    function setUp() public {
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));
        vm.deal(user, 10 ether);
    }

    function test_oneClickDeployment() public {
        vm.startPrank(user);

        bytes32 mockAllocRoot = keccak256("allocRoot");
        bytes32 mockGuardRoot = keccak256("guardRoot");
        uint256 checkInInterval = 300; // 5 minutes
        uint256 contestWindow = 300;   // 5 minutes test grace period

        // Deploy in 1 single transaction with 0.05 ether deposit!
        OneClickInheritanceVault vault = new OneClickInheritanceVault{value: 0.05 ether}(
            user,
            checkInInterval,
            contestWindow,
            mockAllocRoot,
            address(guardianRegistry),
            mockGuardRoot,
            2,
            2,
            address(consensus)
        );

        vm.stopPrank();

        // Verify Vault ownership
        assertEq(vault.owner(), user, "User must be vault owner");

        // Verify ETH deposit
        assertEq(address(vault).balance, 0.05 ether, "Vault balance must be 0.05 ETH");
        assertEq(vault.totalDeposited(address(0)), 0.05 ether, "totalDeposited(0) must be 0.05 ETH");

        // Verify Allocation Root
        assertEq(vault.allocationRoot(), mockAllocRoot, "Allocation root must be committed");

        // Verify Guardian Root in GuardianRegistry
        GuardianRegistry.GuardianConfig memory gCfg = guardianRegistry.getGuardianConfig(address(vault));
        assertEq(gCfg.guardianRoot, mockGuardRoot, "Guardian root must be in registry");
        assertEq(gCfg.threshold, 2, "Threshold must be 2");
        assertEq(gCfg.totalGuardians, 2, "Total guardians must be 2");

        // Verify Contest Window in ProofOfLifeConsensus
        (uint256 interval,, uint256 windowDuration,,,) = consensus.consensusConfigs(address(vault));
        assertEq(interval, 300, "Checkin interval must be 300s");
        assertEq(windowDuration, 300, "Contest window must be 300s (5 min)");
        assertEq(consensus.vaultOwners(address(vault)), user, "Consensus vaultOwner must be user");
    }
}
