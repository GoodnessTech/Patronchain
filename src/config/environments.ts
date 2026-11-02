import { botchainMainnet, type SupportedChainId } from './chains';

export type EnvironmentName = 'mainnet';

export interface EnvironmentConfig {
  name: EnvironmentName;
  displayName: string;
  chainId: SupportedChainId;
  chain: typeof botchainMainnet;
  rpcUrl: string;
  explorerUrl: string;
  currency: 'BOT';
  isTestnet: boolean;
}

export const ENVIRONMENTS: Record<EnvironmentName, EnvironmentConfig> = {
  mainnet: {
    name: 'mainnet',
    displayName: 'BOT Chain Mainnet',
    chainId: 677,
    chain: botchainMainnet,
    rpcUrl: (import.meta.env?.VITE_RPC_URL as string) || 'https://rpc.botchain.ai',
    explorerUrl: (import.meta.env?.VITE_EXPLORER_URL as string) || 'https://scan.botchain.ai',
    currency: 'BOT',
    isTestnet: false,
  },
};

// Production environment is BOT Chain Mainnet
export const ACTIVE_ENVIRONMENT: EnvironmentName = 'mainnet';

export function getEnvironment(): EnvironmentConfig {
  return ENVIRONMENTS.mainnet;
}

export function getExplorerTxUrl(txHash: string, _chainId: number = 677): string {
  const base = ENVIRONMENTS.mainnet.explorerUrl;
  return `${base.replace(/\/+$/, '')}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string, _chainId: number = 677): string {
  const base = ENVIRONMENTS.mainnet.explorerUrl;
  return `${base.replace(/\/+$/, '')}/address/${address}`;
}

export function getExplorerBlockUrl(blockNumber: number | bigint, _chainId: number = 677): string {
  const base = ENVIRONMENTS.mainnet.explorerUrl;
  return `${base.replace(/\/+$/, '')}/block/${blockNumber}`;
}
