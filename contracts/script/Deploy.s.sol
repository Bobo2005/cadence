// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {StealthAddressRegistry} from "../src/StealthAddressRegistry.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {BalanceCommitment} from "../src/BalanceCommitment.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {BeneficiaryAccountFactory} from "../src/BeneficiarySmartAccount.sol";
import {VaultFactory} from "../src/VaultFactory.sol";

/// @title Deploy
/// @notice Foundry deployment script for all Cadence contracts to Sepolia.
/// @dev Run with: forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast --verify
contract Deploy is Script {
    // ERC-4337 EntryPoint v0.7 standard address
    address public constant ENTRY_POINT_07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying Cadence protocol contracts from:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy StealthAddressRegistry
        StealthAddressRegistry stealthRegistry = new StealthAddressRegistry();
        console2.log("StealthAddressRegistry deployed at:", address(stealthRegistry));

        // 2. Deploy GuardianRegistry
        GuardianRegistry guardianRegistry = new GuardianRegistry();
        console2.log("GuardianRegistry deployed at:", address(guardianRegistry));

        // 3. Deploy BalanceCommitment
        BalanceCommitment balanceCommitment = new BalanceCommitment();
        console2.log("BalanceCommitment deployed at:", address(balanceCommitment));

        // 4. Deploy ProofOfLifeConsensus (passes GuardianRegistry)
        ProofOfLifeConsensus consensus = new ProofOfLifeConsensus(address(guardianRegistry));
        console2.log("ProofOfLifeConsensus deployed at:", address(consensus));

        // 5. Deploy Demo InheritanceVault (90 days interval, empty initial tokens)
        address[] memory initialTokens = new address[](0);
        InheritanceVault demoVault = new InheritanceVault(
            deployer,
            90 days,
            initialTokens,
            address(consensus)
        );
        console2.log("Demo InheritanceVault deployed at:", address(demoVault));

        // Commit initial guardian root (deployer as initial guardian) so vault is registered in GuardianRegistry
        bytes32 defaultGuardianRoot = keccak256(abi.encodePacked(deployer));
        guardianRegistry.commitGuardianRoot(address(demoVault), defaultGuardianRoot, 1, 1);

        // Configure consensus address in GuardianRegistry for demo vault
        guardianRegistry.setConsensusForVault(address(demoVault), address(consensus));

        // 6. Deploy VaultFactory
        VaultFactory vaultFactory = new VaultFactory();
        console2.log("VaultFactory deployed at:", address(vaultFactory));

        // 7. Deploy BeneficiaryAccountFactory (passes EntryPoint v0.7)
        BeneficiaryAccountFactory accountFactory = new BeneficiaryAccountFactory(ENTRY_POINT_07);
        console2.log("BeneficiaryAccountFactory deployed at:", address(accountFactory));

        vm.stopBroadcast();

        console2.log("--- Deployment Complete ---");
        console2.log("Summary for frontend .env.local:");
        console2.log("NEXT_PUBLIC_VAULT_ADDRESS=", address(demoVault));
        console2.log("NEXT_PUBLIC_CONSENSUS_ADDRESS=", address(consensus));
        console2.log("NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS=", address(guardianRegistry));
        console2.log("NEXT_PUBLIC_STEALTH_REGISTRY_ADDRESS=", address(stealthRegistry));
        console2.log("NEXT_PUBLIC_BALANCE_COMMITMENT_ADDRESS=", address(balanceCommitment));
        console2.log("NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=", address(vaultFactory));
        console2.log("NEXT_PUBLIC_FACTORY_ADDRESS=", address(accountFactory));
    }
}
