import {
  type PublicClient,
  type WalletClient,
  formatEther,
  parseEther,
  getAddress,
  encodeFunctionData,
} from 'viem';
import { walletService } from './wallet';
import { PATRONCHAIN_ABI, getPatronChainAddress } from '../config/contracts';
import type { CreatorProfile, CreatorFinancials } from '../types/creator';
import type { MembershipTier, SubscriptionRecord, MembershipVerificationResult } from '../types/membership';

export class PatronChainService {
  private static instance: PatronChainService;

  private constructor() {}

  public static getInstance(): PatronChainService {
    if (!PatronChainService.instance) {
      PatronChainService.instance = new PatronChainService();
    }
    return PatronChainService.instance;
  }

  private async getContractAddress(chainId?: number): Promise<`0x${string}`> {
    const activeChainId = chainId || (await walletService.getChainId());
    const address = getPatronChainAddress(activeChainId);
    if (!address || address === '0x0000000000000000000000000000000000000000') {
      throw new Error(`PatronChain contract not deployed on chain ${activeChainId}`);
    }
    return address;
  }

  private async validateWriteEnvironment(): Promise<{
    walletClient: WalletClient;
    contractAddress: `0x${string}`;
    account: `0x${string}`;
    publicClient: PublicClient;
    chainId: number;
  }> {
    const ethereum = walletService.getEthereum();
    if (!ethereum) throw new Error('No Web3 wallet detected');

    const chainId = await walletService.getChainId();
    if (chainId !== 968 && chainId !== 677) {
      throw new Error(
        `Connected to unsupported chain ${chainId}. Please switch to BOT Chain Testnet (Chain ID 968).`
      );
    }

    const accounts = await ethereum.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('Wallet not connected. Please connect your wallet.');
    }
    const account = getAddress(accounts[0]) as `0x${string}`;

    const walletClient = walletService.getWalletClient();
    if (!walletClient) throw new Error('Failed to initialize wallet client');

    const contractAddress = await this.getContractAddress(chainId);
    const publicClient = walletService.getPublicClient(chainId as 968 | 677);

    return { walletClient, contractAddress, account, publicClient, chainId };
  }

  // ==========================================
  // CREATOR FUNCTIONS
  // ==========================================

  public async registerCreator(metadataURI: string): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'registerCreator',
      args: [metadataURI],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async updateCreatorMetadata(metadataURI: string): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'updateCreatorMetadata',
      args: [metadataURI],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async getCreator(creatorAddress: string, chainId: 968 | 677 = 968): Promise<CreatorProfile> {
    const creator = getAddress(creatorAddress) as `0x${string}`;
    const client = walletService.getPublicClient(chainId);
    const contractAddress = await this.getContractAddress(chainId);

    const result = (await client.readContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'getCreator',
      args: [creator],
    })) as { isRegistered: boolean; metadataURI: string; registeredAt: bigint; totalTiers: bigint };

    return {
      address: creator,
      isRegistered: result.isRegistered,
      metadataURI: result.metadataURI,
      registeredAt: Number(result.registeredAt),
      totalTiers: Number(result.totalTiers),
    };
  }

  public async isCreatorRegistered(creatorAddress: string, chainId: 968 | 677 = 968): Promise<boolean> {
    const creator = getAddress(creatorAddress) as `0x${string}`;
    const client = walletService.getPublicClient(chainId);
    const contractAddress = await this.getContractAddress(chainId);

    return (await client.readContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'isCreatorRegistered',
      args: [creator],
    })) as boolean;
  }

  // ==========================================
  // TIERS FUNCTIONS
  // ==========================================

  public async createTier(
    name: string,
    descriptionURI: string,
    priceBot: string,
    billingPeriod: 'monthly' | 'yearly',
    subscriberLimit: number = 0
  ): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const priceWei = parseEther(priceBot);
    const billingPeriodSeconds = billingPeriod === 'yearly' ? 365n * 86400n : 30n * 86400n;

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'createTier',
      args: [name, descriptionURI, priceWei, billingPeriodSeconds, BigInt(subscriberLimit)],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async updateTier(
    tierId: number,
    name: string,
    descriptionURI: string,
    priceBot: string,
    billingPeriod: 'monthly' | 'yearly',
    subscriberLimit: number = 0
  ): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const priceWei = parseEther(priceBot);
    const billingPeriodSeconds = billingPeriod === 'yearly' ? 365n * 86400n : 30n * 86400n;

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'updateTier',
      args: [BigInt(tierId), name, descriptionURI, priceWei, billingPeriodSeconds, BigInt(subscriberLimit)],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async setTierActive(tierId: number, active: boolean): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'setTierActive',
      args: [BigInt(tierId), active],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async getCreatorTiers(creatorAddress: string, chainId: 968 | 677 = 968): Promise<MembershipTier[]> {
    const creator = getAddress(creatorAddress) as `0x${string}`;
    const client = walletService.getPublicClient(chainId);
    const contractAddress = await this.getContractAddress(chainId);

    const rawTiers = (await client.readContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'getCreatorTiers',
      args: [creator],
    })) as any[];

    return rawTiers.map((t) => ({
      id: Number(t.id),
      creator: t.creator,
      name: t.name,
      descriptionURI: t.descriptionURI,
      priceWei: BigInt(t.price),
      priceBot: formatEther(BigInt(t.price)),
      billingPeriodSeconds: Number(t.billingPeriod),
      billingPeriodType: Number(t.billingPeriod) >= 365 * 86400 ? 'yearly' : 'monthly',
      active: t.active,
      subscriberLimit: Number(t.subscriberLimit),
      totalSubscribers: Number(t.totalSubscribers),
    }));
  }

  // ==========================================
  // SUBSCRIPTION FUNCTIONS
  // ==========================================

  public async subscribe(creatorAddress: string, tierId: number, priceWei: bigint): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const creator = getAddress(creatorAddress) as `0x${string}`;

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'subscribe',
      args: [creator, BigInt(tierId)],
      value: priceWei,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async renewSubscription(creatorAddress: string, priceWei: bigint): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const creator = getAddress(creatorAddress) as `0x${string}`;

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'renewSubscription',
      args: [creator],
      value: priceWei,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async upgradeSubscription(
    creatorAddress: string,
    newTierId: number,
    newPriceWei: bigint
  ): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const creator = getAddress(creatorAddress) as `0x${string}`;

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'upgradeSubscription',
      args: [creator, BigInt(newTierId)],
      value: newPriceWei,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async cancelSubscription(creatorAddress: string): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const creator = getAddress(creatorAddress) as `0x${string}`;

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'cancelSubscription',
      args: [creator],
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async tipCreator(creatorAddress: string, tipAmountBot: string): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const creator = getAddress(creatorAddress) as `0x${string}`;
    const tipWei = parseEther(tipAmountBot);

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'tipCreator',
      args: [creator],
      value: tipWei,
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  // ==========================================
  // ACCOUNTING & WITHDRAWALS
  // ==========================================

  public async withdrawEarnings(): Promise<`0x${string}`> {
    const { contractAddress, account, publicClient, walletClient } =
      await this.validateWriteEnvironment();

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'withdrawEarnings',
      account,
    });

    await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
    return hash;
  }

  public async getCreatorFinancials(creatorAddress: string, chainId: 968 | 677 = 968): Promise<CreatorFinancials> {
    const creator = getAddress(creatorAddress) as `0x${string}`;
    const client = walletService.getPublicClient(chainId);
    const contractAddress = await this.getContractAddress(chainId);

    const data = (await client.readContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'getCreatorFinancials',
      args: [creator],
    })) as [bigint, bigint, bigint, bigint];

    return {
      pendingEarnings: data[0],
      totalWithdrawn: data[1],
      totalGrossVolume: data[2],
      totalTipsReceived: data[3],
    };
  }

  public async getPlatformFeeBps(chainId: 968 | 677 = 968): Promise<number> {
    const client = walletService.getPublicClient(chainId);
    const contractAddress = await this.getContractAddress(chainId);

    const fee = (await client.readContract({
      address: contractAddress,
      abi: PATRONCHAIN_ABI,
      functionName: 'platformFeeBps',
    })) as bigint;

    return Number(fee);
  }
}

export const patronChainService = PatronChainService.getInstance();
