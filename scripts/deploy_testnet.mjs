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
import { privateKeyToAccount } from 'viem/accounts';

const botchainTestnet = defineChain({
  id: 968,
  name: 'BOT Chain Testnet (Bohr)',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.bohr.life'] },
  },
  blockExplorers: {
    default: { name: 'Botscan Bohr', url: 'https://scan.bohr.life' },
  },
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
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        env[key] = val;
      }
    }
  }
  return env;
}

async function main() {
  console.log('====================================================');
  console.log('   PATRONCHAIN TESTNET DEPLOYMENT PRE-FLIGHT CHECKS  ');
  console.log('====================================================');

  const env = parseEnv();
  let privKey = env.PRIVATE_KEY?.trim();
  if (!privKey) {
    throw new Error('PRIVATE_KEY missing from .env');
  }
  if (!privKey.startsWith('0x')) privKey = '0x' + privKey;

  const account = privateKeyToAccount(privKey);
  console.log(`Deployer Address: ${account.address}`);

  const publicClient = createPublicClient({
    chain: botchainTestnet,
    transport: http('https://rpc.bohr.life'),
  });

  const walletClient = createWalletClient({
    account,
    chain: botchainTestnet,
    transport: http('https://rpc.bohr.life'),
  });

  // 1. Verify Chain ID
  const chainId = await publicClient.getChainId();
  console.log(`Network Chain ID: ${chainId}`);
  if (chainId !== 968) {
    throw new Error(`Chain ID mismatch! Expected 968, got ${chainId}. Aborting deployment.`);
  }

  // 2. Check Deployer Balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer Balance: ${formatEther(balance)} BOT`);
  if (balance < parseEther('0.05')) {
    throw new Error(`Insufficient BOT balance for deployment gas: ${formatEther(balance)} BOT`);
  }

  // 3. Load Compiled Artifact
  const artifactPath = path.resolve('artifacts/PatronChain.json');
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run compilation first.`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const { abi, bytecode } = artifact;

  console.log(`Loaded Bytecode size: ${bytecode.length / 2 - 1} bytes`);

  const initialOwner = account.address;
  const initialTreasury = account.address;
  const initialFeeBps = 250n; // 2.5%

  console.log('\n--- Deploying PatronChain to BOT Chain Testnet ---');
  console.log(`  Initial Owner: ${initialOwner}`);
  console.log(`  Initial Treasury: ${initialTreasury}`);
  console.log(`  Initial Fee: ${initialFeeBps.toString()} bps (2.5%)`);

  // Deploy Contract
  const deployTxHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [initialOwner, initialTreasury, initialFeeBps],
  });

  console.log(`\nDeployment transaction broadcasted!`);
  console.log(`Tx Hash: ${deployTxHash}`);
  console.log(`Explorer Link: https://scan.bohr.life/tx/${deployTxHash}`);
  console.log('Waiting for block confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deployTxHash,
    confirmations: 1,
  });

  console.log(`\nTransaction Confirmed!`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`Contract Address: ${receipt.contractAddress}`);

  const deployedAddress = receipt.contractAddress;

  // 4. Verify Bytecode on Testnet
  const deployedCode = await publicClient.getCode({ address: deployedAddress });
  if (!deployedCode || deployedCode === '0x') {
    throw new Error('Contract deployment verification failed: bytecode is empty on-chain!');
  }
  console.log(`Bytecode verified on-chain (${deployedCode.length / 2 - 1} bytes).`);

  // 5. Verify Read State
  const deployedContract = getContract({
    address: deployedAddress,
    abi,
    client: publicClient,
  });

  const verifiedOwner = await deployedContract.read.owner();
  const verifiedTreasury = await deployedContract.read.treasury();
  const verifiedFee = await deployedContract.read.platformFeeBps();

  console.log(`\nContract State Verification:`);
  console.log(`  Verified Owner: ${verifiedOwner}`);
  console.log(`  Verified Treasury: ${verifiedTreasury}`);
  console.log(`  Verified Fee: ${verifiedFee.toString()} bps`);

  // 6. Write Deployment Artifact
  const deploymentsDir = path.resolve('deployments');
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentData = {
    network: 'botchain-testnet',
    networkName: 'BOT Chain Testnet (Bohr)',
    chainId: 968,
    rpc: 'https://rpc.bohr.life',
    explorer: 'https://scan.bohr.life',
    contractName: 'PatronChain',
    contractAddress: deployedAddress,
    deploymentTransactionHash: deployTxHash,
    deploymentBlockNumber: Number(receipt.blockNumber),
    gasUsed: receipt.gasUsed.toString(),
    deployerAddress: account.address,
    treasuryAddress: verifiedTreasury,
    platformFeeBps: Number(verifiedFee),
    compilerVersion: '0.8.24',
    deployedAt: new Date().toISOString(),
    explorerLinks: {
      contract: `https://scan.bohr.life/address/${deployedAddress}`,
      tx: `https://scan.bohr.life/tx/${deployTxHash}`,
    },
  };

  const deploymentFilePath = path.join(deploymentsDir, 'botchain-testnet.json');
  fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentData, null, 2));
  console.log(`\nDeployment evidence saved to ${deploymentFilePath}`);

  // 7. Update .env
  let envText = fs.readFileSync('.env', 'utf8');
  if (!envText.includes('VITE_PATRONCHAIN_TESTNET_ADDRESS=')) {
    envText += `\nVITE_PATRONCHAIN_TESTNET_ADDRESS=${deployedAddress}\n`;
  } else {
    envText = envText.replace(/VITE_PATRONCHAIN_TESTNET_ADDRESS=.*/, `VITE_PATRONCHAIN_TESTNET_ADDRESS=${deployedAddress}`);
  }
  if (!envText.includes('VITE_ACTIVE_NETWORK=')) {
    envText += `VITE_ACTIVE_NETWORK=testnet\n`;
  }
  fs.writeFileSync('.env', envText);
  console.log('Updated .env with VITE_PATRONCHAIN_TESTNET_ADDRESS and VITE_ACTIVE_NETWORK=testnet');

  // 8. Update src/config/contracts.ts
  const contractsTsPath = path.resolve('src/config/contracts.ts');
  const contractsTsContent = `// Auto-generated contract configuration for PatronChain
export const PATRONCHAIN_ABI = ${JSON.stringify(abi, null, 2)} as const;

export const CONTRACT_ADDRESSES: Record<number, \`0x\${string}\`> = {
  968: '${deployedAddress}',
  677: '0x0000000000000000000000000000000000000000',
};

export function getPatronChainAddress(chainId: number = 968): \`0x\${string}\` {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[968];
}
`;
  fs.writeFileSync(contractsTsPath, contractsTsContent);
  console.log(`Updated src/config/contracts.ts with deployed testnet address ${deployedAddress}`);

  console.log('\n====================================================');
  console.log('       TESTNET DEPLOYMENT COMPLETED SUCCESSFULLY     ');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('\nDeployment failed:', err);
  process.exit(1);
});
