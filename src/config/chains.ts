import { defineChain } from 'viem';

export const botchainTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Testnet (Bohr)',
  nativeCurrency: {
    name: 'BOT',
    symbol: 'BOT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.bohr.life'],
    },
    public: {
      http: ['https://rpc.bohr.life'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Botscan Bohr',
      url: 'https://scan.bohr.life',
    },
  },
  testnet: true,
});

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
      http: ['https://rpc.botchain.ai'],
    },
    public: {
      http: ['https://rpc.botchain.ai'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Botscan',
      url: 'https://scan.botchain.ai',
    },
  },
  testnet: false,
});

export const SUPPORTED_CHAINS = [botchainTestnet, botchainMainnet] as const;
export type SupportedChainId = 968 | 677;

export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chainId === botchainTestnet.id || chainId === botchainMainnet.id;
}
