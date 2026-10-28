export type TransactionEventType =
  | 'CreatorRegistered'
  | 'TierCreated'
  | 'TierUpdated'
  | 'TierStatusChanged'
  | 'Subscribed'
  | 'SubscriptionRenewed'
  | 'SubscriptionUpgraded'
  | 'SubscriptionCancelled'
  | 'CreatorTipped'
  | 'CreatorEarningsWithdrawn'
  | 'PlatformFeesWithdrawn';

export interface BlockchainTransaction {
  hash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
  eventType: TransactionEventType;
  creator: `0x${string}`;
  supporter?: `0x${string}`;
  tierId?: number;
  grossAmountWei?: bigint;
  grossAmountBot?: string;
  feeWei?: bigint;
  netAmountWei?: bigint;
  paidUntil?: number;
  explorerUrl: string;
}
