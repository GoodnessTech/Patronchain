import { useState, useEffect, useCallback } from 'react';
import { patronChainService } from '../services/patronchain';
import { historyService } from '../services/history';
import { verificationService, type ExtendedVerificationResult } from '../services/verification';
import type { CreatorProfile, CreatorFinancials } from '../types/creator';
import type { MembershipTier } from '../types/membership';
import type { BlockchainTransaction } from '../types/transaction';

export function usePatronChain(address: `0x${string}` | null, chainId: number | null) {
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [financials, setFinancials] = useState<CreatorFinancials | null>(null);
  const [history, setHistory] = useState<BlockchainTransaction[]>([]);
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(250);

  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);

  const refresh = useCallback(async () => {
    if (!address) {
      setIsRegistered(false);
      setProfile(null);
      setTiers([]);
      setFinancials(null);
      setHistory([]);
      return;
    }

    setLoading(true);
    try {
      const cid = chainId === 677 ? 677 : 968;

      const registered = await patronChainService.isCreatorRegistered(address, cid);
      setIsRegistered(registered);

      if (registered) {
        const p = await patronChainService.getCreator(address, cid);
        setProfile(p);
      }

      const creatorTiers = await patronChainService.getCreatorTiers(address, cid);
      setTiers(creatorTiers);

      const fin = await patronChainService.getCreatorFinancials(address, cid);
      setFinancials(fin);

      const fee = await patronChainService.getPlatformFeeBps(cid);
      setPlatformFeeBps(fee);

      const events = await historyService.getCreatorEvents(address, cid);
      setHistory(events);
    } catch (err: any) {
      console.warn('Error loading PatronChain data:', err);
    } finally {
      setLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const executeAction = async <T,>(action: () => Promise<T>): Promise<T> => {
    setActionLoading(true);
    setActionError(null);
    setLastTxHash(null);
    try {
      const res = await action();
      await refresh();
      return res;
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || 'Transaction failed';
      setActionError(msg);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const registerCreator = async (metadataURI: string = 'ipfs://default-creator-metadata') => {
    return executeAction(async () => {
      const hash = await patronChainService.registerCreator(metadataURI);
      setLastTxHash(hash);
      return hash;
    });
  };

  const createTier = async (
    name: string,
    description: string,
    priceBot: string,
    billingPeriod: 'monthly' | 'yearly',
    subscriberLimit: number = 0
  ) => {
    return executeAction(async () => {
      const hash = await patronChainService.createTier(
        name,
        description,
        priceBot,
        billingPeriod,
        subscriberLimit
      );
      setLastTxHash(hash);
      return hash;
    });
  };

  const updateTier = async (
    tierId: number,
    name: string,
    description: string,
    priceBot: string,
    billingPeriod: 'monthly' | 'yearly',
    subscriberLimit: number = 0
  ) => {
    return executeAction(async () => {
      const hash = await patronChainService.updateTier(
        tierId,
        name,
        description,
        priceBot,
        billingPeriod,
        subscriberLimit
      );
      setLastTxHash(hash);
      return hash;
    });
  };

  const setTierActive = async (tierId: number, active: boolean) => {
    return executeAction(async () => {
      const hash = await patronChainService.setTierActive(tierId, active);
      setLastTxHash(hash);
      return hash;
    });
  };

  const subscribe = async (creatorAddress: string, tierId: number, priceWei: bigint) => {
    return executeAction(async () => {
      const hash = await patronChainService.subscribe(creatorAddress, tierId, priceWei);
      setLastTxHash(hash);
      return hash;
    });
  };

  const renewSubscription = async (creatorAddress: string, priceWei: bigint) => {
    return executeAction(async () => {
      const hash = await patronChainService.renewSubscription(creatorAddress, priceWei);
      setLastTxHash(hash);
      return hash;
    });
  };

  const upgradeSubscription = async (
    creatorAddress: string,
    newTierId: number,
    newPriceWei: bigint
  ) => {
    return executeAction(async () => {
      const hash = await patronChainService.upgradeSubscription(creatorAddress, newTierId, newPriceWei);
      setLastTxHash(hash);
      return hash;
    });
  };

  const cancelSubscription = async (creatorAddress: string) => {
    return executeAction(async () => {
      const hash = await patronChainService.cancelSubscription(creatorAddress);
      setLastTxHash(hash);
      return hash;
    });
  };

  const tipCreator = async (creatorAddress: string, tipAmountBot: string) => {
    return executeAction(async () => {
      const hash = await patronChainService.tipCreator(creatorAddress, tipAmountBot);
      setLastTxHash(hash);
      return hash;
    });
  };

  const withdrawEarnings = async () => {
    return executeAction(async () => {
      const hash = await patronChainService.withdrawEarnings();
      setLastTxHash(hash);
      return hash;
    });
  };

  const verifyMembership = async (
    creatorAddress: string,
    supporterAddress: string
  ): Promise<ExtendedVerificationResult> => {
    const cid = chainId === 677 ? 677 : 968;
    return verificationService.verify(creatorAddress, supporterAddress, cid);
  };

  return {
    isRegistered,
    profile,
    tiers,
    financials,
    history,
    platformFeeBps,
    loading,
    actionLoading,
    actionError,
    lastTxHash,
    refresh,
    registerCreator,
    createTier,
    updateTier,
    setTierActive,
    subscribe,
    renewSubscription,
    upgradeSubscription,
    cancelSubscription,
    tipCreator,
    withdrawEarnings,
    verifyMembership,
  };
}
