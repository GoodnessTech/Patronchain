import { useState, useEffect, useCallback } from 'react';
import { walletService } from '../services/wallet';

export function useWallet() {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balanceBot, setBalanceBot] = useState<string>('0.0000');
  const [balanceWei, setBalanceWei] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!address;
  const isCorrectNetwork = chainId === 968; // BOT Chain Testnet

  const refreshBalance = useCallback(async (targetAddr?: `0x${string}`, targetChainId?: number) => {
    const addr = targetAddr || address;
    const cid = targetChainId || chainId || 968;
    if (!addr) return;

    try {
      const { wei, bot } = await walletService.getBalance(addr, (cid === 677 ? 677 : 968));
      setBalanceBot(bot);
      setBalanceWei(wei);
    } catch (err: any) {
      console.warn('Failed to refresh balance:', err);
    }
  }, [address, chainId]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const account = await walletService.connect();
      setAddress(account);
      const cid = await walletService.getChainId();
      setChainId(cid);
      await refreshBalance(account, cid);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshBalance]);

  const disconnect = useCallback(async () => {
    setAddress(null);
    setBalanceBot('0.0000');
    setBalanceWei(0n);
  }, []);

  const switchToTestnet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await walletService.switchToTestnet();
      const cid = await walletService.getChainId();
      setChainId(cid);
      if (address) await refreshBalance(address, cid);
    } catch (err: any) {
      setError(err?.message || 'Failed to switch network');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, refreshBalance]);

  const switchToMainnet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await walletService.switchToMainnet();
      const cid = await walletService.getChainId();
      setChainId(cid);
      if (address) await refreshBalance(address, cid);
    } catch (err: any) {
      setError(err?.message || 'Failed to switch network');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, refreshBalance]);

  // Check initial connection on mount
  useEffect(() => {
    const ethereum = walletService.getEthereum();
    if (!ethereum) return;

    ethereum.request({ method: 'eth_accounts' }).then(async (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        const account = accounts[0] as `0x${string}`;
        setAddress(account);
        const cid = await walletService.getChainId();
        setChainId(cid);
        refreshBalance(account, cid);
      }
    }).catch(console.warn);

    const unsubAccounts = walletService.onAccountsChanged((accounts) => {
      if (accounts.length > 0) {
        const account = accounts[0] as `0x${string}`;
        setAddress(account);
        refreshBalance(account);
      } else {
        setAddress(null);
        setBalanceBot('0.0000');
        setBalanceWei(0n);
      }
    });

    const unsubChain = walletService.onChainChanged((cidHex) => {
      const cid = parseInt(cidHex, 16);
      setChainId(cid);
      if (address) refreshBalance(address, cid);
    });

    return () => {
      unsubAccounts();
      unsubChain();
    };
  }, [refreshBalance, address]);

  return {
    address,
    chainId,
    balanceBot,
    balanceWei,
    isConnected,
    isCorrectNetwork,
    isLoading,
    error,
    connect,
    disconnect,
    switchToTestnet,
    switchToMainnet,
    refreshBalance,
  };
}
