/**
 * PatronChain - BOT Chain Mainnet Deployment Script
 * 
 * Target Network: BOT Chain Mainnet
 * Chain ID: 677
 * Native Currency: BOT
 * RPC: https://rpc.botchain.ai
 * Explorer: https://scan.botchain.ai
 * 
 * SAFETY NOTICE:
 * This script is guarded against accidental execution.
 * To execute a deployment on BOT Chain Mainnet:
 * 1. Ensure your deployer account is funded with native BOT on BOT Chain Mainnet.
 * 2. Set MAINNET_DEPLOYER_PRIVATE_KEY in your environment or .env.
 * 3. Explicitly set CONFIRM_MAINNET_DEPLOYMENT=true in your environment.
 * 4. Run: node scripts/deploy_mainnet.mjs
 */

import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Guard against accidental deployment
if (process.env.CONFIRM_MAINNET_DEPLOYMENT !== 'true') {
  console.error('\n🛑 SAFETY GUARD TRIGGERED: Accidental Mainnet Deployment Prevention');
  console.error('========================================================================');
  console.error('This script deploys smart contracts to BOT CHAIN MAINNET (Chain ID: 677).');
  console.error('To proceed, you must explicitly confirm your intention by providing:');
  console.error('  CONFIRM_MAINNET_DEPLOYMENT=true');
  console.error('  MAINNET_DEPLOYER_PRIVATE_KEY=0x<your-mainnet-private-key>');
  console.error('========================================================================\n');
  process.exit(1);
}

const privateKey = process.env.MAINNET_DEPLOYER_PRIVATE_KEY;
if (!privateKey || !privateKey.startsWith('0x') || privateKey.length !== 66) {
  console.error('\n❌ ERROR: Valid MAINNET_DEPLOYER_PRIVATE_KEY (0x-prefixed 32-byte hex) is required.');
  process.exit(1);
}

const botchainMainnet = {
  id: 677,
  name: 'BOT Chain Mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BOT',
    symbol: 'BOT',
  },
  rpcUrls: {
    default: { http: [process.env.MAINNET_RPC_URL || 'https://rpc.botchain.ai'] },
    public: { http: [process.env.MAINNET_RPC_URL || 'https://rpc.botchain.ai'] },
  },
  blockExplorers: {
    default: { name: 'Botscan', url: 'https://scan.botchain.ai' },
  },
};

async function main() {
  console.log('\n🚀 Starting PatronChain BOT Chain Mainnet Deployment...');
  console.log('----------------------------------------------------');

  const publicClient = createPublicClient({
    chain: botchainMainnet,
    transport: http(botchainMainnet.rpcUrls.default.http[0]),
  });

  // Verify network chain ID strictly
  const liveChainId = await publicClient.getChainId();
  if (liveChainId !== 677) {
    console.error(`\n❌ CHAIN ID MISMATCH: RPC returned chainId ${liveChainId}, expected 677 (BOT Chain Mainnet). Aborting.`);
    process.exit(1);
  }
  console.log(`✅ Network connected: BOT Chain Mainnet (Chain ID: ${liveChainId})`);

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: botchainMainnet,
    transport: http(botchainMainnet.rpcUrls.default.http[0]),
  });

  console.log(`🔑 Deployer Account: ${account.address}`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Deployer Balance: ${formatEther(balance)} BOT`);

  if (balance === 0n) {
    console.error('❌ Insufficient balance: Deployer account has 0 BOT. Fund the account before deploying.');
    process.exit(1);
  }

  // Load compiled artifact
  const artifactPath = path.join(rootDir, 'artifacts', 'PatronChain.json');
  if (!fs.existsSync(artifactPath)) {
    console.error(`❌ Artifact not found at ${artifactPath}. Run "node scripts/compile.cjs" first.`);
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode.startsWith('0x') ? artifact.bytecode : `0x${artifact.bytecode}`;
  const abi = artifact.abi;

  console.log(`📦 Loaded PatronChain artifact (${bytecode.length / 2 - 1} bytes)`);

  // Fee configuration: 250 bps = 2.5%
  const initialFeeBasisPoints = 250;
  console.log(`⚙️ Constructor Argument - Fee Basis Points: ${initialFeeBasisPoints} (2.5%)`);

  console.log('\n⏳ Submitting deployment transaction...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [initialFeeBasisPoints],
  });

  console.log(`📡 Deployment Tx Submitted: ${hash}`);
  console.log(`🔗 Tracking on Explorer: ${botchainMainnet.blockExplorers.default.url}/tx/${hash}`);

  console.log('⏳ Waiting for block confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status !== 'success') {
    console.error(`❌ Deployment failed! Status: ${receipt.status}`);
    process.exit(1);
  }

  const contractAddress = receipt.contractAddress;
  console.log('\n🎉 PatronChain DEPLOYED TO MAINNET SUCCESSFULLY!');
  console.log('====================================================');
  console.log(`📍 Contract Address : ${contractAddress}`);
  console.log(`🧱 Block Number      : ${receipt.blockNumber}`);
  console.log(`⛽ Gas Used          : ${receipt.gasUsed.toString()}`);
  console.log(`🔗 Explorer Link     : ${botchainMainnet.blockExplorers.default.url}/address/${contractAddress}`);
  console.log('====================================================\n');

  // Save deployment artifact
  const deploymentRecord = {
    network: 'botchain-mainnet',
    chainId: 677,
    contractAddress,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    deployer: account.address,
    timestamp: new Date().toISOString(),
    feeBasisPoints: initialFeeBasisPoints,
    compiler: 'solc-v0.8.24',
    optimizer: { enabled: true, runs: 200 },
    explorerUrl: `${botchainMainnet.blockExplorers.default.url}/address/${contractAddress}`,
    txUrl: `${botchainMainnet.blockExplorers.default.url}/tx/${hash}`,
  };

  const deploymentsDir = path.join(rootDir, 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outPath = path.join(deploymentsDir, 'botchain-mainnet.json');
  fs.writeFileSync(outPath, JSON.stringify(deploymentRecord, null, 2), 'utf8');
  console.log(`💾 Saved mainnet deployment record to: ${outPath}`);
}

main().catch((err) => {
  console.error('\n❌ Unhandled error in mainnet deployment:', err);
  process.exit(1);
});
