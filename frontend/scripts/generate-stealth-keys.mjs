// generate-stealth-keys.mjs — Generates real EIP-5564 stealth keypairs for Foundry test fixtures
import {
  generateStealthMetaAddress,
  generateStealthAddress,
  computeStealthPrivateKey,
} from "../lib/stealth.ts";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("Generating verified EIP-5564 stealth keypairs for test fixtures...");

function generateKeypair(label) {
  const meta = generateStealthMetaAddress();
  const stealth = generateStealthAddress(meta.spendingPublicKey, meta.viewingPublicKey);
  const stealthPrivKey = computeStealthPrivateKey(
    meta.spendingPrivateKey,
    meta.viewingPrivateKey,
    stealth.ephemeralPublicKey
  );

  const account = privateKeyToAccount(stealthPrivKey);
  if (account.address.toLowerCase() !== stealth.stealthAddress.toLowerCase()) {
    throw new Error(`Address mismatch for ${label}: ${account.address} !== ${stealth.stealthAddress}`);
  }

  return {
    label,
    spendingPrivateKey: meta.spendingPrivateKey,
    spendingPublicKey: meta.spendingPublicKey,
    viewingPrivateKey: meta.viewingPrivateKey,
    viewingPublicKey: meta.viewingPublicKey,
    ephemeralPrivateKey: stealth.ephemeralPrivateKey,
    ephemeralPublicKey: stealth.ephemeralPublicKey,
    stealthAddress: stealth.stealthAddress,
    stealthPrivateKey: stealthPrivKey,
    viewTag: stealth.viewTag,
  };
}

// Generate primary keypairs for testing
const keypairs = {
  primaryOwner: generateKeypair("Primary Vault Owner"),
  secondaryOwner: generateKeypair("Secondary Vault Owner"),
  thirdOwner: generateKeypair("Third Vault Owner"),
};

// Ensure output directory exists
const fixturesDir = path.resolve(__dirname, "../../contracts/test/fixtures");
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

const outputPath = path.join(fixturesDir, "stealthKeypairs.json");
fs.writeFileSync(outputPath, JSON.stringify(keypairs, null, 2));

console.log(`✅ Successfully generated and saved stealth keypairs to:\n   ${outputPath}`);
console.log("\nPrimary Owner Stealth Details:");
console.log(`- Stealth Address:    ${keypairs.primaryOwner.stealthAddress}`);
console.log(`- Stealth PrivateKey: ${keypairs.primaryOwner.stealthPrivateKey}`);
console.log(`- Ephemeral PubKey:   ${keypairs.primaryOwner.ephemeralPublicKey}`);
console.log(`- View Tag:           ${keypairs.primaryOwner.viewTag}`);
