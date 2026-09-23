import { http, fallback, createConfig } from "wagmi";
import { sepolia, arbitrumSepolia } from "wagmi/chains";
import { defineChain } from "viem";
import { injected, walletConnect } from "wagmi/connectors";

export const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

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
 * Robinhood Chain Testnet definition (Chain ID 46630, Arbitrum Orbit L2 with Stylus).
 */
export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [cadenceSepolia, arbitrumSepolia, robinhoodTestnet],
  connectors: [
    injected(),
    ...(walletConnectProjectId && walletConnectProjectId.trim() !== ""
      ? [walletConnect({ projectId: walletConnectProjectId })]
      : []),
  ],
  transports: {
    [cadenceSepolia.id]: sepoliaTransports,
    [arbitrumSepolia.id]: fallback([
      http(process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc"),
      http("https://arbitrum-sepolia-rpc.publicnode.com"),
    ]),
    [robinhoodTestnet.id]: http("https://rpc.testnet.chain.robinhood.com"),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}


