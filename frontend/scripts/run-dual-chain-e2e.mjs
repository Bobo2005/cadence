/**
 * run-dual-chain-e2e.mjs
 *
 * Full End-to-End Lifecycle Verification on BOTH Live Testnets:
 * 1. Arbitrum Sepolia (Chain ID: 421614)
 * 2. Robinhood Chain Testnet (Chain ID: 46630)
 *
 * Exercises all required protocol phases:
 *   - USDG-denominated deposit and whitelist verification
 *   - Check-in heartbeat execution and lastActiveTimestamp verification
 *   - Inactivity timeout simulation
 *   - Guardian consensus with Guardian Resilience backup-activation path (attestAsBackup)
 *   - Contest window transition (Active -> ClaimPending)
 *   - Cancel path (ClaimPending -> Active)
 *   - Separate finalize path (ClaimPending -> Finalized)
 *   - Decrypt & Claim verification for USDG (40% Alice, 60% Bob, residual vault balance 0)
 *   - Real on-chain assertion and status confirmation across both networks
 */

import fs from "fs";
import path from "path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  keccak256,
  concatHex,
  encodePacked,
  encodeAbiParameters,
  getAddress,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

// -----------------------------------------------------------------------------
// 1. Network Definitions & Configuration
// -----------------------------------------------------------------------------

const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: { name: "Robinhood Explorer", url: "https://explorer.testnet.chain.robinhood.com" },
  },
});

// Load environment variables from contracts/.env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), "contracts/.env");
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing contracts/.env file at ${envPath}`);
  }
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) {
      env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const PRIVATE_KEY = env.PRIVATE_KEY.startsWith("0x") ? env.PRIVATE_KEY : `0x${env.PRIVATE_KEY}`;
const ARB_SEPOLIA_RPC = env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const RH_TESTNET_RPC = env.ROBINHOOD_TESTNET_RPC_URL || "https://rpc.testnet.chain.robinhood.com";

// Load compiled contract artifacts from contracts/out
function loadArtifact(relativePath) {
  const artifactPath = path.resolve(process.cwd(), "contracts/out", relativePath);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run 'forge build' first.`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

const MockERC20Artifact = loadArtifact("MockERC20.sol/MockERC20.json");
const GuardianRegistryArtifact = loadArtifact("GuardianRegistry.sol/GuardianRegistry.json");
const ConsensusArtifact = loadArtifact("ProofOfLifeConsensus.sol/ProofOfLifeConsensus.json");
const InheritanceVaultArtifact = loadArtifact("InheritanceVault.sol/InheritanceVault.json");

// -----------------------------------------------------------------------------
// 2. Cryptographic Helpers (Double-Hashed Merkle Trees)
// -----------------------------------------------------------------------------

function hashPair(a, b) {
  const aClean = a.toLowerCase();
  const bClean = b.toLowerCase();
  return aClean <= bClean
    ? keccak256(concatHex([a, b]))
    : keccak256(concatHex([b, a]));
}

function computeGuardianLeaf(addr) {
  const encoded = encodeAbiParameters([{ type: "address" }], [getAddress(addr)]);
  const inner = keccak256(encoded);
  return keccak256(inner);
}

function computeAllocationLeaf(addr, shareBps, salt) {
  const encoded = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "bytes32" }],
    [getAddress(addr), BigInt(shareBps), salt]
  );
  const inner = keccak256(encoded);
  return keccak256(inner);
}

// -----------------------------------------------------------------------------
// 3. Dual-Chain Test Execution
// -----------------------------------------------------------------------------

async function runLifecycleOnChain(chainConfig) {
  const { name, chain, rpcUrl } = chainConfig;

  console.log("\n" + "=".repeat(80));
  console.log(`  STARTING COMPLETE END-TO-END LIFECYCLE ON: ${name.toUpperCase()}`);
  console.log(`  Chain ID: ${chain.id} | RPC: ${rpcUrl}`);
  console.log("=".repeat(80) + "\n");

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl, { timeout: 30000, retryCount: 3 }),
  });

  const deployerAccount = privateKeyToAccount(PRIVATE_KEY);
  const deployerWallet = createWalletClient({
    account: deployerAccount,
    chain,
    transport: http(rpcUrl, { timeout: 30000, retryCount: 3 }),
  });

  // Secondary deterministic personas for multi-party flows
  const guardian1Account = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  const guardian1BackupAccount = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  const guardian2Account = privateKeyToAccount("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
  const aliceAccount = privateKeyToAccount("0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a");
  const bobAccount = privateKeyToAccount("0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba");

  const guardian1Wallet = createWalletClient({ account: guardian1Account, chain, transport: http(rpcUrl) });
  const guardian1BackupWallet = createWalletClient({ account: guardian1BackupAccount, chain, transport: http(rpcUrl) });
  const guardian2Wallet = createWalletClient({ account: guardian2Account, chain, transport: http(rpcUrl) });
  const aliceWallet = createWalletClient({ account: aliceAccount, chain, transport: http(rpcUrl) });
  const bobWallet = createWalletClient({ account: bobAccount, chain, transport: http(rpcUrl) });

  const deployerBalance = await publicClient.getBalance({ address: deployerAccount.address });
  console.log(`[Account Status]`);
  console.log(`  Deployer (${deployerAccount.address}): ${formatEther(deployerBalance)} ETH`);
  console.log(`  Guardian 1:        ${guardian1Account.address}`);
  console.log(`  Guardian 1 Backup: ${guardian1BackupAccount.address}`);
  console.log(`  Guardian 2:        ${guardian2Account.address}`);
  console.log(`  Alice:             ${aliceAccount.address}`);
  console.log(`  Bob:               ${bobAccount.address}\n`);

  // Ensure personas have sufficient gas on this testnet
  const gasFundingAccounts = [
    guardian1Account.address,
    guardian1BackupAccount.address,
    guardian2Account.address,
    aliceAccount.address,
    bobAccount.address,
  ];

  for (const recipient of gasFundingAccounts) {
    const bal = await publicClient.getBalance({ address: recipient });
    if (bal < parseEther("0.0002")) {
      console.log(`[Funding] Providing 0.0003 ETH gas buffer to persona ${recipient}...`);
      const h = await deployerWallet.sendTransaction({
        to: recipient,
        value: parseEther("0.0003"),
      });
      await publicClient.waitForTransactionReceipt({ hash: h });
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 1: DEPLOY SUITE (USDG Token, GuardianRegistry, Consensus, Vault)
  // ---------------------------------------------------------------------------
  console.log("-------------------------------------------------------------------------------");
  console.log("STEP 1: DEPLOYING DEDICATED CONTRACT SUITE FOR FULL LIFECYCLE RUN");
  console.log("-------------------------------------------------------------------------------");

  // 1.1 Deploy Mock USDG
  console.log("  [1/4] Deploying Paxos Global Dollar (USDG Mock ERC-20)...");
  const usdgDeployTx = await deployerWallet.deployContract({
    abi: MockERC20Artifact.abi,
    bytecode: MockERC20Artifact.bytecode.object,
    args: ["Paxos Global Dollar", "USDG", 6],
  });
  const usdgReceipt = await publicClient.waitForTransactionReceipt({ hash: usdgDeployTx });
  const usdgAddress = usdgReceipt.contractAddress;
  console.log(`        ✓ USDG Deployed at: ${usdgAddress} (Tx: ${usdgDeployTx})`);

  // Mint USDG to deployer
  const mintTx = await deployerWallet.writeContract({
    address: usdgAddress,
    abi: MockERC20Artifact.abi,
    functionName: "mint",
    args: [deployerAccount.address, 100_000n * 1_000_000n],
  });
  await publicClient.waitForTransactionReceipt({ hash: mintTx });
  console.log(`        ✓ Minted 100,000 USDG to Deployer`);

  // 1.2 Deploy GuardianRegistry
  console.log("  [2/4] Deploying GuardianRegistry with Guardian Resilience support...");
  const grDeployTx = await deployerWallet.deployContract({
    abi: GuardianRegistryArtifact.abi,
    bytecode: GuardianRegistryArtifact.bytecode.object,
  });
  const grReceipt = await publicClient.waitForTransactionReceipt({ hash: grDeployTx });
  const guardianRegistryAddress = grReceipt.contractAddress;
  console.log(`        ✓ GuardianRegistry Deployed at: ${guardianRegistryAddress}`);

  // 1.3 Deploy ProofOfLifeConsensus
  console.log("  [3/4] Deploying ProofOfLifeConsensus primitive...");
  const consDeployTx = await deployerWallet.deployContract({
    abi: ConsensusArtifact.abi,
    bytecode: ConsensusArtifact.bytecode.object,
    args: [guardianRegistryAddress],
  });
  const consReceipt = await publicClient.waitForTransactionReceipt({ hash: consDeployTx });
  const consensusAddress = consReceipt.contractAddress;
  console.log(`        ✓ ProofOfLifeConsensus Deployed at: ${consensusAddress}`);

  // 1.4 Deploy InheritanceVault (USDG whitelisted, 3-second heartbeat for live test)
  console.log("  [4/4] Deploying InheritanceVault (USDG-denominated, 3s heartbeat interval)...");
  const initialInterval = 3n; // 3 seconds for live timeout simulation
  const vaultDeployTx = await deployerWallet.deployContract({
    abi: InheritanceVaultArtifact.abi,
    bytecode: InheritanceVaultArtifact.bytecode.object,
    args: [deployerAccount.address, initialInterval, [usdgAddress], consensusAddress],
  });
  const vaultReceipt = await publicClient.waitForTransactionReceipt({ hash: vaultDeployTx });
  const vaultAddress = vaultReceipt.contractAddress;
  console.log(`        ✓ InheritanceVault Deployed at: ${vaultAddress}`);

  // ---------------------------------------------------------------------------
  // STEP 2: CONFIGURE TREES, CONTEST WINDOW & BACKUP WAITING PERIOD
  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("STEP 2: CONFIGURING MERKLE ROOTS & ACCELERATED TESTNET WINDOWS");
  console.log("-------------------------------------------------------------------------------");

  // Build Guardian Merkle tree (2-of-2 threshold: Guardian 1 and Guardian 2)
  const gLeaf1 = computeGuardianLeaf(guardian1Account.address);
  const gLeaf2 = computeGuardianLeaf(guardian2Account.address);
  const guardianRoot = hashPair(gLeaf1, gLeaf2);
  const gProof1 = [gLeaf2];
  const gProof2 = [gLeaf1];

  console.log(`  Guardian 1 Leaf: ${gLeaf1}`);
  console.log(`  Guardian 2 Leaf: ${gLeaf2}`);
  console.log(`  Guardian Root:   ${guardianRoot}`);

  const commitGRTx = await deployerWallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "commitGuardianRoot",
    args: [vaultAddress, guardianRoot, 2n, 2n],
  });
  await publicClient.waitForTransactionReceipt({ hash: commitGRTx });
  console.log(`  ✓ Committed 2-of-2 Guardian Root in GuardianRegistry`);

  const setConsTx = await deployerWallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "setConsensusForVault",
    args: [vaultAddress, consensusAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: setConsTx });
  console.log(`  ✓ Authorized Consensus in GuardianRegistry`);

  // Set contest window to 12 seconds for live test (allows reliable cancellation window)
  const setContestTx = await deployerWallet.writeContract({
    address: consensusAddress,
    abi: ConsensusArtifact.abi,
    functionName: "setContestWindow",
    args: [vaultAddress, 12n],
  });
  await publicClient.waitForTransactionReceipt({ hash: setContestTx });
  console.log(`  ✓ Configured 12-second live Contest Window in ProofOfLifeConsensus`);

  // Set backup waiting period to 2 seconds for live test
  const setBkpWaitTx = await deployerWallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "setBackupWaitingPeriod",
    args: [vaultAddress, 2n],
  });
  await publicClient.waitForTransactionReceipt({ hash: setBkpWaitTx });
  console.log(`  ✓ Configured 2-second live Backup Waiting Period in GuardianRegistry`);

  // Build Allocation Merkle tree (Alice 40%, Bob 60%)
  const saltAlice = keccak256(encodePacked(["string"], ["ALICE_SECRET_SALT_2026"]));
  const saltBob = keccak256(encodePacked(["string"], ["BOB_SECRET_SALT_2026"]));
  const aLeaf1 = computeAllocationLeaf(aliceAccount.address, 4000, saltAlice);
  const aLeaf2 = computeAllocationLeaf(bobAccount.address, 6000, saltBob);
  const allocationRoot = hashPair(aLeaf1, aLeaf2);
  const aProof1 = [aLeaf2];
  const aProof2 = [aLeaf1];

  const setAllocTx = await deployerWallet.writeContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "setAllocationRoot",
    args: [allocationRoot],
  });
  await publicClient.waitForTransactionReceipt({ hash: setAllocTx });
  console.log(`  ✓ Committed Allocation Merkle Root in InheritanceVault`);

  // ---------------------------------------------------------------------------
  // STEP 3: DEPOSIT (USDG-DENOMINATED) & CHECK-IN
  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("STEP 3: DEPOSITING USDG CAPITAL & EXECUTING HEARTBEAT CHECK-IN");
  console.log("-------------------------------------------------------------------------------");

  const depositUsdgAmount = 10_000n * 1_000_000n; // 10,000 USDG
  const approveTx = await deployerWallet.writeContract({
    address: usdgAddress,
    abi: MockERC20Artifact.abi,
    functionName: "approve",
    args: [vaultAddress, depositUsdgAmount],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  const depositTx = await deployerWallet.writeContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "depositToken",
    args: [usdgAddress, depositUsdgAmount],
  });
  await publicClient.waitForTransactionReceipt({ hash: depositTx });
  console.log(`  ✓ Deposited 10,000 USDG into InheritanceVault`);

  // Also deposit a tiny amount of ETH to test multi-asset support
  const depositEthTx = await deployerWallet.writeContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "depositETH",
    value: parseEther("0.0001"),
  });
  await publicClient.waitForTransactionReceipt({ hash: depositEthTx });
  console.log(`  ✓ Deposited 0.0001 ETH buffer into InheritanceVault`);

  // Verify on-chain balances
  const onchainUsdgBal = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "getVaultBalance",
    args: [usdgAddress],
  });
  const onchainEthBal = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "getVaultBalance",
    args: ["0x0000000000000000000000000000000000000000"],
  });
  console.log(`  • On-chain Vault USDG Balance: ${Number(onchainUsdgBal) / 1e6} USDG`);
  console.log(`  • On-chain Vault ETH Balance:  ${formatEther(onchainEthBal)} ETH`);
  if (onchainUsdgBal !== depositUsdgAmount) throw new Error("Vault USDG balance mismatch!");

  // Owner checkIn
  const checkInTx = await deployerWallet.writeContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "checkIn",
  });
  await publicClient.waitForTransactionReceipt({ hash: checkInTx });
  const lastActiveTimestamp = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "lastActiveTimestamp",
  });
  const initialConsensusState = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "getConsensusState",
  });
  console.log(`  ✓ Owner Heartbeat Executed! On-chain lastActiveTimestamp: ${lastActiveTimestamp}`);
  console.log(`  • Vault State: ${initialConsensusState} (0 = Active)`);

  // ---------------------------------------------------------------------------
  // STEP 4: TIMEOUT SIMULATION & GUARDIAN RESILIENCE BACKUP ACTIVATION
  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("STEP 4: SIMULATING TIMEOUT & TRIGGERING GUARDIAN RESILIENCE BACKUP PATH");
  console.log("-------------------------------------------------------------------------------");

  console.log("  Waiting 5 seconds for 3-second heartbeat interval to expire on Nitro sequencer...");
  await new Promise((r) => setTimeout(r, 5000));

  const isExpired = await publicClient.readContract({
    address: consensusAddress,
    abi: ConsensusArtifact.abi,
    functionName: "isTimeoutExpired",
    args: [vaultAddress],
  });
  console.log(`  • On-chain isTimeoutExpired: ${isExpired}`);
  if (!isExpired) throw new Error("Expected timeout to be expired!");

  // Guardian 1 registers their backup
  console.log("  [Resilience 1] Guardian 1 registers Guardian 1 Backup on-chain...");
  const regBkpTx = await guardian1Wallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "registerGuardianBackup",
    args: [guardian1BackupAccount.address],
  });
  await publicClient.waitForTransactionReceipt({ hash: regBkpTx });

  const registeredBkp = await publicClient.readContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "guardianBackupOf",
    args: [guardian1Account.address],
  });
  console.log(`  • On-chain guardianBackupOf(Guardian 1): ${registeredBkp}`);
  if (registeredBkp.toLowerCase() !== guardian1BackupAccount.address.toLowerCase()) {
    throw new Error("Backup registration mismatch!");
  }

  // Open attestation period
  console.log("  [Resilience 2] Opening attestation period for vault...");
  const openPeriodTx = await deployerWallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "openAttestationPeriod",
    args: [vaultAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: openPeriodTx });

  console.log("  Waiting 3 seconds for 2-second backup waiting period to elapse...");
  await new Promise((r) => setTimeout(r, 3000));

  // Backup guardian attests in place of unreachable Guardian 1!
  console.log("  [Resilience 3] Guardian 1 Backup calls attestAsBackup() on-chain...");
  const bkpAttestTx = await guardian1BackupWallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "attestAsBackup",
    args: [vaultAddress, guardian1Account.address, gProof1],
  });
  await publicClient.waitForTransactionReceipt({ hash: bkpAttestTx });
  console.log(`  ✓ Backup Guardian attestation confirmed on-chain!`);

  // Guardian 2 attests directly
  console.log("  [Attestation] Guardian 2 submits direct attestation...");
  const g2AttestTx = await guardian2Wallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "attest",
    args: [vaultAddress, gProof2],
  });
  await publicClient.waitForTransactionReceipt({ hash: g2AttestTx });
  console.log(`  ✓ Guardian 2 attestation confirmed on-chain!`);

  const attestCount = await publicClient.readContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "getAttestationCount",
    args: [vaultAddress],
  });
  const isThresholdMet = await publicClient.readContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "isThresholdMet",
    args: [vaultAddress],
  });
  console.log(`  • On-chain Attestation Count: ${attestCount} / 2 required`);
  console.log(`  • On-chain isThresholdMet:    ${isThresholdMet}`);
  if (!isThresholdMet) throw new Error("Guardian threshold should be satisfied!");

  // Trigger ClaimPending
  console.log("  [Transition] Triggering ClaimPending state transition...");
  const triggerPendingTx = await deployerWallet.writeContract({
    address: consensusAddress,
    abi: ConsensusArtifact.abi,
    functionName: "triggerClaimPending",
    args: [vaultAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: triggerPendingTx });

  const pendingState = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "getConsensusState",
  });
  console.log(`  ✓ On-chain Vault State: ${pendingState} (1 = ClaimPending / Contest Window Open)`);
  if (pendingState !== 1) throw new Error("Expected ClaimPending state!");

  // ---------------------------------------------------------------------------
  // STEP 5: LIFECYCLE 1 — CANCEL PATH
  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("STEP 5: LIFECYCLE 1 — EXECUTING ON-CHAIN CANCELLATION");
  console.log("-------------------------------------------------------------------------------");

  console.log("  Owner executes cancelClaim() to abort pending takeover...");
  const cancelTx = await deployerWallet.writeContract({
    address: consensusAddress,
    abi: ConsensusArtifact.abi,
    functionName: "cancelClaim",
    args: [vaultAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: cancelTx });

  const cancelledState = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "getConsensusState",
  });
  console.log(`  ✓ State Restored to Active! On-chain State: ${cancelledState} (0 = Active)`);
  if (cancelledState !== 0) throw new Error("Expected Active state after cancel!");

  // ---------------------------------------------------------------------------
  // STEP 6: LIFECYCLE 2 — SEPARATE FINALIZE PATH
  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("STEP 6: LIFECYCLE 2 — SEPARATE TIMEOUT, ATTESTATION & FINALIZATION");
  console.log("-------------------------------------------------------------------------------");

  console.log("  Setting check-in interval to 2 seconds for second lapse...");
  const setIntvTx = await deployerWallet.writeContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "setCheckInInterval",
    args: [2n],
  });
  await publicClient.waitForTransactionReceipt({ hash: setIntvTx });

  console.log("  Waiting 4 seconds for timeout...");
  await new Promise((r) => setTimeout(r, 4000));

  // Open attestation period for cycle 2
  const open2Tx = await deployerWallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "openAttestationPeriod",
    args: [vaultAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: open2Tx });

  // Guardians attest for new cycle
  const g1AttestCycle2 = await guardian1Wallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "attest",
    args: [vaultAddress, gProof1],
  });
  await publicClient.waitForTransactionReceipt({ hash: g1AttestCycle2 });

  const g2AttestCycle2 = await guardian2Wallet.writeContract({
    address: guardianRegistryAddress,
    abi: GuardianRegistryArtifact.abi,
    functionName: "attest",
    args: [vaultAddress, gProof2],
  });
  await publicClient.waitForTransactionReceipt({ hash: g2AttestCycle2 });

  const trigger2Tx = await deployerWallet.writeContract({
    address: consensusAddress,
    abi: ConsensusArtifact.abi,
    functionName: "triggerClaimPending",
    args: [vaultAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: trigger2Tx });
  console.log("  ✓ ClaimPending re-entered. Waiting 14 seconds for 12-second contest window to expire...");
  await new Promise((r) => setTimeout(r, 14000));

  console.log("  Finalizing contest on-chain...");
  const finalizeTx = await deployerWallet.writeContract({
    address: consensusAddress,
    abi: ConsensusArtifact.abi,
    functionName: "finalizeContest",
    args: [vaultAddress],
  });
  await publicClient.waitForTransactionReceipt({ hash: finalizeTx });

  const finalizedState = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "getConsensusState",
  });
  console.log(`  ✓ On-chain Vault State: ${finalizedState} (3 = Finalized / Ready for Claims)`);
  if (finalizedState !== 3) throw new Error("Expected Finalized state!");

  // ---------------------------------------------------------------------------
  // STEP 7: BENEFICIARY CLAIMS (USDG DISTRIBUTION)
  // ---------------------------------------------------------------------------
  console.log("\n-------------------------------------------------------------------------------");
  console.log("STEP 7: BENEFICIARY CLAIM EXECUTION & EXACT ON-CHAIN BALANCE RECONCILIATION");
  console.log("-------------------------------------------------------------------------------");

  const aliceUsdgPre = await publicClient.readContract({
    address: usdgAddress,
    abi: MockERC20Artifact.abi,
    functionName: "balanceOf",
    args: [aliceAccount.address],
  });
  const bobUsdgPre = await publicClient.readContract({
    address: usdgAddress,
    abi: MockERC20Artifact.abi,
    functionName: "balanceOf",
    args: [bobAccount.address],
  });

  console.log(`  Initial Alice USDG: ${Number(aliceUsdgPre) / 1e6} USDG`);
  console.log(`  Initial Bob USDG:   ${Number(bobUsdgPre) / 1e6} USDG`);

  // Alice claims 40% (4,000 USDG)
  console.log("\n  [Alice Claim] Alice calls claim(shareBps: 4000, salt, proof)...");
  const aliceClaimTx = await aliceWallet.writeContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "claim",
    args: [4000n, saltAlice, aProof1],
  });
  await publicClient.waitForTransactionReceipt({ hash: aliceClaimTx });
  console.log(`  ✓ Alice claim confirmed on-chain!`);

  const aliceUsdgPost = await publicClient.readContract({
    address: usdgAddress,
    abi: MockERC20Artifact.abi,
    functionName: "balanceOf",
    args: [aliceAccount.address],
  });
  const aliceReceived = aliceUsdgPost - aliceUsdgPre;
  console.log(`  • Alice USDG Received: ${Number(aliceReceived) / 1e6} USDG (Exact Expected: 4,000.0 USDG)`);
  if (aliceReceived !== 4_000n * 1_000_000n) throw new Error("Alice payout mismatch!");

  const aliceHasClaimed = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "hasClaimed",
    args: [aliceAccount.address],
  });
  console.log(`  • On-chain vault.hasClaimed(Alice): ${aliceHasClaimed}`);

  // Bob claims 60% (6,000 USDG)
  console.log("\n  [Bob Claim] Bob calls claim(shareBps: 6000, salt, proof)...");
  const bobClaimTx = await bobWallet.writeContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "claim",
    args: [6000n, saltBob, aProof2],
  });
  await publicClient.waitForTransactionReceipt({ hash: bobClaimTx });
  console.log(`  ✓ Bob claim confirmed on-chain!`);

  const bobUsdgPost = await publicClient.readContract({
    address: usdgAddress,
    abi: MockERC20Artifact.abi,
    functionName: "balanceOf",
    args: [bobAccount.address],
  });
  const bobReceived = bobUsdgPost - bobUsdgPre;
  console.log(`  • Bob USDG Received:   ${Number(bobReceived) / 1e6} USDG (Exact Expected: 6,000.0 USDG)`);
  if (bobReceived !== 6_000n * 1_000_000n) throw new Error("Bob payout mismatch!");

  const bobHasClaimed = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "hasClaimed",
    args: [bobAccount.address],
  });
  console.log(`  • On-chain vault.hasClaimed(Bob):   ${bobHasClaimed}`);

  // Check residual vault balance is exactly 0
  const finalVaultUsdg = await publicClient.readContract({
    address: vaultAddress,
    abi: InheritanceVaultArtifact.abi,
    functionName: "getVaultBalance",
    args: [usdgAddress],
  });
  console.log(`  • Residual Vault USDG Balance:      ${Number(finalVaultUsdg)} (Exact 0)`);
  if (finalVaultUsdg !== 0n) throw new Error("Expected residual vault balance to be 0!");

  console.log("\n" + "=".repeat(80));
  console.log(`  ✅ FULL LIFECYCLE SUCCESSFULLY VERIFIED ON: ${name.toUpperCase()}`);
  console.log(`  Vault Address: ${vaultAddress}`);
  console.log(`  USDG Token:    ${usdgAddress}`);
  console.log("=".repeat(80) + "\n");

  return {
    chain: name,
    chainId: chain.id,
    vault: vaultAddress,
    usdg: usdgAddress,
    alicePayout: `${Number(aliceReceived) / 1e6} USDG`,
    bobPayout: `${Number(bobReceived) / 1e6} USDG`,
    residualVaultUsdg: Number(finalVaultUsdg),
    status: "SUCCESS_VERIFIED",
  };
}

async function main() {
  console.log("###############################################################################");
  console.log("  CADENCE DUAL-CHAIN END-TO-END LIFECYCLE VERIFICATION SUITE");
  console.log("  Target 1: Arbitrum Sepolia (Chain ID: 421614)");
  console.log("  Target 2: Robinhood Chain Testnet (Chain ID: 46630)");
  console.log("###############################################################################\n");

  const results = [];

  // 1. Run on Arbitrum Sepolia
  try {
    const resArb = await runLifecycleOnChain({
      name: "Arbitrum Sepolia",
      chain: arbitrumSepolia,
      rpcUrl: ARB_SEPOLIA_RPC,
    });
    results.push(resArb);
  } catch (err) {
    console.error("❌ Error on Arbitrum Sepolia:", err);
    process.exit(1);
  }

  // 2. Run on Robinhood Chain Testnet
  try {
    const resRh = await runLifecycleOnChain({
      name: "Robinhood Chain Testnet",
      chain: robinhoodTestnet,
      rpcUrl: RH_TESTNET_RPC,
    });
    results.push(resRh);
  } catch (err) {
    console.error("❌ Error on Robinhood Chain Testnet:", err);
    process.exit(1);
  }

  console.log("\n" + "#".repeat(80));
  console.log("  DUAL-CHAIN VERIFICATION SUMMARY TABLE");
  console.log("#".repeat(80));
  console.table(results);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
