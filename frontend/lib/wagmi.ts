import { http, fallback, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, mock, walletConnect } from "wagmi/connectors";

const rpcUrl =
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

export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
    mock({
      accounts: [DEMO_WALLETS[0].address],
    }),
    ...DEMO_WALLETS.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (cfg: any) => {
        const base = mock({ accounts: [p.address] })(cfg);
        return {
          ...base,
          id: `mock-${p.id}`,
          name: p.label,
        };
      };
    }),
    ...(walletConnectProjectId && walletConnectProjectId.trim() !== ""
      ? [walletConnect({ projectId: walletConnectProjectId })]
      : []),
  ],
  transports: {
    [sepolia.id]: fallback([
      ...(rpcUrl ? [http(rpcUrl)] : []),
      http("https://ethereum-sepolia-rpc.publicnode.com"),
      http("https://rpc.sepolia.org"),
      http("https://1rpc.io/sepolia"),
      http("https://sepolia.gateway.tenderly.co"),
    ]),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
