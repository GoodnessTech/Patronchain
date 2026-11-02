const fs = require('fs');
const path = require('path');

const artifactPath = path.resolve(__dirname, '../artifacts/PatronChain.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const contractsTsPath = path.resolve(__dirname, '../src/config/contracts.ts');

const content = `// Auto-generated contract configuration for PatronChain — BOT Chain Mainnet
export const PATRONCHAIN_ABI = ${JSON.stringify(artifact.abi, null, 2)} as const;

export const PATRONCHAIN_MAINNET_ADDRESS: \`0x\${string}\` =
  (import.meta.env?.VITE_PATRONCHAIN_CONTRACT_ADDRESS as \`0x\${string}\`) ||
  '0xa5590be3e48dd445fa871fd813bce8f253a85439';

export const CONTRACT_ADDRESSES: Record<number, \`0x\${string}\`> = {
  677: PATRONCHAIN_MAINNET_ADDRESS,
};

export function getPatronChainAddress(_chainId: number = 677): \`0x\${string}\` {
  return PATRONCHAIN_MAINNET_ADDRESS;
}
`;

fs.writeFileSync(contractsTsPath, content);
console.log('src/config/contracts.ts successfully generated with PatronChain ABI!');
