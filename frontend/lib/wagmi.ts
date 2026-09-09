import { http, fallback, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
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

export const config = createConfig({
  chains: [cadenceSepolia],
  connectors: [
    injected(),
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


