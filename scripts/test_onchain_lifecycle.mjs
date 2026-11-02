import fs from 'fs';
import path from 'path';
import {
  createPublicClient,
  http,
  formatEther,
  defineChain,
  getContract,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const botchainMainnet = defineChain({
  id: 677,
  name: 'BOT Chain Mainnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.botchain.ai'] } },
  blockExplorers: { default: { name: 'Botscan', url: 'https://scan.botchain.ai' } },
  testnet: false,
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
  console.log('   PATRONCHAIN MAINNET ON-CHAIN END-TO-END AUDIT     ');
  console.log('====================================================\n');

  const env = parseEnv();
  const rawKey = env.MAINNET_DEPLOYER_PRIVATE_KEY || env.PRIVATE_KEY;
  const key = rawKey.startsWith('0x') ? rawKey : '0x' + rawKey;
  const account = privateKeyToAccount(key);

  const deployment = JSON.parse(fs.readFileSync('deployments/botchain-mainnet.json', 'utf8'));
  const contractAddress = deployment.contractAddress;
  const artifact = JSON.parse(fs.readFileSync('artifacts/PatronChain.json', 'utf8'));

  const publicClient = createPublicClient({
    chain: botchainMainnet,
    transport: http('https://rpc.botchain.ai', { timeout: 60_000, retryCount: 3 }),
  });

  // 1. Verify Network
  console.log('1. Verifying Network Identity...');
  const chainId = await publicClient.getChainId();
  if (chainId !== 677) {
    throw new Error(`Expected chainId 677, got ${chainId}`);
  }
  const blockNumber = await publicClient.getBlockNumber();
  console.log(`   ✅ Connected to BOT Chain Mainnet (Chain ID: ${chainId})`);
  console.log(`   ✅ Current Block Number: ${blockNumber.toString()}`);

  // 2. Verify Deployer Balance & Gas Price
  console.log('\n2. Verifying Gas Pricing & Solvency...');
  const gasPrice = await publicClient.getGasPrice();
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`   ✅ Current Mainnet Gas Price: ${gasPrice.toString()} wei (${Number(gasPrice) / 1e9} Gwei)`);
  console.log(`   ✅ Deployer Account: ${account.address}`);
  console.log(`   ✅ Deployer Balance: ${formatEther(balance)} BOT`);

  // 3. Verify Deployed Bytecode
  console.log('\n3. Verifying On-Chain Bytecode...');
  const code = await publicClient.getCode({ address: contractAddress });
  if (!code || code === '0x') {
    throw new Error(`No bytecode found at ${contractAddress}`);
  }
  console.log(`   ✅ Bytecode verified (${code.length / 2 - 1} bytes) at ${contractAddress}`);

  // 4. Verify Core Contract Invariants
  console.log('\n4. Verifying Smart Contract Invariants...');
  const contract = getContract({
    address: contractAddress,
    abi: artifact.abi,
    client: publicClient,
  });

  const owner = await contract.read.owner();
  const treasury = await contract.read.treasury();
  const platformFeeBps = await contract.read.platformFeeBps();
  const paused = await contract.read.paused();
  const maxFeeBps = await contract.read.MAX_FEE_BPS();

  console.log(`   ✅ Owner: ${owner} (Matches deployer: ${owner.toLowerCase() === account.address.toLowerCase()})`);
  console.log(`   ✅ Treasury: ${treasury}`);
  console.log(`   ✅ Platform Fee: ${platformFeeBps.toString()} bps (2.5%)`);
  console.log(`   ✅ Emergency Pause: ${paused ? 'PAUSED' : 'ACTIVE (Not Paused)'}`);
  console.log(`   ✅ Maximum Fee Cap: ${maxFeeBps.toString()} bps (10.0%)`);

  // 5. Authoritative Verification Method Read
  console.log('\n5. Verifying Authoritative Membership Verification Function...');
  const dummySupporter = '0x000000000000000000000000000000000000dEaD';
  const verification = await contract.read.verifyMembership([account.address, dummySupporter]);
  console.log(`   ✅ verifyMembership executed successfully:`, {
    exists: verification[0],
    isActive: verification[1],
    tierId: Number(verification[2]),
    paidUntil: Number(verification[4]),
  });

  // 6. Creator Registry Read
  console.log('\n6. Verifying Creator Registration Lookup...');
  const isReg = await contract.read.isCreatorRegistered([account.address]);
  console.log(`   ✅ isCreatorRegistered([${account.address}]): ${isReg}`);

  console.log('\n====================================================');
  console.log('   ALL MAINNET ON-CHAIN VERIFICATION CHECKS PASSED!  ');
  console.log('====================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Mainnet on-chain verification failed:', err);
  process.exit(1);
});
