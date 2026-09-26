import fs from "fs/promises";
import path from "path";
import EthCrypto from "eth-crypto";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256 } from "viem";
import { encryptSecretBox, decryptSecretBox } from "../lib/secretBoxCrypto.ts";

const CACHE_DIR = path.join(process.cwd(), ".cache", "secret-boxes");

const ALICE_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const ALICE_PK = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const BOB_ADDR = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const BOB_PK = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

const message = "Cadence Legacy Box Decryption Authorization";

// 1. Alice
const aliceAccount = privateKeyToAccount(ALICE_PK);
const aliceSig = await aliceAccount.signMessage({ message });
const aliceDerivedPrivKey = keccak256(aliceSig);
const aliceDerivedPubKey = EthCrypto.publicKeyByPrivateKey(aliceDerivedPrivKey);

const alicePayload = {
  version: "1.0",
  vaultAddress: "0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1",
  beneficiaryAddress: ALICE_ADDR,
  items: [
    {
      id: "sec-1",
      type: "centralized_exchange",
      title: "Coinbase Family Portfolio (Institutional)",
      identifier: "benefactor.family@cadence.io",
      secret: "C0inb@se-Secur3-2026!#Vault",
      instructions: "Hardware YubiKey #2 is located in the master bedroom safe (PIN: 4892).",
    },
    {
      id: "sec-2",
      type: "password_manager",
      title: "1Password Family Master Key",
      identifier: "A3-89F2-K109-CADENCE",
      secret: "master-passphrase-tiger-mountain-velocity-88",
      instructions: "Emergency account recovery kit PDF copy is stored in the safe deposit box at Chase Bank.",
    },
    {
      id: "sec-3",
      type: "hardware_wallet_seed",
      title: "Ledger Cold Storage Shard #1 (Shamir 2-of-3)",
      identifier: "Shard Alpha (Index 01)",
      secret: "crater mystery adjust direct mirror vibrant eagle puzzle ocean carbon visual whisper",
      instructions: "Combine this shard with Shard Beta held by Uncle David to reconstruct the root 24-word seed phrase.",
    },
    {
      id: "sec-4",
      type: "email_recovery",
      title: "Google Workspace Admin Console",
      identifier: "admin@familytrustholdings.com",
      secret: "G00gl3-R3c0very-Trv$t99!",
      instructions: "Access backup codes in drawer 3 of the office desk.",
    },
  ],
  personalMessage: `My dearest Alice,\n\nIf you are reading this, the Cadence on-chain consensus protocol has executed and your inheritance stream has been unlocked.\n\nBeyond the streaming ETH allocation and yields, the digital credentials above will grant you immediate access to our institutional family accounts. Take your time, verify each account with Uncle David, and make sure to transfer the cold storage assets into your own hardware wallet.\n\nI am so proud of you. Stay wise, stay grounded, and protect what we have built.\n\nWith all my love,\nDad`,
  createdAt: Date.now() - 86400000 * 2,
};

const encAlice = await encryptSecretBox(aliceDerivedPubKey, alicePayload);
const cidAlice = "bafybeidemo_legacy_box_alice";

await fs.mkdir(CACHE_DIR, { recursive: true });
await fs.writeFile(path.join(CACHE_DIR, `${cidAlice}.bin`), Buffer.from(encAlice.encryptedBytes));
const decAlice = await decryptSecretBox(aliceDerivedPrivKey, encAlice.encryptedKeyCipher, encAlice.encryptedBytes);

// 2. Bob
const bobAccount = privateKeyToAccount(BOB_PK);
const bobSig = await bobAccount.signMessage({ message });
const bobDerivedPrivKey = keccak256(bobSig);
const bobDerivedPubKey = EthCrypto.publicKeyByPrivateKey(bobDerivedPrivKey);

const bobPayload = {
  version: "1.0",
  vaultAddress: "0x6a555565CAef70d28c8eC038D5Af8475fE5C97b1",
  beneficiaryAddress: BOB_ADDR,
  items: [
    {
      id: "sec-b1",
      type: "centralized_exchange",
      title: "Kraken Institutional Staking Account",
      identifier: "bob.investments@familytrust.org",
      secret: "Kr@k3n-St4k1ng-2026!#Key",
      instructions: "2FA TOTP backup key stored in password manager.",
    },
    {
      id: "sec-b2",
      type: "hardware_wallet_seed",
      title: "Ledger Cold Storage Shard #2 (Shamir 2-of-3)",
      identifier: "Shard Beta (Index 02)",
      secret: "timber foster expand drift pulse engine lunar bronze galaxy harbor ripple velvet",
      instructions: "Combine with Alice's shard to reconstruct 24-word root seed.",
    },
  ],
  personalMessage: `Dear Bob,\n\nHere are your access credentials for the secondary institutional accounts. Remember to coordinate with Alice on cold storage shard assembly.\n\nLove,\nDad`,
  createdAt: Date.now() - 86400000 * 2,
};

const encBob = await encryptSecretBox(bobDerivedPubKey, bobPayload);
const cidBob = "bafybeidemo_legacy_box_bob";
await fs.writeFile(path.join(CACHE_DIR, `${cidBob}.bin`), Buffer.from(encBob.encryptedBytes));
const decBob = await decryptSecretBox(bobDerivedPrivKey, encBob.encryptedKeyCipher, encBob.encryptedBytes);

console.log("SUCCESS: Seeded both demo secret boxes.");
console.log("Alice CID:", cidAlice, "Cipher:", encAlice.encryptedKeyCipher);
console.log("Bob CID:", cidBob, "Cipher:", encBob.encryptedKeyCipher);
