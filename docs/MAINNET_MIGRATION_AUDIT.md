# PatronChain — BOT Chain Mainnet Migration Audit

## Executive Summary
This comprehensive audit documents the complete state of PatronChain prior to mainnet deployment and migration. PatronChain is a decentralized recurring membership protocol natively built for BOT Chain (SocialFi + PayFi), currently tested and operating on BOT Chain Testnet (Bohr, Chain ID 968).

This audit identifies all architectural components, smart contract dependencies, configuration parameters, testnet references, and wallet requirements necessary to execute an exact, flawless production release to **BOT Chain Mainnet (Chain ID 677)** without changing approved frontend design, backend logic, or contract economics.

---

## 1. Existing Project Architecture

### 1.1 Technology Stack
- **Frontend**: React 18.3.1 + TypeScript + TailwindCSS (Bolt-generated neo-brutalism design).
- **Web3 Interaction Layer**: Viem 2.23.0 + Injected EIP-1193 browser wallet provider.
- **Smart Contracts**: Solidity `0.8.24`, compiled with optimizer enabled (`200` runs).
- **Inherited Standards**: OpenZeppelin v5.0.2 (`ReentrancyGuard`, `Ownable2Step`, `Pausable`).
- **Deployment Pipeline**: Viem deployment scripts (`scripts/deploy_mainnet.mjs`), solc compiler script (`scripts/compile.cjs`), and Foundry script (`script/DeployPatronChain.s.sol`).
- **Target Network**: BOT Chain Mainnet (Chain ID `677`, native currency `BOT`, explorer `https://scan.botchain.ai`, RPC `https://rpc.botchain.ai`).

### 1.2 Core Protocol Components
- **`contracts/PatronChain.sol`**: Authoritative contract managing creator registry, tiered pricing, subscription lifecycles (subscribe, renew, upgrade, cancel with grace period), tipping, internal pull-payment balance accounting, and verifiable access gating.
- **`src/services/patronchain.ts`**: Service encapsulating all read/write contract calls with Viem.
- **`src/services/wallet.ts`**: Service handling EIP-1193 wallet connection, chain detection, balance tracking, and network switching.
- **`src/services/verification.ts`**: On-chain verification service executing `verifyMembership(creator, supporter)` to authoritative contract.
- **`src/services/history.ts`**: Event query service parsing contract events (`Subscribed`, `SubscriptionRenewed`, `SubscriptionUpgraded`, `SubscriptionCancelled`, `CreatorTipped`, `CreatorEarningsWithdrawn`).

---

## 2. Existing Testnet Deployment Information

### 2.1 Testnet Contract & Network State
- **Network Name**: BOT Chain Testnet (Bohr)
- **Chain ID**: `968` (`0x3c8`)
- **RPC Endpoint**: `https://rpc.bohr.life`
- **Block Explorer**: `https://scan.bohr.life`
- **Native Currency**: `BOT`
- **Contract Address**: `0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f`
- **Deployment Tx**: `0xe9e3579cf34f3217547f396cff4e15d031ed1d1f5bb07b114ccf5592e4504300`
- **Deployment Block**: `28441836`
- **Gas Used**: `2,961,373`
- **Deployer / Owner Address**: `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51`
- **Initial Treasury Address**: `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51`
- **Platform Fee**: `250` basis points (2.5%)

### 2.2 Testnet On-Chain Lifecycle Verification
All 10 lifecycle events were executed and confirmed on testnet (`deployments/testnet-execution-evidence.json`):
1. Supporter Funding (`0xeb0c847e...`)
2. Creator Registration (`0x8b3a3a45...`)
3. Tier 1 Creation (`0x32b884ab...`)
4. Tier 2 Creation (`0x758f86bb...`)
5. Subscription (`0x903d6271...`)
6. Subscription Renewal (`0x4d5fcee1...`)
7. Subscription Upgrade (`0x9acc4f81...`)
8. Subscription Cancellation with active access retention (`0xdf7b182f...`)
9. Direct Tipping (`0x40ed069b...`)
10. Creator Earnings Withdrawal (`0xf49f6333...`)

---

## 3. Comprehensive Inventory of Identified Testnet References

| File Location | Line(s) | Current Reference / Value | Required Mainnet Value |
| :--- | :--- | :--- | :--- |
| `.env` | L3-4 | `VITE_PATRONCHAIN_TESTNET_ADDRESS=0xb1ce...`, `VITE_ACTIVE_NETWORK=testnet` | Update to `VITE_ACTIVE_NETWORK=mainnet`, `VITE_PATRONCHAIN_CONTRACT_ADDRESS=<MAINNET_ADDR>` |
| `.env.example` | L10, 14, 20, 24 | `VITE_ACTIVE_NETWORK=testnet`, Testnet contract & Bohr RPC/Explorer links | Mainnet only (`VITE_ACTIVE_NETWORK=mainnet`, Chain 677, `https://rpc.botchain.ai`, `https://scan.botchain.ai`) |
| `src/config/chains.ts` | L3-26, 53-58 | `botchainTestnet` (Chain 968, `rpc.bohr.life`, `scan.bohr.life`), dual supported chain list | Mainnet-only chain definition (`botchainMainnet`, Chain 677), remove testnet chain |
| `src/config/environments.ts` | L16-26, 40-45, 47-60 | `testnet` environment config, `ACTIVE_ENVIRONMENT` default `testnet`, `chainId = 968` default in explorer URL generators | Single `mainnet` environment config, Chain ID 677 default |
| `src/config/contracts.ts` | L1491-1498 | `968: VITE_PATRONCHAIN_TESTNET_ADDRESS`, `getPatronChainAddress(chainId = 968)` | Mainnet contract address mapping, Chain ID 677 default |
| `src/services/wallet.ts` | L34, 47, 68, 74, 81-114 | `getPublicClient(chainId = 968)`, `chain: botchainTestnet` in `getWalletClient`, `switchToTestnet()`, `0x3c8` testnet params | Default Chain 677, `chain: botchainMainnet`, remove `switchToTestnet()`, keep `switchToMainnet()` |
| `src/services/patronchain.ts` | L46-49, 103, 124, 208, 357, 377 | Chain verification checks Chain 968, error prompt `Please switch to BOT Chain Testnet (Chain ID 968)`, method defaults `chainId = 968` | Strict requirement for Chain 677, error prompt `Please switch to BOT Chain Mainnet (Chain ID 677)`, method defaults `chainId = 677` |
| `src/services/verification.ts` | L31, 39 | `chainId: 968 \| 677 = 968`, error prompt mentions chain ID | Default `chainId: 677`, mainnet contract query |
| `src/services/history.ts` | L20, 25, 26 | Method comment refers to testnet, `chainId: 968 \| 677 = 968`, `fromBlock: 28441800n` (testnet block) | Chain 677, query deployment block forward, handle public RPC `eth_getLogs` notice safely |
| `src/hooks/useWallet.ts` | L13, 17, 21, 52-66 | `isCorrectNetwork = chainId === 968`, `cid = 968`, `switchToTestnet` exported | `isCorrectNetwork = chainId === 677`, `cid = 677`, remove `switchToTestnet` |
| `src/hooks/usePatronChain.ts` | L34, 197 | `const cid = chainId === 677 ? 677 : 968;` | `const cid = 677;` |
| `src/lib/blockchain.ts` | L31-37 | `testnet` network config (Chain 968, `rpc.bohr.life`, `scan.bohr.life`) | Mainnet only (`mainnet`, Chain 677) |
| `src/App.tsx` | L119, 125 | Wrong network banner: "PatronChain lives on BOT Chain Testnet (Chain ID 968)" / "Switch to BOT Testnet" | "PatronChain lives on BOT Chain Mainnet (Chain ID 677)" / "Switch to BOT Mainnet" |
| `src/App.tsx` | L158 | Topbar badge: `BOT Testnet · 968` | `BOT Mainnet · 677` |
| `src/App.tsx` | L209 | Connect modal: `BOT Chain Testnet · Chain ID 968 · Native BOT` | `BOT Chain Mainnet · Chain ID 677 · Native BOT` |
| `src/App.tsx` | L224-225 | Footer badge: `BOT Chain Testnet (Bohr) · 968` | `BOT Chain Mainnet · 677` |
| `src/App.tsx` | L242 | Footer contract link: `https://scan.bohr.life/address/0xb1ce...` | Confirmed mainnet contract address on `https://scan.botchain.ai/address/<MAINNET_ADDR>` |
| `src/App.tsx` | L620, 1796 | `verificationService.verify(..., 968)` | `verificationService.verify(..., 677)` |
| `src/App.tsx` | L751, 973 | Badges: `BOT testnet · 968`, `BOT Testnet · 968` | `BOT Mainnet · 677` |
| `src/App.tsx` | L2201 | `onSwitch={switchToTestnet}` | `onSwitch={switchToMainnet}` |
| `src/App.tsx` | L2218 | `href={getExplorerTxUrl(notification.txHash, 968)}` | `href={getExplorerTxUrl(notification.txHash, 677)}` |
| `scripts/deploy_mainnet.mjs` | L116-120 | Bug identified: `args: [initialFeeBasisPoints]` (missing `initialOwner` and `initialTreasury`) | Fixed to pass `[account.address, account.address, BigInt(initialFeeBasisPoints)]` |
| `foundry.toml` | L13, 17 | `botchain_testnet` RPC endpoint and etherscan config | Retain `botchain_mainnet` (`https://rpc.botchain.ai`, `https://scan.botchain.ai/api`), clean active defaults |
| `README.md` | L6, 28-43, 58-74 | Badges, testnet addresses, testnet tables | Update to feature BOT Chain Mainnet as active network |

---

## 4. Existing GitHub Repository & Branch Configuration
- **Remote Origin**: `https://github.com/GoodnessTech/Patronchain.git`
- **Active Branch**: `main`
- **Working Tree**: Clean (all changes tracked; secrets ignored via `.gitignore`).
- **Release Strategy**: Single commit `feat: migrate PatronChain to BOT Chain mainnet` pushed directly to `main` without `--force`.

---

## 5. Deployment Wallet & Mainnet Pre-Flight State

### 5.1 Wallet Credentials & Balance
- **Source**: Secure `.env` local environment variable (`PRIVATE_KEY`).
- **Deployer Address**: `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51`
- **Mainnet RPC Endpoint**: `https://rpc.botchain.ai`
- **Verified Remote Chain ID**: `677` (`0x2a5`)
- **Verified Remote Latest Block**: `28,824,009+`
- **Current Mainnet Gas Price**: `20 Gwei` (`20,000,000,000 wei`)
- **Deployer Mainnet Balance**: `0.20510265 BOT` (`205,102,650,000,000,000 wei`)
- **Estimated Deployment Gas**: `~2,961,373` units.
- **Estimated Total Deployment Gas Cost**: `~0.0592 BOT`.
- **Solvency Ratio**: The deployer wallet has **> 3.4x** the required gas funds. No funding shortfall exists.

---

## 6. Potential Deployment Blockers & Mitigation Strategy

1. **RPC Latency / Timeout**:
   - *Risk*: `https://rpc.botchain.ai` hosted in AWS Tokyo requires >10s timeout during periods of high latency. Standard Viem 10s default can trigger false timeout errors.
   - *Mitigation*: Configure Viem HTTP transport with `timeout: 60_000` (60 seconds) and retry count of 3.

2. **Constructor Argument Mismatch in `scripts/deploy_mainnet.mjs`**:
   - *Risk*: Line 119 in `deploy_mainnet.mjs` passed `args: [initialFeeBasisPoints]` instead of the required 3 arguments (`initialOwner`, `initialTreasury`, `initialFeeBps`). This would have caused an immediate RPC transaction revert and wasted gas.
   - *Mitigation*: Corrected `args` to `[account.address, account.address, BigInt(initialFeeBasisPoints)]` in alignment with approved `PatronChain.sol` and `deploy_testnet.mjs`.

3. **`eth_getLogs` Disabled on Public Mainnet RPC Endpoint**:
   - *Risk*: The official BOT Chain documentation confirms `eth_getLogs` is disabled on the public `https://rpc.botchain.ai` RPC node. Direct event filtering queries will return errors on mainnet.
   - *Mitigation*: In `history.ts`, wrap event queries in resilient fallbacks that gracefully handle RPC log restrictions without interrupting real-time contract reads. Ensure authoritative contract state (`verifyMembership`, `getCreator`, `getCreatorTiers`, `getCreatorFinancials`) is always retrieved via direct `eth_call` to the mainnet contract, which is 100% operational.

4. **Secret Exposure**:
   - *Risk*: Accidental staging of `.env` or logging of `PRIVATE_KEY`.
   - *Mitigation*: Strict `.gitignore` enforcement verified. Deployment scripts read strictly from local environment without printing keys.

---

## 7. Migration Approval & Next Steps
Phase 1 inspection and audit is complete. All testnet references and requirements are cataloged. We are cleared to proceed with **Phase 2 (Mainnet-Only Migration)**, **Phase 4 (Guarded Mainnet Deployment)**, **Phase 6 (Verification)**, **Phase 7 (Mainnet Environment File)**, and **Phase 8-14 (Frontend/Backend Migration, Build, Verification & GitHub Release)**.
