import { type PublicClient, formatEther, parseAbiItem, getAddress } from 'viem';
import { walletService } from './wallet';
import { getPatronChainAddress, PATRONCHAIN_ABI } from '../config/contracts';
import { getExplorerTxUrl } from '../config/environments';
import type { BlockchainTransaction } from '../types/transaction';

export class HistoryService {
  private static instance: HistoryService;

  private constructor() {}

  public static getInstance(): HistoryService {
    if (!HistoryService.instance) {
      HistoryService.instance = new HistoryService();
    }
    return HistoryService.instance;
  }

  /**
   * Query historical contract events from BOT Chain testnet.
   * Pulls real blockchain events for Subscribed, Renewed, Upgraded, Cancelled, Tipped, and Withdrawn.
   */
  public async getCreatorEvents(
    creatorAddress: string,
    chainId: 968 | 677 = 968,
    fromBlock: bigint = 28441800n
  ): Promise<BlockchainTransaction[]> {
    const creator = getAddress(creatorAddress) as `0x${string}`;
    const client: PublicClient = walletService.getPublicClient(chainId);
    const contractAddress = getPatronChainAddress(chainId);

    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return [];
    }

    const txs: BlockchainTransaction[] = [];

    try {
      // 1. Subscribed events
      const subLogs = await client.getLogs({
        address: contractAddress,
        event: parseAbiItem(
          'event Subscribed(address indexed creator, address indexed supporter, uint256 indexed tierId, uint256 grossAmount, uint256 fee, uint256 netAmount, uint256 paidUntil)'
        ),
        args: { creator },
        fromBlock,
      });

      for (const log of subLogs) {
        txs.push({
          hash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: Date.now() / 1000,
          eventType: 'Subscribed',
          creator,
          supporter: log.args.supporter,
          tierId: Number(log.args.tierId),
          grossAmountWei: log.args.grossAmount,
          grossAmountBot: formatEther(log.args.grossAmount || 0n),
          feeWei: log.args.fee,
          netAmountWei: log.args.netAmount,
          paidUntil: Number(log.args.paidUntil),
          explorerUrl: getExplorerTxUrl(log.transactionHash!, chainId),
        });
      }

      // 2. Renewed events
      const renewLogs = await client.getLogs({
        address: contractAddress,
        event: parseAbiItem(
          'event SubscriptionRenewed(address indexed creator, address indexed supporter, uint256 indexed tierId, uint256 grossAmount, uint256 fee, uint256 netAmount, uint256 newPaidUntil)'
        ),
        args: { creator },
        fromBlock,
      });

      for (const log of renewLogs) {
        txs.push({
          hash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: Date.now() / 1000,
          eventType: 'SubscriptionRenewed',
          creator,
          supporter: log.args.supporter,
          tierId: Number(log.args.tierId),
          grossAmountWei: log.args.grossAmount,
          grossAmountBot: formatEther(log.args.grossAmount || 0n),
          feeWei: log.args.fee,
          netAmountWei: log.args.netAmount,
          paidUntil: Number(log.args.newPaidUntil),
          explorerUrl: getExplorerTxUrl(log.transactionHash!, chainId),
        });
      }

      // 3. Upgraded events
      const upgradeLogs = await client.getLogs({
        address: contractAddress,
        event: parseAbiItem(
          'event SubscriptionUpgraded(address indexed creator, address indexed supporter, uint256 oldTierId, uint256 indexed newTierId, uint256 grossAmount, uint256 fee, uint256 netAmount, uint256 newPaidUntil)'
        ),
        args: { creator },
        fromBlock,
      });

      for (const log of upgradeLogs) {
        txs.push({
          hash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: Date.now() / 1000,
          eventType: 'SubscriptionUpgraded',
          creator,
          supporter: log.args.supporter,
          tierId: Number(log.args.newTierId),
          grossAmountWei: log.args.grossAmount,
          grossAmountBot: formatEther(log.args.grossAmount || 0n),
          feeWei: log.args.fee,
          netAmountWei: log.args.netAmount,
          paidUntil: Number(log.args.newPaidUntil),
          explorerUrl: getExplorerTxUrl(log.transactionHash!, chainId),
        });
      }

      // 4. Cancelled events
      const cancelLogs = await client.getLogs({
        address: contractAddress,
        event: parseAbiItem(
          'event SubscriptionCancelled(address indexed creator, address indexed supporter, uint256 indexed tierId, uint256 paidUntil)'
        ),
        args: { creator },
        fromBlock,
      });

      for (const log of cancelLogs) {
        txs.push({
          hash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: Date.now() / 1000,
          eventType: 'SubscriptionCancelled',
          creator,
          supporter: log.args.supporter,
          tierId: Number(log.args.tierId),
          paidUntil: Number(log.args.paidUntil),
          explorerUrl: getExplorerTxUrl(log.transactionHash!, chainId),
        });
      }

      // 5. Tipped events
      const tipLogs = await client.getLogs({
        address: contractAddress,
        event: parseAbiItem(
          'event CreatorTipped(address indexed creator, address indexed supporter, uint256 grossAmount, uint256 fee, uint256 netAmount)'
        ),
        args: { creator },
        fromBlock,
      });

      for (const log of tipLogs) {
        txs.push({
          hash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: Date.now() / 1000,
          eventType: 'CreatorTipped',
          creator,
          supporter: log.args.supporter,
          grossAmountWei: log.args.grossAmount,
          grossAmountBot: formatEther(log.args.grossAmount || 0n),
          feeWei: log.args.fee,
          netAmountWei: log.args.netAmount,
          explorerUrl: getExplorerTxUrl(log.transactionHash!, chainId),
        });
      }

      // 6. Withdrawn events
      const withdrawLogs = await client.getLogs({
        address: contractAddress,
        event: parseAbiItem('event CreatorEarningsWithdrawn(address indexed creator, uint256 amount)'),
        args: { creator },
        fromBlock,
      });

      for (const log of withdrawLogs) {
        txs.push({
          hash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          timestamp: Date.now() / 1000,
          eventType: 'CreatorEarningsWithdrawn',
          creator,
          grossAmountWei: log.args.amount,
          grossAmountBot: formatEther(log.args.amount || 0n),
          netAmountWei: log.args.amount,
          explorerUrl: getExplorerTxUrl(log.transactionHash!, chainId),
        });
      }
    } catch (err) {
      console.warn('Could not query all historical event logs:', err);
    }

    // Sort descending by block number
    return txs.sort((a, b) => Number(b.blockNumber - a.blockNumber));
  }
}

export const historyService = HistoryService.getInstance();
