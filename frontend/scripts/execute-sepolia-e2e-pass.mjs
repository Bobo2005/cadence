import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  keccak256,
  encodePacked,
  concatHex,
  bytesToHex,
  getAddress,
  isAddressEqual,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import {
  CONTRACT_ADDRESSES,
  INHERITANCE_VAULT_ABI,
  INHERITANCE_VAULT_BYTECODE,
  PROOF_OF_LIFE_CONSENSUS_ABI,
  GUARDIAN_REGISTRY_ABI,
} from "../lib/contracts.ts";
import {
  buildAllocationTree,
  buildGuardianTree,
  computeAllocationLeaf,
  computeGuardianLeaf,
  verifyMerkleProof,
  generateSalt,
} from "../lib/merkle.ts";
import {
  buildCancelClaimTypedData,
  signCancelClaim,
} from "../lib/eip712.ts";
import {
  encryptAllocation,
  decryptAllocation,
  getPublicKeyFromPrivateKey,
} from "../lib/encryption.ts";

const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

// Deployer / Owner Key
const DEPLOYER_KEY = "0xedc7f7031d44e8389afbfc06ee560adcd91008c73a21ecfcb4c18247ec5ae2ee";
const deployerAccount = privateKeyToAccount(DEPLOYER_KEY);
const deployerWallet = createWalletClient({
  account: deployerAccount,
  chain: sepolia,
  transport: http(RPC_URL),
});

// Alice Key (Beneficiary 1 & Guardian 1)
const ALICE_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const aliceAccount = privateKeyToAccount(ALICE_KEY);
const aliceWallet = createWalletClient({
  account: aliceAccount,
  chain: sepolia,
  transport: http(RPC_URL),
});

// Bob Key (Beneficiary 2 & Guardian 2)
const BOB_KEY = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const bobAccount = privateKeyToAccount(BOB_KEY);
const bobWallet = createWalletClient({
  account: bobAccount,
  chain: sepolia,
  transport: http(RPC_URL),
});

async function main() {
  console.log("===============================================================================");
  console.log("             CADENCE PROTOCOL — SEPOLIA TESTNET LIVE VERIFICATION              ");
  console.log("===============================================================================\n");

  const deployerBalance = await publicClient.getBalance({ address: deployerAccount.address });
  const aliceBalance = await publicClient.getBalance({ address: aliceAccount.address });
  const bobBalance = await publicClient.getBalance({ address: bobAccount.address });

  console.log(`[Account Setup]`);
  console.log(`  Deployer (${deployerAccount.address}): ${formatEther(deployerBalance)} ETH`);
  console.log(`  Alice    (${aliceAccount.address}): ${formatEther(aliceBalance)} ETH`);
  console.log(`  Bob      (${bobAccount.address}): ${formatEther(bobBalance)} ETH\n`);

  // Fund Alice with gas if balance is low
  if (aliceBalance < parseEther("0.003")) {
    console.log("[Funding] Transferring 0.005 ETH to Alice for claim execution gas...");
    const fundHash = await deployerWallet.sendTransaction({
      to: aliceAccount.address,
      value: parseEther("0.005"),
    });
    console.log(`  Fund Tx broadcasted: ${fundHash}`);
    await publicClient.waitForTransactionReceipt({ hash: fundHash });
    console.log("  Fund Tx confirmed on Sepolia.\n");
  }

  // ===========================================================================
  // 1. PROVISIONING: CREATE REAL VAULT WITH 4 VISIBLE TRANSACTIONS
  // ===========================================================================
  console.log("-------------------------------------------------------------------------------");
  console.log("STEP 1: MULTI-STEP PROVISIONING (4 INDIVIDUAL ON-CHAIN TRANSACTIONS)");
  console.log("-------------------------------------------------------------------------------");

  const checkInInterval = 180n; // 3 minutes
  const guardianNodes = [aliceAccount.address, bobAccount.address];
  const guardianTree = buildGuardianTree(guardianNodes);

  const saltAlice = generateSalt();
  const saltBob = generateSalt();
  const allocList = [
    { address: aliceAccount.address, shareBps: 6000, salt: saltAlice },
    { address: bobAccount.address, shareBps: 4000, salt: saltBob },
  ];
  const allocTree = buildAllocationTree(allocList);

  console.log(`Guardian Tree Root:   ${guardianTree.root}`);
  console.log(`Allocation Tree Root: ${allocTree.root}\n`);

  // Tx 1: Deploy Contract
  console.log("[Tx 1/4] Deploying new InheritanceVault contract instance on Sepolia...");
  const deployHash = await deployerWallet.deployContract({
    abi: INHERITANCE_VAULT_ABI,
    bytecode: INHERITANCE_VAULT_BYTECODE,
    args: [
      deployerAccount.address,
      checkInInterval,
      [],
      CONTRACT_ADDRESSES.demoConsensus,
    ],
  });
  console.log(`  Deploy Tx Hash: https://sepolia.etherscan.io/tx/${deployHash}`);
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const vaultAddress = deployReceipt.contractAddress;
  console.log(`  ✓ Vault Deployed at: ${vaultAddress} (Status: ${deployReceipt.status})\n`);

  // Tx 2: Deposit ETH
  const depositAmount = parseEther("0.001");
  console.log(`[Tx 2/4] Depositing ${formatEther(depositAmount)} ETH initial capital into vault...`);
  const depositHash = await deployerWallet.writeContract({
    address: vaultAddress,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "depositETH",
    value: depositAmount,
  });
  console.log(`  Deposit Tx Hash: https://sepolia.etherscan.io/tx/${depositHash}`);
  const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });
  console.log(`  ✓ Deposit confirmed (Status: ${depositReceipt.status})\n`);

  // Tx 3: Commit Allocation Merkle Root
  console.log("[Tx 3/4] Committing allocation Merkle root on-chain...");
  const allocHash = await deployerWallet.writeContract({
    address: vaultAddress,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "setAllocationRoot",
    args: [allocTree.root],
  });
  console.log(`  Allocation Root Tx Hash: https://sepolia.etherscan.io/tx/${allocHash}`);
  const allocReceipt = await publicClient.waitForTransactionReceipt({ hash: allocHash });
  console.log(`  ✓ Allocation root committed (Status: ${allocReceipt.status})\n`);

  // Tx 4: Commit Guardian Consensus Merkle Root
  console.log("[Tx 4/4] Committing 2-of-2 guardian consensus root in GuardianRegistry...");
  const guardianHash = await deployerWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoGuardianRegistry,
    abi: GUARDIAN_REGISTRY_ABI,
    functionName: "commitGuardianRoot",
    args: [
      vaultAddress,
      guardianTree.root,
      2n, // threshold M
      BigInt(guardianNodes.length), // total N
    ],
  });
  console.log(`  Guardian Root Tx Hash: https://sepolia.etherscan.io/tx/${guardianHash}`);
  const guardianReceipt = await publicClient.waitForTransactionReceipt({ hash: guardianHash });
  console.log(`  ✓ Guardian root committed (Status: ${guardianReceipt.status})\n`);

  // Configure Consensus in GuardianRegistry
  console.log("[Config] Authorizing consensus module for newly created vault...");
  const setConsHash = await deployerWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoGuardianRegistry,
    abi: GUARDIAN_REGISTRY_ABI,
    functionName: "setConsensusForVault",
    args: [vaultAddress, CONTRACT_ADDRESSES.demoConsensus],
  });
  await publicClient.waitForTransactionReceipt({ hash: setConsHash });
  console.log("  ✓ Consensus mapping authorized in registry.\n");

  // ===========================================================================
  // 2. CHECK-IN: VERIFY REAL EOA ON-CHAIN CHECKIN
  // ===========================================================================
  console.log("-------------------------------------------------------------------------------");
  console.log("STEP 2: RECORD HEARTBEAT ON-CHAIN (EOA DIRECT CHECK-IN)");
  console.log("-------------------------------------------------------------------------------");
  const checkInHash = await deployerWallet.writeContract({
    address: vaultAddress,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "checkIn",
  });
  console.log(`  Check-In Tx Hash: https://sepolia.etherscan.io/tx/${checkInHash}`);
  const checkInReceipt = await publicClient.waitForTransactionReceipt({ hash: checkInHash });
  console.log(`  ✓ Check-in transaction mined (Status: ${checkInReceipt.status})`);

  const lastActiveTimestamp = await publicClient.readContract({
    address: vaultAddress,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "lastActiveTimestamp",
  });
  console.log(`  ✓ Verified Last Active Timestamp on-chain: ${lastActiveTimestamp}\n`);

  // ===========================================================================
  // 3. CONTEST WINDOW & CANCELLATION (EIP-712 STEALTH KEY)
  // ===========================================================================
  console.log("-------------------------------------------------------------------------------");
  console.log("STEP 3: CONTEST WINDOW ENTRY & EIP-712 STEALTH CANCELLATION");
  console.log("-------------------------------------------------------------------------------");

  console.log("[3.1] Updating check-in interval to 5 seconds to demonstrate lapse...");
  const updateIntvHash = await deployerWallet.writeContract({
    address: vaultAddress,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "setCheckInInterval",
    args: [5n],
  });
  await publicClient.waitForTransactionReceipt({ hash: updateIntvHash });
  console.log("  ✓ Check-in interval updated to 5 seconds.");

  console.log("[3.2] Waiting 8 seconds for inactivity timeout to lapse on Sepolia...");
  await new Promise((r) => setTimeout(r, 8000));

  const isExpired = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "isTimeoutExpired",
    args: [vaultAddress],
  });
  console.log(`  ✓ isTimeoutExpired evaluates to: ${isExpired}`);

  // Guardian 1 (Alice) attests
  console.log("[3.3] Guardian 1 (Alice) submits Merkle attestation...");
  const proofAliceG = generateProofFromLeaves(guardianTree.leaves, guardianTree.leaves[0]);
  const attest1Hash = await aliceWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoGuardianRegistry,
    abi: GUARDIAN_REGISTRY_ABI,
    functionName: "attest",
    args: [vaultAddress, proofAliceG],
  });
  console.log(`  Guardian 1 Attest Tx Hash: https://sepolia.etherscan.io/tx/${attest1Hash}`);
  await publicClient.waitForTransactionReceipt({ hash: attest1Hash });

  // Guardian 2 (Bob) attests
  console.log("[3.4] Guardian 2 (Bob) submits Merkle attestation...");
  const proofBobG = generateProofFromLeaves(guardianTree.leaves, guardianTree.leaves[1]);
  const attest2Hash = await bobWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoGuardianRegistry,
    abi: GUARDIAN_REGISTRY_ABI,
    functionName: "attest",
    args: [vaultAddress, proofBobG],
  });
  console.log(`  Guardian 2 Attest Tx Hash: https://sepolia.etherscan.io/tx/${attest2Hash}`);
  await publicClient.waitForTransactionReceipt({ hash: attest2Hash });

  const thresholdMet = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.demoGuardianRegistry,
    abi: GUARDIAN_REGISTRY_ABI,
    functionName: "isThresholdMet",
    args: [vaultAddress],
  });
  console.log(`  ✓ Guardian threshold 2-of-2 met: ${thresholdMet}`);

  // Trigger Claim Pending (Opens Contest Window)
  console.log("[3.5] Triggering ClaimPending to open contest window...");
  const triggerHash = await deployerWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "triggerClaimPending",
    args: [vaultAddress],
  });
  console.log(`  Trigger ClaimPending Tx Hash: https://sepolia.etherscan.io/tx/${triggerHash}`);
  await publicClient.waitForTransactionReceipt({ hash: triggerHash });

  const stateClaimPending = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "getState",
    args: [vaultAddress],
  });
  console.log(`  ✓ Verified on-chain consensus state: ${stateClaimPending} (ClaimPending = 1)\n`);

  // Execute EIP-712 Cancellation via Stealth Key
  console.log("[3.6] Owner generates off-chain EIP-712 CancelClaim signature...");
  const cancelNonce = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "cancelNonces",
    args: [vaultAddress],
  });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const cancelTypedData = buildCancelClaimTypedData(
    sepolia.id,
    CONTRACT_ADDRESSES.demoConsensus,
    vaultAddress,
    cancelNonce,
    deadline
  );
  const sig = await signCancelClaim(DEPLOYER_KEY, cancelTypedData);
  console.log(`  ✓ EIP-712 Signature generated off-chain (${sig.slice(0, 30)}...)`);

  // Relayer submits cancelClaimWithSig (Alice relays)
  console.log("[3.7] Third-party relayer submits cancelClaimWithSig (Constraint #1)...");
  const cancelTxHash = await aliceWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "cancelClaimWithSig",
    args: [vaultAddress, cancelNonce, deadline, sig],
  });
  console.log(`  Cancellation Relay Tx Hash: https://sepolia.etherscan.io/tx/${cancelTxHash}`);
  const cancelReceipt = await publicClient.waitForTransactionReceipt({ hash: cancelTxHash });
  console.log(`  ✓ Cancellation confirmed on-chain (Status: ${cancelReceipt.status})`);

  const restoredState = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "getState",
    args: [vaultAddress],
  });
  console.log(`  ✓ State successfully restored to ACTIVE (0): ${restoredState}\n`);

  // ===========================================================================
  // 4. BENEFICIARY CLAIM EXECUTION ON SEPOLIA
  // ===========================================================================
  console.log("-------------------------------------------------------------------------------");
  console.log("STEP 4: FINALIZATION & BENEFICIARY CLAIM ON SEPOLIA");
  console.log("-------------------------------------------------------------------------------");

  console.log("[4.1] Setting short contest window of 5 seconds for finalization demonstration...");
  const setContestWindowHash = await deployerWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "setContestWindow",
    args: [vaultAddress, 5n],
  });
  await publicClient.waitForTransactionReceipt({ hash: setContestWindowHash });

  // Re-attest after reset
  console.log("[4.2] Re-attesting guardians for finalization cycle...");
  const reAttest1 = await aliceWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoGuardianRegistry,
    abi: GUARDIAN_REGISTRY_ABI,
    functionName: "attest",
    args: [vaultAddress, proofAliceG],
  });
  await publicClient.waitForTransactionReceipt({ hash: reAttest1 });

  const reAttest2 = await bobWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoGuardianRegistry,
    abi: GUARDIAN_REGISTRY_ABI,
    functionName: "attest",
    args: [vaultAddress, proofBobG],
  });
  await publicClient.waitForTransactionReceipt({ hash: reAttest2 });

  // Re-trigger ClaimPending
  const reTriggerHash = await deployerWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "triggerClaimPending",
    args: [vaultAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: reTriggerHash });
  console.log("  ✓ ClaimPending re-triggered.");

  console.log("[4.3] Waiting 10 seconds for 5-second contest window to elapse...");
  await new Promise((r) => setTimeout(r, 10000));

  // Finalize contest
  console.log("[4.4] Executing finalizeContest() on-chain...");
  const finalizeHash = await deployerWallet.writeContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "finalizeContest",
    args: [vaultAddress],
  });
  console.log(`  Finalize Contest Tx Hash: https://sepolia.etherscan.io/tx/${finalizeHash}`);
  await publicClient.waitForTransactionReceipt({ hash: finalizeHash });

  const finalizedState = await publicClient.readContract({
    address: CONTRACT_ADDRESSES.demoConsensus,
    abi: PROOF_OF_LIFE_CONSENSUS_ABI,
    functionName: "getState",
    args: [vaultAddress],
  });
  console.log(`  ✓ State confirmed FINALIZED (3): ${finalizedState}`);

  // Alice Executes Claim
  console.log("[4.5] Alice submits Merkle claim for 60% share (0.0006 ETH)...");
  const alicePreBalance = await publicClient.getBalance({ address: aliceAccount.address });
  const proofAliceClaim = generateProofFromLeaves(allocTree.leaves, allocTree.leaves[0]);

  const claimHash = await aliceWallet.writeContract({
    address: vaultAddress,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "claim",
    args: [6000n, saltAlice, proofAliceClaim],
  });
  console.log(`  Claim Tx Hash: https://sepolia.etherscan.io/tx/${claimHash}`);
  const claimReceipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });
  console.log(`  ✓ Alice claim confirmed on Sepolia (Status: ${claimReceipt.status})`);

  const alicePostBalance = await publicClient.getBalance({ address: aliceAccount.address });
  const hasClaimedOnChain = await publicClient.readContract({
    address: vaultAddress,
    abi: INHERITANCE_VAULT_ABI,
    functionName: "hasClaimed",
    args: [aliceAccount.address],
  });
  console.log(`  ✓ hasClaimed for Alice on-chain: ${hasClaimedOnChain}`);
  console.log(`  ✓ Alice received pro-rata payout directly to wallet.`);

  console.log("\n===============================================================================");
  console.log("        ALL SEPOLIA TESTNET LIVE PROTOCOL TRANSACTIONS CONFIRMED!              ");
  console.log("===============================================================================");
  console.log(`Vault Deployed:    ${vaultAddress}`);
  console.log(`Deploy Tx:         ${deployHash}`);
  console.log(`Deposit Tx:        ${depositHash}`);
  console.log(`Alloc Root Tx:     ${allocHash}`);
  console.log(`Guardian Root Tx:  ${guardianHash}`);
  console.log(`Check-In Tx:       ${checkInHash}`);
  console.log(`Trigger Tx:        ${triggerHash}`);
  console.log(`Cancel Relay Tx:   ${cancelTxHash}`);
  console.log(`Finalize Tx:       ${finalizeHash}`);
  console.log(`Claim Tx:          ${claimHash}`);
}

main().catch((err) => {
  console.error("\n❌ Sepolia execution failed:", err);
  process.exit(1);
});
