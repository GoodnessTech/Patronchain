export type BillingPeriodType = 'monthly' | 'yearly';

export interface MembershipTier {
  id: number;
  creator: `0x${string}`;
  name: string;
  descriptionURI: string;
  description?: string;
  priceWei: bigint;
  priceBot: string;
  billingPeriodSeconds: number;
  billingPeriodType: BillingPeriodType;
  active: boolean;
  subscriberLimit: number; // 0 = unlimited
  totalSubscribers: number;
}

export interface SubscriptionRecord {
  creator: `0x${string}`;
  supporter: `0x${string}`;
  tierId: number;
  startedAt: number; // Unix timestamp in seconds
  paidUntil: number; // Unix timestamp in seconds
  cancelled: boolean;
  lastPaymentAt: number;
  totalPaidWei: bigint;
  totalPaidBot: string;
  isActive: boolean;
}

export interface MembershipVerificationResult {
  exists: boolean;
  isActive: boolean;
  tierId: number;
  startedAt: number;
  paidUntil: number;
  cancelled: boolean;
  totalPaid: bigint;
  creator: `0x${string}`;
  supporter: `0x${string}`;
}
