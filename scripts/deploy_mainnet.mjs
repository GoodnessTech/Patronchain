/**
 * PatronChain - BOT Chain Mainnet Production Deployment Script
 * 
 * Target Network: BOT Chain Mainnet
 * Chain ID: 677 (0x2a5)
 * Native Currency: BOT (18 Decimals)
 * RPC: https://rpc.botchain.ai
 * Explorer: https://scan.botchain.ai
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  getContract,
  encodeDeployData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load .env variables
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

// 1. Guard against accidental deployment
if (process.env.CONFIRM_MAINNET_DEPLOYMENT !== 'true') {
  console.error('\n🛑 SAFETY GUARD TRIGGERED: Accidental Mainnet Deployment Prevention');
  console.error('========================================================================');
  console.error('This script deploys smart contracts to BOT CHAIN MAINNET (Chain ID: 677).');
  console.error('To proceed, you must explicitly confirm your intention:');
  console.error('  CONFIRM_MAINNET_DEPLOYMENT=true');
  console.error('========================================================================\n');
  process.exit(1);
}

const rawKey = process.env.MAINNET_DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!rawKey) {
  console.error('\n❌ ERROR: Valid deployer private key (MAINNET_DEPLOYER_PRIVATE_KEY or PRIVATE_KEY) is required.');
  process.exit(1);
}
const privateKey = rawKey.startsWith('0x') ? rawKey : `0x${rawKey}`;

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
  console.log('\n=============================================================');
  console.log('   PATRONCHAIN — BOT CHAIN MAINNET PRODUCTION DEPLOYMENT      ');
  console.log('=============================================================\n');

  const rpcUrl = botchainMainnet.rpcUrls.default.http[0];
  console.log(`Connecting to RPC: ${rpcUrl} (timeout: 60s)...`);

  const publicClient = createPublicClient({
    chain: botchainMainnet,
    transport: http(rpcUrl, { timeout: 60_000, retryCount: 3, retryDelay: 2000 }),
  });

  // Verify network chain ID strictly
  const liveChainId = await publicClient.getChainId();
  if (liveChainId !== 677) {
    console.error(`\n❌ CHAIN ID MISMATCH: RPC returned chainId ${liveChainId}, expected 677 (BOT Chain Mainnet). Aborting.`);
    process.exit(1);
  }
  console.log(`✅ Network confirmed: BOT Chain Mainnet (Chain ID: ${liveChainId})`);

  const blockNumber = await publicClient.getBlockNumber();
  console.log(`🧱 Current Block Height: ${blockNumber.toString()}`);

  const gasPrice = await publicClient.getGasPrice();
  console.log(`⛽ Current Gas Price: ${gasPrice.toString()} wei (${Number(gasPrice) / 1e9} Gwei)`);

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: botchainMainnet,
    transport: http(rpcUrl, { timeout: 60_000, retryCount: 3, retryDelay: 2000 }),
  });

  console.log(`🔑 Deployer Account: ${account.address}`);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Deployer Balance: ${formatEther(balance)} BOT (${balance.toString()} wei)`);

  if (balance === 0n) {
    console.error('❌ Insufficient balance: Deployer account has 0 BOT. Aborting.');
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

  // Constructor parameters:
  // initialOwner: deployer address
  // initialTreasury: deployer address
  // initialFeeBps: 250 (2.5%)
  const initialOwner = account.address;
  const initialTreasury = account.address;
  const initialFeeBps = 250n;

  console.log('\n--- Constructor Parameters ---');
  console.log(`  initialOwner    : ${initialOwner}`);
  console.log(`  initialTreasury : ${initialTreasury}`);
  console.log(`  initialFeeBps   : ${initialFeeBps.toString()} (2.5%)`);

  // Gas estimation
  console.log('\nEstimating deployment gas...');
  const deployData = encodeDeployData({
    abi,
    bytecode,
    args: [initialOwner, initialTreasury, initialFeeBps],
  });

  let estimatedGas;
  try {
    estimatedGas = await publicClient.estimateGas({
      account: account.address,
      data: deployData,
    });
    console.log(`⛽ Estimated Gas: ${estimatedGas.toString()} units`);
  } catch (err) {
    console.warn('⚠️ Gas estimation warning (falling back to tested benchmark with safety margin):', err.message);
    estimatedGas = 3_200_000n;
  }

  // Apply minimal 10% safety margin for gas limit
  const gasLimit = (estimatedGas * 110n) / 100n;
  const expectedCost = gasLimit * gasPrice;
  console.log(`⛽ Safe Gas Limit: ${gasLimit.toString()} units`);
  console.log(`💸 Expected Max Gas Cost: ${formatEther(expectedCost)} BOT`);

  if (balance < expectedCost) {
    console.error(`❌ Insufficient funds for deployment! Required: ${formatEther(expectedCost)} BOT, Available: ${formatEther(balance)} BOT`);
    process.exit(1);
  }

  console.log('\n⏳ Submitting deployment transaction to BOT Chain Mainnet...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [initialOwner, initialTreasury, initialFeeBps],
    gas: gasLimit,
    gasPrice,
  });

  console.log(`📡 Deployment Tx Submitted: ${hash}`);
  console.log(`🔗 Tracking on Explorer: ${botchainMainnet.blockExplorers.default.url}/tx/${hash}`);

  console.log('\n⏳ Waiting for block confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
    timeout: 120_000,
  });

  if (receipt.status !== 'success') {
    console.error(`❌ Deployment transaction failed! Status: ${receipt.status}`);
    process.exit(1);
  }

  const contractAddress = receipt.contractAddress;
  const actualGasUsed = receipt.gasUsed;
  const effectiveGasPrice = receipt.effectiveGasPrice || gasPrice;
  const actualGasCost = actualGasUsed * effectiveGasPrice;

  console.log('\n🎉 PatronChain DEPLOYED TO BOT CHAIN MAINNET SUCCESSFULLY!');
  console.log('========================================================================');
  console.log(`📍 Contract Address       : ${contractAddress}`);
  console.log(`🧱 Deployment Block Number: ${receipt.blockNumber}`);
  console.log(`📜 Transaction Hash       : ${hash}`);
  console.log(`⛽ Gas Used                : ${actualGasUsed.toString()} units`);
  console.log(`💰 Effective Gas Price     : ${effectiveGasPrice.toString()} wei (${Number(effectiveGasPrice) / 1e9} Gwei)`);
  console.log(`💸 Total BOT Spent (Gas)   : ${formatEther(actualGasCost)} BOT`);
  console.log(`🔗 Explorer Contract Link  : ${botchainMainnet.blockExplorers.default.url}/address/${contractAddress}`);
  console.log(`🔗 Explorer Tx Link        : ${botchainMainnet.blockExplorers.default.url}/tx/${hash}`);
  console.log('========================================================================\n');

  // Verify on-chain bytecode
  console.log('Verifying on-chain bytecode existence...');
  const deployedCode = await publicClient.getCode({ address: contractAddress });
  if (!deployedCode || deployedCode === '0x') {
    console.error('❌ Bytecode verification failed: On-chain code is empty!');
    process.exit(1);
  }
  console.log(`✅ Deployed bytecode verified (${deployedCode.length / 2 - 1} bytes)`);

  // Verify contract read functions
  console.log('\nVerifying initial contract read state on BOT Chain Mainnet...');
  const contract = getContract({
    address: contractAddress,
    abi,
    client: publicClient,
  });

  const onChainFee = await contract.read.platformFeeBps();
  const onChainOwner = await contract.read.owner();
  const onChainTreasury = await contract.read.treasury();
  const onChainPaused = await contract.read.paused();
  const onChainMaxFee = await contract.read.MAX_FEE_BPS();

  console.log(`  - platformFeeBps : ${onChainFee.toString()} (Expected: 250) ${onChainFee === 250n ? '✅' : '❌'}`);
  console.log(`  - owner          : ${onChainOwner} (Expected: ${initialOwner}) ${onChainOwner.toLowerCase() === initialOwner.toLowerCase() ? '✅' : '❌'}`);
  console.log(`  - treasury       : ${onChainTreasury} (Expected: ${initialTreasury}) ${onChainTreasury.toLowerCase() === initialTreasury.toLowerCase() ? '✅' : '❌'}`);
  console.log(`  - paused         : ${onChainPaused} (Expected: false) ${!onChainPaused ? '✅' : '❌'}`);
  console.log(`  - MAX_FEE_BPS    : ${onChainMaxFee.toString()} (Expected: 1000) ${onChainMaxFee === 1000n ? '✅' : '❌'}`);

  if (
    onChainFee !== 250n ||
    onChainOwner.toLowerCase() !== initialOwner.toLowerCase() ||
    onChainTreasury.toLowerCase() !== initialTreasury.toLowerCase() ||
    onChainPaused !== false
  ) {
    console.error('❌ Post-deployment state validation failed!');
    process.exit(1);
  }
  console.log('✅ All initial state invariants successfully verified on mainnet.');

  // Save mainnet deployment record
  const deploymentRecord = {
    network: 'botchain-mainnet',
    networkName: 'BOT Chain Mainnet',
    chainId: 677,
    contractName: 'PatronChain',
    contractAddress,
    deploymentTransactionHash: hash,
    deploymentBlockNumber: receipt.blockNumber.toString(),
    gasUsed: actualGasUsed.toString(),
    effectiveGasPrice: effectiveGasPrice.toString(),
    totalGasSpentBot: formatEther(actualGasCost),
    deployerAddress: account.address,
    ownerAddress: onChainOwner,
    treasuryAddress: onChainTreasury,
    platformFeeBps: Number(onChainFee),
    compilerVersion: '0.8.24',
    optimizer: { enabled: true, runs: 200 },
    deployedAt: new Date().toISOString(),
    explorerLinks: {
      contract: `${botchainMainnet.blockExplorers.default.url}/address/${contractAddress}`,
      tx: `${botchainMainnet.blockExplorers.default.url}/tx/${hash}`,
    },
  };

  const deploymentsDir = path.join(rootDir, 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outPath = path.join(deploymentsDir, 'botchain-mainnet.json');
  fs.writeFileSync(outPath, JSON.stringify(deploymentRecord, null, 2), 'utf8');
  console.log(`\n💾 Saved mainnet deployment record to: ${outPath}`);
}

main().catch((err) => {
  console.error('\n❌ Unhandled error during mainnet deployment:', err);
  process.exit(1);
});
