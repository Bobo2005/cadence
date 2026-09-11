// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {InheritanceVault} from "./InheritanceVault.sol";
import {IProofOfLifeConsensus} from "./interfaces/IProofOfLifeConsensus.sol";
import {IGuardianRegistry} from "./interfaces/IGuardianRegistry.sol";

/// @title OneClickInheritanceVault
/// @notice All-in-one deployer for Cadence Inheritance Vaults.
/// @dev Bundles vault deployment, initial ETH deposit, allocation Merkle root commitment,
///      guardian Merkle root commitment, and custom contest window into a SINGLE transaction,
///      reducing wallet signatures from 4 down to 1.
contract OneClickInheritanceVault is InheritanceVault {
    constructor(
        address initialOwner,
        uint256 initialCheckInInterval,
        uint256 contestWindowDuration,
        bytes32 initialAllocationRoot,
        address guardianRegistryAddress,
        bytes32 initialGuardianRoot,
        uint256 guardianThreshold,
        uint256 totalGuardians,
        address consensusAddress
    ) payable InheritanceVault(
        initialOwner,
        initialCheckInInterval,
        new address[](0),
        consensusAddress
    ) {
        // 1. Configure custom contest window (grace period) if specified
        if (contestWindowDuration > 0 && contestWindowDuration != 72 hours) {
            consensus.setContestWindow(address(this), contestWindowDuration);
        }

        // 2. Commit Allocation Merkle Root
        if (initialAllocationRoot != bytes32(0)) {
            allocationRoot = initialAllocationRoot;
            emit AllocationRootCommitted(initialAllocationRoot, block.timestamp);
        }

        // 3. Commit Guardian Merkle Root in GuardianRegistry
        if (initialGuardianRoot != bytes32(0) && guardianRegistryAddress != address(0)) {
            IGuardianRegistry(guardianRegistryAddress).commitGuardianRoot(
                address(this),
                initialGuardianRoot,
                guardianThreshold,
                totalGuardians
            );
            IGuardianRegistry(guardianRegistryAddress).setConsensusForVault(
                address(this),
                consensusAddress
            );
        }

        // 4. Accept initial ETH deposit directly in deployment transaction
        if (msg.value > 0) {
            totalDeposited[address(0)] += msg.value;
            emit Deposit(initialOwner, address(0), msg.value);
        }
    }
}
