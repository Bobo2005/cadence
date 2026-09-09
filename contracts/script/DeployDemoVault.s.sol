// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {StealthAddressRegistry} from "../src/StealthAddressRegistry.sol";
import {GuardianRegistry} from "../src/GuardianRegistry.sol";
import {BalanceCommitment} from "../src/BalanceCommitment.sol";
import {ProofOfLifeConsensus} from "../src/ProofOfLifeConsensus.sol";
import {InheritanceVault} from "../src/InheritanceVault.sol";
import {BeneficiaryAccountFactory} from "../src/BeneficiarySmartAccount.sol";
import {MerkleProofLib} from "../src/libraries/MerkleProofLib.sol";

/// @title DeployDemoVault
/// @notice Deploys a dedicated demo-only Cadence vault on Sepolia with an accelerated check-in
///         interval (e.g. 3 minutes) for live presentations and evaluators.
/// @dev Uses the EXACT same InheritanceVault and ProofOfLifeConsensus contracts as production.
///      No special-cased demo mode logic exists in the contracts themselves.
///
/// Run with:
///   forge script script/DeployDemoVault.s.sol:DeployDemoVault --rpc-url $SEPOLIA_RPC_URL --broadcast
contract DeployDemoVault is Script {
    // ERC-4337 EntryPoint v0.7 standard address
    address public constant ENTRY_POINT_07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;

    // Demo Guardian Personas with correct EIP-55 checksums
    address public constant GUARDIAN_1 = 0x81C3D582F3473F71C4C8bF394E1d32BA218991a2;
    address public constant GUARDIAN_2 = 0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0;

    // Demo Beneficiary Personas (Alice 40%, Bob 60%)
    address public constant BENEFICIARY_ALICE = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address public constant BENEFICIARY_BOB = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

    bytes32 public constant SALT_ALICE = 0x3775de7618f64194e824147385918237cbaf017238bfa872361bdf9812738912;
    bytes32 public constant SALT_BOB = 0x98127398127389123f5c128e4981ad68dfa8918237cbaf017238bfa872361bdf;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(deployerPrivateKey);

        // Accelerated intervals for presentation demo: default 3 minutes (180s)
        uint256 checkInInterval = vm.envOr("DEMO_CHECK_IN_INTERVAL", uint256(180)); // 3 minutes
        uint256 contestDuration = vm.envOr("DEMO_CONTEST_DURATION", uint256(900));   // 15 minutes

        address existingConsensus = vm.envOr("CONSENSUS_ADDRESS", address(0));
        address existingGuardianRegistry = vm.envOr("GUARDIAN_REGISTRY_ADDRESS", address(0));

        console2.log("=================================================================");
        console2.log("       DEPLOYING ACCELERATED CADENCE DEMO VAULT (SEPOLIA)        ");
        console2.log("=================================================================");
        console2.log("Deployer Address:       ", deployer);
        console2.log("Check-In Interval (sec):", checkInInterval);
        console2.log("Contest Window (sec):   ", contestDuration);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Resolve or deploy GuardianRegistry
        GuardianRegistry guardianRegistry = _resolveGuardianRegistry(existingGuardianRegistry);

        // 2. Resolve or deploy ProofOfLifeConsensus
        ProofOfLifeConsensus consensus = _resolveConsensus(existingConsensus, address(guardianRegistry));

        // 3. Deploy dedicated demo InheritanceVault with short interval
        address[] memory initialTokens = new address[](0);
        InheritanceVault demoVault = new InheritanceVault(
            deployer,
            checkInInterval,
            initialTokens,
            address(consensus)
        );
        console2.log("Deployed Demo InheritanceVault at:", address(demoVault));

        // 4. Commit Demo Guardian Merkle Root (2-of-2 threshold met by Guardian 1 & 2)
        // Sets deployer as authorized vaultOwner in GuardianRegistry
        _commitDemoGuardians(guardianRegistry, address(demoVault));

        // 5. Configure consensus for this vault in GuardianRegistry
        guardianRegistry.setConsensusForVault(address(demoVault), address(consensus));

        // 6. If contestDuration differs from default 72 hours, set it
        if (contestDuration != 72 hours) {
            consensus.setContestWindow(address(demoVault), contestDuration);
            console2.log("Configured custom contest window:", contestDuration, "seconds");
        }

        // 7. Commit Demo Allocation Merkle Root (Alice 40%, Bob 60%)
        _commitDemoAllocations(demoVault);

        // 8. Deposit initial ETH capital if funded
        uint256 depositAmount = vm.envOr("DEMO_DEPOSIT_WEI", uint256(0.05 ether));
        if (deployer.balance >= depositAmount && depositAmount > 0) {
            demoVault.depositETH{value: depositAmount}();
            console2.log("Funded Demo Vault with:", depositAmount / 1e18, "ETH");
        }

        vm.stopBroadcast();

        console2.log("\n=================================================================");
        console2.log("                    DEMO VAULT SETUP COMPLETE                    ");
        console2.log("=================================================================");
        console2.log("NEXT_PUBLIC_DEMO_VAULT_ADDRESS=", address(demoVault));
        console2.log("NEXT_PUBLIC_CONSENSUS_ADDRESS=", address(consensus));
        console2.log("NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS=", address(guardianRegistry));
        console2.log("Owner / Deployer:              ", deployer);
        console2.log("Check-in Interval:             ", checkInInterval, "seconds");
        console2.log("Inactivity Timeout Trigger:    ~", block.timestamp + checkInInterval);
        console2.log("-----------------------------------------------------------------");
    }

    function _resolveGuardianRegistry(address existing) internal returns (GuardianRegistry) {
        if (existing != address(0)) {
            console2.log("Using existing GuardianRegistry at:", existing);
            return GuardianRegistry(existing);
        }
        GuardianRegistry reg = new GuardianRegistry();
        console2.log("Deployed fresh GuardianRegistry at:", address(reg));
        return reg;
    }

    function _resolveConsensus(address existing, address guardianReg) internal returns (ProofOfLifeConsensus) {
        if (existing != address(0)) {
            console2.log("Using existing ProofOfLifeConsensus at:", existing);
            return ProofOfLifeConsensus(existing);
        }
        ProofOfLifeConsensus cons = new ProofOfLifeConsensus(guardianReg);
        console2.log("Deployed fresh ProofOfLifeConsensus at:", address(cons));
        return cons;
    }

    function _commitDemoGuardians(GuardianRegistry registry, address vault) internal {
        bytes32 gLeaf1 = MerkleProofLib.computeGuardianLeaf(GUARDIAN_1);
        bytes32 gLeaf2 = MerkleProofLib.computeGuardianLeaf(GUARDIAN_2);
        bytes32 guardianRoot = gLeaf1 < gLeaf2
            ? keccak256(abi.encodePacked(gLeaf1, gLeaf2))
            : keccak256(abi.encodePacked(gLeaf2, gLeaf1));

        registry.commitGuardianRoot(vault, guardianRoot, 2, 2);
        console2.log("Committed Guardian Merkle Root: 2-of-2 threshold met by Guardian 1 & 2");
    }

    function _commitDemoAllocations(InheritanceVault vault) internal {
        bytes32 aLeaf1 = MerkleProofLib.computeAllocationLeaf(BENEFICIARY_ALICE, 4000, SALT_ALICE);
        bytes32 aLeaf2 = MerkleProofLib.computeAllocationLeaf(BENEFICIARY_BOB, 6000, SALT_BOB);
        bytes32 allocationRoot = aLeaf1 < aLeaf2
            ? keccak256(abi.encodePacked(aLeaf1, aLeaf2))
            : keccak256(abi.encodePacked(aLeaf2, aLeaf1));

        vault.setAllocationRoot(allocationRoot);
        console2.log("Committed Allocation Merkle Root for Alice (40%) and Bob (60%)");
    }
}
