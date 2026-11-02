# PatronChain — BOT Chain Mainnet Configuration Guide

## 1. Environment Variable Architecture

PatronChain uses standard Vite environment configuration. All variables prefixed with `VITE_` are bundled into client code. Secrets and private keys are never prefixed with `VITE_` and remain strictly excluded by `.gitignore`.

### 1.1 Production Configuration (`.env`)

```env
# Client-Facing Mainnet Configuration
VITE_ACTIVE_NETWORK=mainnet
VITE_CHAIN_ID=677
VITE_NETWORK_NAME=BOT Chain Mainnet
VITE_NATIVE_CURRENCY=BOT
VITE_RPC_URL=https://rpc.botchain.ai
VITE_EXPLORER_URL=https://scan.botchain.ai
VITE_PATRONCHAIN_CONTRACT_ADDRESS=0xa5590be3e48dd445fa871fd813bce8f253a85439

# Offline / Administrative Operations Only (Excluded from Git)
# PRIVATE_KEY=0x...
```

### 1.2 Public Template (`.env.example`)

The repository includes a safe, unpopulated `.env.example` containing public constants and placeholders:

```env
VITE_ACTIVE_NETWORK=mainnet
VITE_CHAIN_ID=677
VITE_NETWORK_NAME=BOT Chain Mainnet
VITE_NATIVE_CURRENCY=BOT
VITE_PATRONCHAIN_CONTRACT_ADDRESS=0xa5590be3e48dd445fa871fd813bce8f253a85439
VITE_RPC_URL=https://rpc.botchain.ai
VITE_EXPLORER_URL=https://scan.botchain.ai
```

---

## 2. Network Specifications

| Parameter | Configuration |
| :--- | :--- |
| **Network Name** | BOT Chain Mainnet |
| **Chain ID** | `677` (Hex: `0x2a5`) |
| **RPC URL** | `https://rpc.botchain.ai` |
| **Explorer URL** | `https://scan.botchain.ai` |
| **Currency Symbol** | `BOT` |
| **Decimals** | `18` |

### Adding to MetaMask / Web3 Wallets Manually
- **Network Name**: BOT Chain Mainnet
- **New RPC URL**: `https://rpc.botchain.ai`
- **Chain ID**: `677`
- **Currency Symbol**: `BOT`
- **Block Explorer URL**: `https://scan.botchain.ai`

---

## 3. Deployment Artifacts

The deployment records are maintained in `deployments/`:
- `deployments/botchain-mainnet.json`: Canonical production deployment metadata.
- `artifacts/PatronChain.json`: Solc compiler ABI and bytecode output.
- `src/config/contracts.ts`: Exported TypeScript ABI and contract address.

---

## 4. Local Startup & Commands

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run on-chain mainnet verification
npm run test:onchain

# Start local development server
npm run dev

# Build production bundle
npm run build

# Preview production bundle
npm run preview
```
