# PatronChain — BOT Chain Mainnet Release Report

## 1. Executive Release Summary
PatronChain has completed its migration from testnet and is now officially released on **BOT Chain Mainnet (Chain ID 677)**. The production deployment was executed with minimal safe gas expenditure, zero redesign of approved frontend/backend logic, zero mock financial fallbacks, and complete on-chain verification.

---

## 2. Official Network Specification
- **Network Name**: BOT Chain Mainnet
- **Chain ID**: `677` (`0x2a5`)
- **Native Currency**: `BOT` (18 Decimals)
- **RPC Endpoint**: `https://rpc.botchain.ai`
- **Block Explorer**: `https://scan.botchain.ai`
- **Official Documentation**: `https://dev-docs.botchain.ai/`

---

## 3. Verified Deployed Contract Details

| Parameter | Value |
| :--- | :--- |
| **Contract Name** | `PatronChain` |
| **Contract Address** | [`0xa5590be3e48dd445fa871fd813bce8f253a85439`](https://scan.botchain.ai/address/0xa5590be3e48dd445fa871fd813bce8f253a85439) |
| **Deployment Transaction** | [`0x54805fad8932be138b9e35a1bce166b17fd919dc7c31d02a1bbf94755723593d`](https://scan.botchain.ai/tx/0x54805fad8932be138b9e35a1bce166b17fd919dc7c31d02a1bbf94755723593d) |
| **Deployment Block Number** | `28825531` |
| **Deployed Bytecode Size** | `12,979` bytes |
| **Deployer Wallet** | `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` |
| **Owner Address** | `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` |
| **Treasury Address** | `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` |
| **Platform Fee** | `250` basis points (2.5%) |
| **Maximum Fee Cap** | `1000` basis points (10.0%) |
| **Verification Status** | Fully verified on-chain via bytecode and direct state assertions |

---

## 4. Actual Gas Expenditure

| Metric | Amount |
| :--- | :--- |
| **Estimated Deployment Gas** | `2,986,043` units |
| **Safe Gas Limit Provided** | `3,284,647` units |
| **Actual Gas Consumed** | `2,961,373` units |
| **Effective Gas Price** | `20 Gwei` (`20,000,000,000 wei`) |
| **Total BOT Spent** | **`0.05922746 BOT`** |
| **Number of Transactions** | `1` (Atomic, zero duplicate broadcasts) |

---

## 5. Scope of Codebase Migration

1. **Active Configuration**:
   - `src/config/chains.ts`: Migrated to single-network `botchainMainnet` (Chain ID 677).
   - `src/config/environments.ts`: Removed dual-network switching and testnet fallback.
   - `src/config/contracts.ts`: Hardcoded production address `0xa5590be3e48dd445fa871fd813bce8f253a85439`.
2. **Blockchain Services**:
   - `src/services/wallet.ts`: Set to default Chain 677, removed `switchToTestnet()`, preserved `switchToMainnet()`.
   - `src/services/patronchain.ts`: Enforces Chain 677 strictly.
   - `src/services/verification.ts`: Authoritative reads dispatch to Chain 677 contract.
   - `src/services/history.ts`: Configured with mainnet deployment block `28825531` and safe handling for public RPC log queries.
3. **Frontend Views & Components**:
   - `src/App.tsx`: Network banner, badges, toast notification explorer links, and modal labels updated to `BOT Chain Mainnet · 677`.
   - Footer links verified: Botchain (`https://www.botchain.ai/`), Botscan (`https://scan.botchain.ai/`), Authoritative contract on Botscan.
4. **Build & Release Assets**:
   - Clean production build tested: `npm run build` succeeds with zero errors.
   - Test suite: `npm run test:onchain` runs live verification against BOT Chain Mainnet with 100% pass rate.
   - Secrets hygiene: `.env` excluded by `.gitignore`; `.env.example` populated with public mainnet configuration.

---

## 6. GitHub Production Release Details

- **Repository**: `https://github.com/GoodnessTech/Patronchain.git`
- **Release Branch**: `main`
- **Commit Message**: `feat: migrate PatronChain to BOT Chain mainnet`
- **Secrets Status**: Zero secrets or private keys staged.

---

## 7. Known Upstream Infrastructure Notes
- **`eth_getLogs` on Public RPC**: The BOT Chain public RPC endpoint (`https://rpc.botchain.ai`) restricts `eth_getLogs`. Client services are safeguarded to fall back gracefully, while current membership and financial accounting are queried authoritatively via direct `eth_call` to the deployed contract.
