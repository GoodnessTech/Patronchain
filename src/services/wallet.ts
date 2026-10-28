import { createPublicClient, http, formatEther, type PublicClient, type WalletClient, createWalletClient, custom } from 'viem';
import { botchainTestnet, botchainMainnet, isSupportedChain, type SupportedChainId } from '../config/chains';
import { ENVIRONMENTS, type EnvironmentName } from '../config/environments';

export interface WalletState {
  address: `0x${string}` | null;
  chainId: number | null;
  balanceWei: bigint;
  balanceBot: string;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  activeEnv: EnvironmentName;
}

export class WalletService {
  private static instance: WalletService;

  private constructor() {}

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  public getEthereum(): any {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return (window as any).ethereum;
    }
    return null;
  }

  public getPublicClient(chainId: SupportedChainId = 968): PublicClient {
    const chain = chainId === 677 ? botchainMainnet : botchainTestnet;
    return createPublicClient({
      chain,
      transport: http(),
    });
  }

  public getWalletClient(): WalletClient | null {
    const ethereum = this.getEthereum();
    if (!ethereum) return null;

    return createWalletClient({
      chain: botchainTestnet,
      transport: custom(ethereum),
    });
  }

  public async connect(): Promise<`0x${string}`> {
    const ethereum = this.getEthereum();
    if (!ethereum) {
      throw new Error('No EVM browser wallet detected. Please install MetaMask, Rabby, or another Web3 wallet.');
    }

    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts selected in wallet.');
    }

    return accounts[0] as `0x${string}`;
  }

  public async getChainId(): Promise<number> {
    const ethereum = this.getEthereum();
    if (!ethereum) return 968;

    const chainIdHex = await ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainIdHex, 16);
  }

  public async getBalance(address: `0x${string}`, chainId: SupportedChainId = 968): Promise<{ wei: bigint; bot: string }> {
    const client = this.getPublicClient(chainId);
    const balance = await client.getBalance({ address });
    const formatted = parseFloat(formatEther(balance)).toFixed(4);
    return { wei: balance, bot: formatted };
  }

  public async switchToTestnet(): Promise<void> {
    const ethereum = this.getEthereum();
    if (!ethereum) throw new Error('No wallet available');

    const testnetHex = '0x3c8'; // 968 in hex
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: testnetHex }],
      });
    } catch (switchError: any) {
      // Error code 4902 indicates that the chain has not been added to the wallet
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: testnetHex,
              chainName: 'BOT Chain Testnet (Bohr)',
              nativeCurrency: {
                name: 'BOT',
                symbol: 'BOT',
                decimals: 18,
              },
              rpcUrls: ['https://rpc.bohr.life'],
              blockExplorerUrls: ['https://scan.bohr.life'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  public async switchToMainnet(): Promise<void> {
    const ethereum = this.getEthereum();
    if (!ethereum) throw new Error('No wallet available');

    const mainnetHex = '0x2a5'; // 677 in hex
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: mainnetHex }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: mainnetHex,
              chainName: 'BOT Chain Mainnet',
              nativeCurrency: {
                name: 'BOT',
                symbol: 'BOT',
                decimals: 18,
              },
              rpcUrls: ['https://rpc.botchain.ai'],
              blockExplorerUrls: ['https://scan.botchain.ai'],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  public onAccountsChanged(callback: (accounts: string[]) => void): () => void {
    const ethereum = this.getEthereum();
    if (ethereum?.on) {
      ethereum.on('accountsChanged', callback);
      return () => ethereum.removeListener('accountsChanged', callback);
    }
    return () => {};
  }

  public onChainChanged(callback: (chainIdHex: string) => void): () => void {
    const ethereum = this.getEthereum();
    if (ethereum?.on) {
      ethereum.on('chainChanged', callback);
      return () => ethereum.removeListener('chainChanged', callback);
    }
    return () => {};
  }
}

export const walletService = WalletService.getInstance();
