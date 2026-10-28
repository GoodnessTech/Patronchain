const fs = require('fs');
const path = require('path');

const SOLC_PATH = path.resolve(__dirname, '../cache/soljson-v0.8.24.cjs');
const ROOT_DIR = path.resolve(__dirname, '..');

function resolveImportKey(importingFile, importPath) {
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const dir = path.dirname(importingFile);
    const resolved = path.join(dir, importPath).replace(/\\/g, '/');
    return resolved;
  }
  return importPath;
}

function getFileSystemPath(normalizedKey) {
  if (normalizedKey.startsWith('@openzeppelin/')) {
    return path.resolve(ROOT_DIR, 'node_modules', normalizedKey);
  }
  if (normalizedKey.startsWith('contracts/')) {
    return path.resolve(ROOT_DIR, normalizedKey);
  }
  return path.resolve(ROOT_DIR, 'contracts', normalizedKey);
}

function main() {
  console.log('Loading Solidity 0.8.24 compiler...');
  const soljson = require(SOLC_PATH);
  const compile = soljson.cwrap('solidity_compile', 'string', ['string', 'number']);

  console.log('Resolving source files and OpenZeppelin imports...');
  const rootContractKey = 'contracts/PatronChain.sol';
  const mainContractPath = path.resolve(ROOT_DIR, rootContractKey);
  const mainSource = fs.readFileSync(mainContractPath, 'utf8');

  const sources = {};

  function processFile(fileKey, content) {
    sources[fileKey] = { content };

    // Matches:
    // import "...";
    // import * as X from "...";
    // import { X } from "...";
    const regex = /import\s+(?:[\w*\s{},]*from\s+)?["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const rawImport = match[1];
      const resolvedKey = resolveImportKey(fileKey, rawImport);

      if (!sources[resolvedKey]) {
        const fsPath = getFileSystemPath(resolvedKey);
        if (!fs.existsSync(fsPath)) {
          console.error(`Import resolution failed: ${rawImport} (resolved to ${resolvedKey}, path: ${fsPath})`);
          process.exit(1);
        }
        const fileContent = fs.readFileSync(fsPath, 'utf8');
        processFile(resolvedKey, fileContent);
      }
    }
  }

  processFile(rootContractKey, mainSource);
  console.log(`Resolved ${Object.keys(sources).length} total source files:`);
  for (const k of Object.keys(sources)) {
    console.log(`  - ${k}`);
  }

  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata']
        }
      }
    }
  };

  console.log('Compiling PatronChain.sol with solc 0.8.24 (optimizer: 200 runs)...');
  const resultStr = compile(JSON.stringify(input), 0);
  const result = JSON.parse(resultStr);

  if (result.errors) {
    let hasError = false;
    for (const err of result.errors) {
      if (err.severity === 'error') {
        hasError = true;
        console.error('Solidity Error:', err.formattedMessage || err.message);
      } else {
        console.warn('Solidity Warning:', err.formattedMessage || err.message);
      }
    }
    if (hasError) {
      process.exit(1);
    }
  }

  const contractOutput = result.contracts[rootContractKey]['PatronChain'];
  const abi = contractOutput.abi;
  const bytecode = '0x' + contractOutput.evm.bytecode.object;
  const deployedBytecode = '0x' + contractOutput.evm.deployedBytecode.object;

  const artifactsDir = path.resolve(ROOT_DIR, 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  const artifactPath = path.join(artifactsDir, 'PatronChain.json');
  fs.writeFileSync(
    artifactPath,
    JSON.stringify({ contractName: 'PatronChain', abi, bytecode, deployedBytecode }, null, 2)
  );

  console.log(`SUCCESS! Contract compiled successfully.`);
  console.log(`Artifact saved: ${artifactPath}`);
  console.log(`Bytecode size: ${bytecode.length / 2 - 1} bytes`);
}

main();
