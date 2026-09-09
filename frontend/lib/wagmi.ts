import { http, fallback, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, mock, walletConnect } from "wagmi/connectors";
import { createWalletClient, custom, numberToHex, type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const DEMO_WALLETS = [
  {
    id: "owner",
    label: "Vault Owner",
    address: "0xC09C394336D4Ed967B70a4C1C1110493673f77e4" as `0x${string}`,
    role: "Locker Creator (Deployer)",
  },
  {
    id: "alice",
    label: "Beneficiary 1 (Alice)",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`,
    role: "40% Share Beneficiary",
  },
  {
    id: "bob",
    label: "Beneficiary 2 (Bob)",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as `0x${string}`,
    role: "60% Share Beneficiary",
  },
  {
    id: "guardian1",
    label: "Guardian Node 1",
    address: "0x81C3D582F3473F71C4C8bF394E1d32BA218991a2" as `0x${string}`,
    role: "Proof-of-Life Node",
  },
  {
    id: "guardian2",
    label: "Guardian Node 2",
    address: "0x34d7E2B013A49FC43c9c7fc7A7010b108B7cA1F0" as `0x${string}`,
    role: "Proof-of-Life Node",
  },
  {
    id: "new_user",
    label: "New User (Fresh Wallet)",
    address: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    role: "Unregistered Visitor",
  },
] as const;

export const DEMO_WALLET_KEYS: Record<string, Hex> = {
  owner: "0xedc7f7031d44e8389afbfc06ee560adcd91008c73a21ecfcb4c18247ec5ae2ee",
  alice: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  bob: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
};

/**
 * Robust Sepolia RPC transport pool prioritizing high-reliability endpoints.
 */
export const sepoliaTransports = fallback([
  ...(rpcUrl ? [http(rpcUrl)] : []),
  http("https://ethereum-sepolia-rpc.publicnode.com"),
  http("https://rpc.sepolia.org"),
  http("https://1rpc.io/sepolia"),
  http("https://sepolia.gateway.tenderly.co"),
]);

/**
 * Sepolia chain definition overriding default Thirdweb RPC endpoint.
 */
export const cadenceSepolia = {
  ...sepolia,
  rpcUrls: {
    ...sepolia.rpcUrls,
    default: {
      http: [
        rpcUrl,
        "https://ethereum-sepolia-rpc.publicnode.com",
        "https://rpc.sepolia.org",
        "https://1rpc.io/sepolia",
      ],
    },
  },
};

/**
 * Factory creating a real signing connector for demo personas using their known private keys.
 */
function createDemoPersonaConnector(persona: (typeof DEMO_WALLETS)[number], connectorId?: string) {
  const privateKey = DEMO_WALLET_KEYS[persona.id];
  const account = privateKey ? privateKeyToAccount(privateKey) : undefined;

  return (cfg: any) => {
    const base = mock({ accounts: [persona.address] })(cfg);

    return {
      ...base,
      id: connectorId || `mock-${persona.id}`,
      name: persona.label,

      async getClient({ chainId }: { chainId?: number } = {}) {
        const targetChain = cfg.chains?.find((c: any) => c.id === chainId) || cadenceSepolia;
        return createWalletClient({
          account: account || persona.address,
          chain: targetChain,
          transport: sepoliaTransports,
        });
      },

      async getProvider({ chainId }: { chainId?: number } = {}) {
        const targetChain = cfg.chains?.find((c: any) => c.id === chainId) || cadenceSepolia;
        const walletClient = createWalletClient({
          account: account || persona.address,
          chain: targetChain,
          transport: sepoliaTransports,
        });

        const request = async ({ method, params }: { method: string; params?: any[] }) => {
          if (method === "eth_chainId") {
            return numberToHex(cadenceSepolia.id);
          }
          if (method === "eth_accounts" || method === "eth_requestAccounts") {
            return [persona.address];
          }
          if (method === "wallet_switchEthereumChain") {
            return null;
          }

          // Off-chain signing methods
          if (account) {
            if (method === "personal_sign" || method === "eth_sign") {
              const msg =
                typeof params?.[0] === "string" && params[0].startsWith("0x") && params[0].length === 42
                  ? params[1]
                  : params?.[0];
              return account.signMessage({
                message: typeof msg === "string" && msg.startsWith("0x") ? { raw: msg as Hex } : msg,
              });
            }
            if (method === "eth_signTypedData_v4") {
              const data = typeof params?.[1] === "string" ? JSON.parse(params[1]) : params?.[1];
              return account.signTypedData(data);
            }
            if (method === "eth_sendTransaction") {
              return walletClient.sendTransaction(params?.[0]);
            }
          }

          // Fallback to JSON-RPC HTTP request
          const targetUrl = targetChain.rpcUrls?.default?.http?.[0] || rpcUrl;
          const body = {
            id: 1,
            jsonrpc: "2.0",
            method,
            params: params || [],
          };
          const res = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (json.error) {
            throw new Error(json.error.message || JSON.stringify(json.error));
          }
          return json.result;
        };

        return custom({ request })({ retryCount: 0 });
      },
    };
  };
}

export const config = createConfig({
  chains: [cadenceSepolia],
  connectors: [
    injected(),
    // Default mock connector connects as Vault Owner
    createDemoPersonaConnector(DEMO_WALLETS[0], "mock"),
    // Persona-specific connectors (mock-owner, mock-alice, mock-bob, etc.)
    ...DEMO_WALLETS.map((p) => createDemoPersonaConnector(p)),
    ...(walletConnectProjectId && walletConnectProjectId.trim() !== ""
      ? [walletConnect({ projectId: walletConnectProjectId })]
      : []),
  ],
  transports: {
    [cadenceSepolia.id]: sepoliaTransports,
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

