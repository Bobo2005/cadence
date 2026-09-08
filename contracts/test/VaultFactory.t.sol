// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";

contract VaultFactoryTest is Test {
    VaultFactory public factory;
    ProofOfLifeConsensus public consensus;
    GuardianRegistry public guardianRegistry;

    address public owner1 = address(0x1111);
    address public owner2 = address(0x2222);

    event VaultDeployed(
        address indexed vault,
        address indexed owner,
        uint256 checkInInterval,
        address indexed consensus
    );

    function setUp() public {
        guardianRegistry = new GuardianRegistry();
        consensus = new ProofOfLifeConsensus(address(guardianRegistry));
        factory = new VaultFactory();
    }

    function test_deployVault_success() public {
        address[] memory tokens = new address[](0);

        vm.expectEmit(false, true, false, true);
        emit VaultDeployed(address(0), owner1, 90 days, address(consensus));

        address vaultAddr = factory.deployVault(
            owner1,
            90 days,
            tokens,
            address(consensus)
        );

        assertTrue(vaultAddr != address(0), "Vault address must be non-zero");
        assertTrue(factory.isFactoryVault(vaultAddr), "Must be marked as factory vault");
        assertEq(factory.allVaultsLength(), 1, "allVaults length must be 1");
        assertEq(factory.allVaults(0), vaultAddr, "Vault address in allVaults must match");

        address[] memory owner1Vaults = factory.getVaultsByOwner(owner1);
        assertEq(owner1Vaults.length, 1, "Owner 1 must have 1 vault");
        assertEq(owner1Vaults[0], vaultAddr, "Owner 1 vault must match");

        // Verify InheritanceVault contract properties
        InheritanceVault vault = InheritanceVault(payable(vaultAddr));
        assertEq(vault.owner(), owner1, "Vault owner must be owner1");
        assertEq(vault.checkInInterval(), 90 days, "Interval must match 90 days");
        assertEq(address(vault.consensus()), address(consensus), "Consensus address must match");
    }

    function test_deployMultipleVaults_sameOwner() public {
        address[] memory tokens = new address[](0);

        address v1 = factory.deployVault(owner1, 30 days, tokens, address(consensus));
        address v2 = factory.deployVault(owner1, 60 days, tokens, address(consensus));

        assertTrue(v1 != v2, "Vault addresses must be distinct");
        assertEq(factory.allVaultsLength(), 2, "Total vaults must be 2");

        address[] memory owner1Vaults = factory.getVaultsByOwner(owner1);
        assertEq(owner1Vaults.length, 2, "Owner 1 must have 2 vaults");
        assertEq(owner1Vaults[0], v1);
        assertEq(owner1Vaults[1], v2);
    }

    function test_deployVaults_distinctOwners() public {
        address[] memory tokens = new address[](0);

        address v1 = factory.deployVault(owner1, 30 days, tokens, address(consensus));
        address v2 = factory.deployVault(owner2, 180 days, tokens, address(consensus));

        assertEq(factory.getVaultsByOwner(owner1).length, 1);
        assertEq(factory.getVaultsByOwner(owner1)[0], v1);

        assertEq(factory.getVaultsByOwner(owner2).length, 1);
        assertEq(factory.getVaultsByOwner(owner2)[0], v2);
    }
}
