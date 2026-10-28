import { type PublicClient, getAddress } from 'viem';
import { walletService } from './wallet';
import { PATRONCHAIN_ABI, getPatronChainAddress } from '../config/contracts';
import type { MembershipVerificationResult } from '../types/membership';

export interface ExtendedVerificationResult extends MembershipVerificationResult {
  statusLabel: 'Active' | 'Active (Cancelled renewal)' | 'Expired' | 'None';
  formattedPaidUntil: string;
  formattedStartedAt: string;
}

export class VerificationService {
  private static instance: VerificationService;

  private constructor() {}

  public static getInstance(): VerificationService {
    if (!VerificationService.instance) {
      VerificationService.instance = new VerificationService();
    }
    return VerificationService.instance;
  }

  /**
   * Authoritative on-chain membership verification.
   * Can be invoked by external applications, creators, and supporters.
   */
  public async verify(
    creatorAddress: string,
    supporterAddress: string,
    chainId: 968 | 677 = 968
  ): Promise<ExtendedVerificationResult> {
    const creator = getAddress(creatorAddress) as `0x${string}`;
    const supporter = getAddress(supporterAddress) as `0x${string}`;
    const client: PublicClient = walletService.getPublicClient(chainId);
    const contractAddress = getPatronChainAddress(chainId);

    if (!contractAddress) {
      throw new Error(`PatronChain contract not configured for chain ID ${chainId}`);
    }

    const data = (await client.readContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'verifyMembership',
      args: [creator, supporter],
    })) as [boolean, boolean, bigint, bigint, bigint, boolean, bigint];

    const [exists, isActive, tierId, startedAt, paidUntil, cancelled, totalPaid] = data;

    let statusLabel: 'Active' | 'Active (Cancelled renewal)' | 'Expired' | 'None' = 'None';
    if (exists) {
      if (isActive) {
        statusLabel = cancelled ? 'Active (Cancelled renewal)' : 'Active';
      } else {
        statusLabel = 'Expired';
      }
    }

    return {
      exists,
      isActive,
      tierId: Number(tierId),
      startedAt: Number(startedAt),
      paidUntil: Number(paidUntil),
      cancelled,
      totalPaid,
      creator,
      supporter,
      statusLabel,
      formattedPaidUntil: paidUntil > 0n ? new Date(Number(paidUntil) * 1000).toLocaleDateString() : '—',
      formattedStartedAt: startedAt > 0n ? new Date(Number(startedAt) * 1000).toLocaleDateString() : '—',
    };
  }
}

export const verificationService = VerificationService.getInstance();
