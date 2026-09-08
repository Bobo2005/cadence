// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {InheritanceVault} from "./InheritanceVault.sol";

/// @title VaultFactory
/// @notice Factory contract for deploying and tracking new InheritanceVault instances.
/// @dev Enables creators to provision fresh vaults delegating to ProofOfLifeConsensus.
contract VaultFactory {
    // --- Events ---
    event VaultDeployed(
        address indexed vault,
        address indexed owner,
        uint256 checkInInterval,
        address indexed consensus
    );

    // --- State Variables ---

    /// @notice List of all vaults deployed through this factory.
    address[] public allVaults;

    /// @notice Mapping of owner address to list of deployed vaults.
    mapping(address => address[]) public vaultsByOwner;

    /// @notice Mapping to check if an address is a valid factory-deployed vault.
    mapping(address => bool) public isFactoryVault;

    // --- Deployment Function ---

    /// @notice Deploys a new InheritanceVault instance.
    /// @param initialOwner The address designated as vault owner.
    /// @param initialCheckInInterval Duration in seconds before inactivity triggers.
    /// @param initialTokens List of initial ERC-20 tokens to whitelist.
    /// @param consensusAddress Address of the deployed ProofOfLifeConsensus contract.
    /// @return vaultAddress The address of the newly deployed InheritanceVault.
    function deployVault(
        address initialOwner,
        uint256 initialCheckInInterval,
        address[] memory initialTokens,
        address consensusAddress
    ) external returns (address vaultAddress) {
        InheritanceVault vault = new InheritanceVault(
            initialOwner,
            initialCheckInInterval,
            initialTokens,
            consensusAddress
        );

        vaultAddress = address(vault);
        allVaults.push(vaultAddress);
        vaultsByOwner[initialOwner].push(vaultAddress);
        isFactoryVault[vaultAddress] = true;

        emit VaultDeployed(vaultAddress, initialOwner, initialCheckInInterval, consensusAddress);
    }

    // --- View Helpers ---

    /// @notice Returns the total count of deployed vaults.
    function allVaultsLength() external view returns (uint256) {
        return allVaults.length;
    }

    /// @notice Returns all vault addresses deployed for a specific owner.
    /// @param owner The owner address to query.
    function getVaultsByOwner(address owner) external view returns (address[] memory) {
        return vaultsByOwner[owner];
    }
}
