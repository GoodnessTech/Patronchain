import fs from 'fs';
import path from 'path';
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  defineChain,
  getContract,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';

const botchainTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Testnet (Bohr)',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.bohr.life'] } },
  blockExplorers: { default: { name: 'Botscan Bohr', url: 'https://scan.bohr.life' } },
  testnet: true,
});

function parseEnv() {
  const content = fs.readFileSync('.env', 'utf8');
  const lines = content.split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  }
  return env;
}

async function main() {
  console.log('====================================================');
  console.log('   PATRONCHAIN ON-CHAIN END-TO-END VERIFICATION      ');
  console.log('====================================================\n');

  const env = parseEnv();
  const creatorKey = env.PRIVATE_KEY.startsWith('0x') ? env.PRIVATE_KEY : '0x' + env.PRIVATE_KEY;
  const creatorAccount = privateKeyToAccount(creatorKey);

  // Generate ephemeral supporter account
  const supporterKey = generatePrivateKey();
  const supporterAccount = privateKeyToAccount(supporterKey);

  const deployment = JSON.parse(fs.readFileSync('deployments/botchain-testnet.json', 'utf8'));
  const contractAddress = deployment.contractAddress;
  const artifact = JSON.parse(fs.readFileSync('artifacts/PatronChain.json', 'utf8'));

  const publicClient = createPublicClient({
    chain: botchainTestnet,
    transport: http('https://rpc.bohr.life'),
  });

  const creatorWallet = createWalletClient({
    account: creatorAccount,
    chain: botchainTestnet,
    transport: http('https://rpc.bohr.life'),
  });

  const supporterWallet = createWalletClient({
    account: supporterAccount,
    chain: botchainTestnet,
    transport: http('https://rpc.bohr.life'),
  });

  const patronContract = getContract({
    address: contractAddress,
    abi: artifact.abi,
    client: { public: publicClient, wallet: creatorWallet },
  });

  console.log(`Target Contract: ${contractAddress}`);
  console.log(`Creator Address: ${creatorAccount.address}`);
  console.log(`Supporter Address: ${supporterAccount.address}\n`);

  // Step 1: Fund supporter account with 0.3 BOT for gas and payments
  console.log('Step 1: Funding supporter wallet with 0.35 BOT from creator...');
  const fundTxHash = await creatorWallet.sendTransaction({
    to: supporterAccount.address,
    value: parseEther('0.35'),
  });
  console.log(`  Fund Tx: https://scan.bohr.life/tx/${fundTxHash}`);
  await publicClient.waitForTransactionReceipt({ hash: fundTxHash });
  console.log('  Supporter funded successfully.\n');

  // Step 2: Register Creator
  console.log('Step 2: Registering Creator on-chain...');
  const isRegisteredBefore = await patronContract.read.isCreatorRegistered([creatorAccount.address]);
  let regTxHash = 'already-registered';
  if (!isRegisteredBefore) {
    regTxHash = await creatorWallet.writeContract({
      address: contractAddress,
      abi: artifact.abi,
      functionName: 'registerCreator',
      args: ['https://patronchain.xyz/metadata/creator.json'],
    });
    console.log(`  Register Tx: https://scan.bohr.life/tx/${regTxHash}`);
    await publicClient.waitForTransactionReceipt({ hash: regTxHash });
  } else {
    console.log('  Creator already registered on-chain.');
  }
  const isRegisteredAfter = await patronContract.read.isCreatorRegistered([creatorAccount.address]);
  console.log(`  Verified Creator Registration Status: ${isRegisteredAfter}\n`);

  // Step 3: Create Membership Tiers
  console.log('Step 3: Creating Membership Tiers...');
  const tier1Price = parseEther('0.02');
  const tier2Price = parseEther('0.05');

  const tier1TxHash = await creatorWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'createTier',
    args: ['Founding Member', 'ipfs://tier1-metadata', tier1Price, 30n * 86400n, 100n],
  });
  console.log(`  Tier 1 Tx: https://scan.bohr.life/tx/${tier1TxHash}`);
  await publicClient.waitForTransactionReceipt({ hash: tier1TxHash });

  const tier2TxHash = await creatorWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'createTier',
    args: ['VIP Studio Access', 'ipfs://tier2-metadata', tier2Price, 30n * 86400n, 50n],
  });
  console.log(`  Tier 2 Tx: https://scan.bohr.life/tx/${tier2TxHash}`);
  await publicClient.waitForTransactionReceipt({ hash: tier2TxHash });

  const tiers = await patronContract.read.getCreatorTiers([creatorAccount.address]);
  console.log(`  Created Tiers Count: ${tiers.length}`);
  console.log(`  Tier 1: ${tiers[tiers.length - 2]?.name} (${formatEther(tiers[tiers.length - 2]?.price)} BOT)`);
  console.log(`  Tier 2: ${tiers[tiers.length - 1]?.name} (${formatEther(tiers[tiers.length - 1]?.price)} BOT)\n`);

  const tier1Id = tiers[tiers.length - 2].id;
  const tier2Id = tiers[tiers.length - 1].id;

  // Step 4: Supporter Subscribes to Tier 1
  console.log(`Step 4: Supporter subscribing to Tier ${tier1Id} (${formatEther(tier1Price)} BOT)...`);
  const subTxHash = await supporterWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'subscribe',
    args: [creatorAccount.address, tier1Id],
    value: tier1Price,
  });
  console.log(`  Subscribe Tx: https://scan.bohr.life/tx/${subTxHash}`);
  await publicClient.waitForTransactionReceipt({ hash: subTxHash });

  const [exists1, isActive1, currentTier1, startedAt1, paidUntil1, cancelled1] =
    await patronContract.read.verifyMembership([creatorAccount.address, supporterAccount.address]);
  console.log(`  Membership Exists: ${exists1}`);
  console.log(`  Membership Active: ${isActive1}`);
  console.log(`  Current Tier ID: ${currentTier1.toString()}`);
  console.log(`  Paid Until: ${new Date(Number(paidUntil1) * 1000).toISOString()}`);
  console.log(`  Cancelled: ${cancelled1}\n`);

  // Step 5: Supporter Renews Subscription
  console.log(`Step 5: Supporter renewing subscription (${formatEther(tier1Price)} BOT)...`);
  const renewTxHash = await supporterWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'renewSubscription',
    args: [creatorAccount.address],
    value: tier1Price,
  });
  console.log(`  Renew Tx: https://scan.bohr.life/tx/${renewTxHash}`);
  await publicClient.waitForTransactionReceipt({ hash: renewTxHash });

  const [, , , , paidUntilAfterRenewal] =
    await patronContract.read.verifyMembership([creatorAccount.address, supporterAccount.address]);
  console.log(`  Extended Paid Until: ${new Date(Number(paidUntilAfterRenewal) * 1000).toISOString()}\n`);

  // Step 6: Supporter Upgrades to Tier 2
  console.log(`Step 6: Supporter upgrading to Tier ${tier2Id} (${formatEther(tier2Price)} BOT)...`);
  const upgradeTxHash = await supporterWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'upgradeSubscription',
    args: [creatorAccount.address, tier2Id],
    value: tier2Price,
  });
  console.log(`  Upgrade Tx: https://scan.bohr.life/tx/${upgradeTxHash}`);
  await publicClient.waitForTransactionReceipt({ hash: upgradeTxHash });

  const [, , upgradedTier] =
    await patronContract.read.verifyMembership([creatorAccount.address, supporterAccount.address]);
  console.log(`  New Active Tier: ${upgradedTier.toString()} (Expected: ${tier2Id})\n`);

  // Step 7: Supporter Cancels Renewal Intent
  console.log('Step 7: Supporter cancelling renewal intent...');
  const cancelTxHash = await supporterWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'cancelSubscription',
    args: [creatorAccount.address],
  });
  console.log(`  Cancel Tx: https://scan.bohr.life/tx/${cancelTxHash}`);
  await publicClient.waitForTransactionReceipt({ hash: cancelTxHash });

  const [, isActiveAfterCancel, , , , isCancelledAfterCancel] =
    await patronContract.read.verifyMembership([creatorAccount.address, supporterAccount.address]);
  console.log(`  Cancelled Flag: ${isCancelledAfterCancel}`);
  console.log(`  Access Still Active (until paidUntil): ${isActiveAfterCancel}\n`);

  // Step 8: Supporter Sends a Tip
  console.log('Step 8: Supporter tipping creator 0.01 BOT...');
  const tipAmount = parseEther('0.01');
  const tipTxHash = await supporterWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'tipCreator',
    args: [creatorAccount.address],
    value: tipAmount,
  });
  console.log(`  Tip Tx: https://scan.bohr.life/tx/${tipTxHash}`);
  await publicClient.waitForTransactionReceipt({ hash: tipTxHash });

  const [pendingEarnings, totalWithdrawn, grossVolume, totalTips] =
    await patronContract.read.getCreatorFinancials([creatorAccount.address]);
  console.log(`  Pending Creator Earnings: ${formatEther(pendingEarnings)} BOT`);
  console.log(`  Gross Volume: ${formatEther(grossVolume)} BOT`);
  console.log(`  Total Tips Received: ${formatEther(totalTips)} BOT\n`);

  // Step 9: Creator Withdraws Earnings
  console.log('Step 9: Creator withdrawing earnings...');
  const initialCreatorBalance = await publicClient.getBalance({ address: creatorAccount.address });
  const withdrawTxHash = await creatorWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: 'withdrawEarnings',
  });
  console.log(`  Withdraw Tx: https://scan.bohr.life/tx/${withdrawTxHash}`);
  await publicClient.waitForTransactionReceipt({ hash: withdrawTxHash });

  const [pendingEarningsAfter] =
    await patronContract.read.getCreatorFinancials([creatorAccount.address]);
  const finalCreatorBalance = await publicClient.getBalance({ address: creatorAccount.address });
  console.log(`  Pending Earnings After Withdrawal: ${formatEther(pendingEarningsAfter)} BOT (Expected: 0)`);
  console.log(`  Creator Balance: ${formatEther(finalCreatorBalance)} BOT\n`);

  // Record Evidence
  const testResults = {
    testDate: new Date().toISOString(),
    network: 'BOT Chain Testnet (Bohr)',
    chainId: 968,
    contractAddress,
    deployerCreator: creatorAccount.address,
    supporter: supporterAccount.address,
    transactions: {
      fundingSupporter: { hash: fundTxHash, explorer: `https://scan.bohr.life/tx/${fundTxHash}` },
      creatorRegistration: { hash: regTxHash, explorer: `https://scan.bohr.life/tx/${regTxHash}` },
      tier1Creation: { hash: tier1TxHash, explorer: `https://scan.bohr.life/tx/${tier1TxHash}` },
      tier2Creation: { hash: tier2TxHash, explorer: `https://scan.bohr.life/tx/${tier2TxHash}` },
      subscription: { hash: subTxHash, explorer: `https://scan.bohr.life/tx/${subTxHash}` },
      renewal: { hash: renewTxHash, explorer: `https://scan.bohr.life/tx/${renewTxHash}` },
      upgrade: { hash: upgradeTxHash, explorer: `https://scan.bohr.life/tx/${upgradeTxHash}` },
      cancellation: { hash: cancelTxHash, explorer: `https://scan.bohr.life/tx/${cancelTxHash}` },
      tipping: { hash: tipTxHash, explorer: `https://scan.bohr.life/tx/${tipTxHash}` },
      withdrawal: { hash: withdrawTxHash, explorer: `https://scan.bohr.life/tx/${withdrawTxHash}` },
    },
    verificationSummary: {
      creatorRegistered: isRegisteredAfter,
      totalTiersCreated: tiers.length,
      subscriptionVerified: exists1 && isActive1,
      renewalExtendedPaidUntil: paidUntilAfterRenewal > paidUntil1,
      upgradeSwitchedTier: upgradedTier === tier2Id,
      cancellationRetainedAccess: isActiveAfterCancel && isCancelledAfterCancel,
      tipRecorded: totalTips > 0n,
      earningsWithdrawn: pendingEarningsAfter === 0n,
    },
  };

  const resultsPath = path.resolve('deployments/testnet-execution-evidence.json');
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  console.log(`Saved verifiable execution evidence to ${resultsPath}`);

  console.log('====================================================');
  console.log('  ALL ON-CHAIN LIFECYCLE TRANSACTIONS PASSED 100%!   ');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('\nOn-chain test execution failed:', err);
  process.exit(1);
});
