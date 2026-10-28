const fs = require('fs');
const path = require('path');

const artifactPath = path.resolve(__dirname, '../artifacts/PatronChain.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const contractsTsPath = path.resolve(__dirname, '../src/config/contracts.ts');

const content = `// Auto-generated contract configuration for PatronChain
export const PATRONCHAIN_ABI = ${JSON.stringify(artifact.abi, null, 2)} as const;

export const CONTRACT_ADDRESSES: Record<number, \`0x\${string}\`> = {
  968: (import.meta.env.VITE_PATRONCHAIN_TESTNET_ADDRESS as \`0x\${string}\`) || '0x0000000000000000000000000000000000000000',
  677: (import.meta.env.VITE_PATRONCHAIN_MAINNET_ADDRESS as \`0x\${string}\`) || '0x0000000000000000000000000000000000000000',
};

export function getPatronChainAddress(chainId: number): \`0x\${string}\` {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[968];
}
`;

fs.writeFileSync(contractsTsPath, content);
console.log('src/config/contracts.ts successfully generated with PatronChain ABI!');
