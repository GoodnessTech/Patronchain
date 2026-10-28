export type NetworkName = 'testnet' | 'mainnet';

export interface NetworkConfig {
  name: NetworkName;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  currency: 'BOT';
}

export interface MembershipTierInput {
  name: string;
  description: string;
  price: string;
  billingPeriod: 'monthly' | 'yearly';
  subscriberLimit?: number;
}

export interface MembershipTier extends MembershipTierInput {
  id: string;
  active: boolean;
}

export interface WalletAdapter {
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  getNetwork(): Promise<NetworkConfig>;
}

export const networks: Record<NetworkName, NetworkConfig> = {
  testnet: {
    name: 'testnet',
    chainId: 968,
    rpcUrl: 'https://rpc.bohr.life',
    explorerUrl: 'https://scan.bohr.life',
    currency: 'BOT',
  },
  mainnet: {
    name: 'mainnet',
    chainId: 677,
    rpcUrl: 'https://rpc.botchain.ai',
    explorerUrl: 'https://scan.botchain.ai',
    currency: 'BOT',
  },
};

export const blockchainServices = {
  wallet: 'connectWallet / disconnectWallet / getNetwork',
  creator: 'registerCreator / getCreatorProfile',
  tiers: 'createTier / updateTier / setTierStatus / listTiers',
  subscriptions: 'subscribe / renew / upgrade / cancel',
  tips: 'sendTip',
  verification: 'verifyMembership',
  payments: 'listPaymentHistory / getTransactionReceipt',
} as const;
