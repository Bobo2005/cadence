import fs from "node:fs";
import path from "node:path";

const contractsOutDir = path.resolve("contracts/out");
const vaultJsonPath = path.join(contractsOutDir, "InheritanceVault.sol/InheritanceVault.json");
const factoryJsonPath = path.join(contractsOutDir, "VaultFactory.sol/VaultFactory.json");

const vaultJson = JSON.parse(fs.readFileSync(vaultJsonPath, "utf-8"));
const bytecode = vaultJson.bytecode.object;

const factoryJson = JSON.parse(fs.readFileSync(factoryJsonPath, "utf-8"));
const factoryAbiStr = JSON.stringify(factoryJson.abi, null, 2);

const contractsPath = path.resolve("frontend/lib/contracts.ts");
let content = fs.readFileSync(contractsPath, "utf-8");

const additions = `

export const VAULT_FACTORY_ABI = ${factoryAbiStr} as const;

export const INHERITANCE_VAULT_BYTECODE = "${bytecode}" as Hex;

export function getVaultFactoryContract(
  address: Address = CONTRACT_ADDRESSES.vaultFactory,
  client: PublicClient | WalletClient = publicClient
) {
  return getContract({
    address,
    abi: VAULT_FACTORY_ABI,
    client,
  });
}
`;

if (!content.includes("VAULT_FACTORY_ABI")) {
  content = content.replace("export const contracts = {", additions + "\nexport const contracts = {");
  content = content.replace(
    "beneficiaryFactory: getBeneficiaryFactoryContract(CONTRACT_ADDRESSES.beneficiaryFactory),",
    "beneficiaryFactory: getBeneficiaryFactoryContract(CONTRACT_ADDRESSES.beneficiaryFactory),\n  vaultFactory: getVaultFactoryContract(CONTRACT_ADDRESSES.vaultFactory),"
  );
  fs.writeFileSync(contractsPath, content, "utf-8");
  console.log("Successfully updated frontend/lib/contracts.ts!");
} else {
  console.log("contracts.ts already has VAULT_FACTORY_ABI");
}
