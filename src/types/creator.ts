export interface CreatorProfile {
  address: `0x${string}`;
  isRegistered: boolean;
  metadataURI: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  registeredAt: number;
  totalTiers: number;
}

export interface CreatorFinancials {
  pendingEarnings: bigint;
  totalWithdrawn: bigint;
  totalGrossVolume: bigint;
  totalTipsReceived: bigint;
}
