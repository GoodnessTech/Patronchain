import { botchainTestnet, botchainMainnet, type SupportedChainId } from './chains';

export type EnvironmentName = 'testnet' | 'mainnet';

export interface EnvironmentConfig {
  name: EnvironmentName;
  displayName: string;
  chainId: SupportedChainId;
  chain: typeof botchainTestnet | typeof botchainMainnet;
  rpcUrl: string;
  explorerUrl: string;
  currency: 'BOT';
  isTestnet: boolean;
}

export const ENVIRONMENTS: Record<EnvironmentName, EnvironmentConfig> = {
  testnet: {
    name: 'testnet',
    displayName: 'BOT Chain Testnet (Bohr)',
    chainId: 968,
    chain: botchainTestnet,
    rpcUrl: (import.meta.env?.VITE_TESTNET_RPC_URL as string) || 'https://rpc.bohr.life',
    explorerUrl: (import.meta.env?.VITE_TESTNET_EXPLORER_URL as string) || 'https://scan.bohr.life',
    currency: 'BOT',
    isTestnet: true,
  },
  mainnet: {
    name: 'mainnet',
    displayName: 'BOT Chain Mainnet',
    chainId: 677,
    chain: botchainMainnet,
    rpcUrl: (import.meta.env?.VITE_MAINNET_RPC_URL as string) || 'https://rpc.botchain.ai',
    explorerUrl: (import.meta.env?.VITE_MAINNET_EXPLORER_URL as string) || 'https://scan.botchain.ai',
    currency: 'BOT',
    isTestnet: false,
  },
};

// Default environment is testnet
export const ACTIVE_ENVIRONMENT: EnvironmentName =
  (import.meta.env.VITE_ACTIVE_NETWORK as EnvironmentName) || 'testnet';

export function getEnvironment(env: EnvironmentName = ACTIVE_ENVIRONMENT): EnvironmentConfig {
  return ENVIRONMENTS[env] || ENVIRONMENTS.testnet;
}

export function getExplorerTxUrl(txHash: string, chainId: number = 968): string {
  const base = chainId === 677 ? ENVIRONMENTS.mainnet.explorerUrl : ENVIRONMENTS.testnet.explorerUrl;
  return `${base.replace(/\/+$/, '')}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, chainId: number = 968): string {
  const base = chainId === 677 ? ENVIRONMENTS.mainnet.explorerUrl : ENVIRONMENTS.testnet.explorerUrl;
  return `${base.replace(/\/+$/, '')}/address/${address}`;
}

export function getExplorerBlockUrl(blockNumber: number | bigint, chainId: number = 968): string {
  const base = chainId === 677 ? ENVIRONMENTS.mainnet.explorerUrl : ENVIRONMENTS.testnet.explorerUrl;
  return `${base.replace(/\/+$/, '')}/block/${blockNumber}`;
}
