# PatronChain — Deployment & Verification Guide

## 1. Network Topology

PatronChain operates across two EVM-compatible BOT Chain environments:

| Network | BOT Chain Testnet (Bohr) | BOT Chain Mainnet |
| :--- | :--- | :--- |
| **Status** | **LIVE & ACTIVE** | **PREPARED & GUARDED** |
| **Chain ID** | `968` | `677` |
| **RPC Endpoint** | `https://rpc.bohr.life` | `https://rpc.botchain.ai` |
| **Native Currency** | `BOT` (18 decimals) | `BOT` (18 decimals) |
| **Block Explorer** | `https://scan.bohr.life` | `https://scan.botchain.ai` |
| **Contract Address** | `0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f` | *Awaiting governance launch* |

---

## 2. Testnet Live Deployment Record

The `PatronChain` contract was compiled and deployed to BOT Chain Testnet:

- **Contract Address**: [`0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f`](https://scan.bohr.life/address/0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f)
- **Deployment Transaction**: [`0xe9e3579cf34f3217547f396cff4e15d031ed1d1f5bb07b114ccf5592e4504300`](https://scan.bohr.life/tx/0xe9e3579cf34f3217547f396cff4e15d031ed1d1f5bb07b114ccf5592e4504300)
- **Block Number**: `28441836`
- **Deployer Wallet**: `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51`
- **Initial Platform Fee**: 250 basis points (2.5%)
- **Gas Used**: `2,961,373` units
- **On-Chain Bytecode Size**: `12,979` bytes

Full deployment metadata is persisted at `deployments/botchain-testnet.json`.

---

## 3. Compilation Pipeline

PatronChain employs a standalone compiler pipeline (`scripts/compile.cjs`) utilizing `solc-v0.8.24` with OpenZeppelin v5 dependency resolution:

```bash
# Compile contracts and generate artifacts
node scripts/compile.cjs
```

### Compiler Settings
```json
{
  "language": "Solidity",
  "settings": {
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "outputSelection": {
      "*": {
        "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"]
      }
    }
  }
}
```

The output ABI is automatically mirrored to `src/config/contracts.ts` and `artifacts/PatronChain.json`.

---

## 4. Testnet Verification & Reproduction

### 4.1 Running the Live Lifecycle Test
The complete 10-step protocol lifecycle can be executed against the live testnet contract:

```bash
node scripts/test_onchain_lifecycle.mjs
```

This script exercises:
1. Creator registration
2. Tier 1 creation (Founding Member)
3. Tier 2 creation (VIP Studio Access)
4. Initial subscription (0.02 BOT)
5. Subscription renewal (+30 days)
6. Immediate upgrade (0.05 BOT)
7. Subscription cancellation (retains access)
8. Creator tipping (0.01 BOT)
9. Creator balance withdrawal (pull pattern)
10. Final balance invariant verification

Evidence is logged to `deployments/testnet-execution-evidence.json`.

---

## 5. Mainnet Deployment Runbook

Mainnet deployment is strictly guarded to prevent accidental triggering during development.

### Step 1: Preflight Verification
Confirm that:
1. The deployer account holds sufficient native BOT on BOT Chain Mainnet (`Chain ID: 677`).
2. Mainnet RPC is responsive: `curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' https://rpc.botchain.ai` returns `"0x2a5"` (677).
3. The codebase has passed all unit, security, and invariant tests.

### Step 2: Configure Secrets
Provide the environment variables safely (do NOT commit to git):
```bash
export MAINNET_DEPLOYER_PRIVATE_KEY="0x..."
export CONFIRM_MAINNET_DEPLOYMENT="true"
export MAINNET_RPC_URL="https://rpc.botchain.ai"
```

### Step 3: Execute Deployment
```bash
node scripts/deploy_mainnet.mjs
```

The script will:
- Strictly verify the RPC responds with chain ID 677.
- Estimate gas and query account balance.
- Deploy `PatronChain.sol` with the initial fee setting.
- Wait for transaction confirmation on Botscan.
- Output the verified contract address and save records to `deployments/botchain-mainnet.json`.

### Step 4: Frontend Switch
Set the environment variable in `.env`:
```env
VITE_ACTIVE_NETWORK=mainnet
VITE_PATRONCHAIN_MAINNET_ADDRESS=0x<deployed-mainnet-address>
```

---

## 6. Frontend Production Build

The web interface is built using Vite:

```bash
# Build production bundle
node node_modules/vite/bin/vite.js build

# Preview production build locally
node node_modules/vite/bin/vite.js preview
```
All assets are bundled into `dist/` ready for decentralized hosting (e.g. IPFS / Arweave) or static web servers.
