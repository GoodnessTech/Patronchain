import { defineChain } from 'viem';

export const botchainMainnet = defineChain({
  id: 677,
  name: 'BOT Chain Mainnet',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [import.meta.env?.VITE_RPC_URL || 'https://rpc.botchain.ai'],
    },
    public: {
      http: [import.meta.env?.VITE_RPC_URL || 'https://rpc.botchain.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Botscan',
      url: import.meta.env?.VITE_EXPLORER_URL || 'https://scan.botchain.ai',
    },
  },
  testnet: false,
});

export const SUPPORTED_CHAINS = [botchainMainnet] as const;
export type SupportedChainId = 677;

export const DEFAULT_CHAIN_ID: SupportedChainId = 677;

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chainId === botchainMainnet.id;
}
