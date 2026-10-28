# Phase Zero Engineering Assessment Report: PatronChain

**Project**: PatronChain  
**Category**: SocialFi + PayFi  
**Tagline**: Memberships that live on-chain.  
**Target Environment**: BOT Chain Testnet (Bohr, Chain ID: 968) & Mainnet Ready (Chain ID: 677)  
**Date**: October 28, 2026  
**Author**: Lead Blockchain & Protocol Engineer  

---

## 1. Executive Summary

This report establishes the baseline technical assessment of the existing Bolt-generated frontend project for PatronChain. The objective of this project is to transform a static, prototype-level React/Vite interface into a fully functional, production-grade Web3 application powered by an authoritative smart contract deployed on the BOT Chain network.

The frontend has a distinct neo-brutalist aesthetic with high-contrast typography, bold borders, vivid accent colors (`#ffda24`, `#19c9df`, `#f36bb7`), and strong component layouts. This visual design will be strictly preserved, while the underlying architecture is upgraded to bind all state to on-chain smart contract data and verifiable blockchain events.

---

## 2. Existing Architecture & Directory Structure

### 2.1 Workspace Structure
```
Patronchain/
├── .env                        # Local deployment configuration (PRIVATE_KEY)
├── .gitignore                  # Git ignore rules including .env and build output
├── docs/                       # Technical architecture, security, and verification reports
├── contracts/                  # Smart contracts (PatronChain.sol)
├── test/                       # Contract test suite (Foundry & TypeScript)
├── script/                     # Contract deployment scripts
├── deployments/                # Verifiable network deployment artifacts
├── src/                        # React TypeScript source
│   ├── App.tsx                 # Core application shell and routing
│   ├── main.tsx                # React DOM root entry
│   ├── index.css               # Global CSS, typography (Space Grotesk, DM Mono), neo-brutalist utilities
│   ├── vite-env.d.ts           # Vite client environment declarations
│   └── lib/
│       └── blockchain.ts       # Network definitions (testnet 968, mainnet 677) and service signatures
├── index.html                  # HTML entrypoint
├── package.json                # Project dependencies and npm scripts
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # Root TypeScript configuration
├── tsconfig.app.json           # Application TypeScript configuration
└── vite.config.ts              # Vite configuration with `@/` alias mapped to `src/`
```

### 2.2 Framework & Core Dependencies
- **UI Framework**: React 18.3.1 with React DOM 18.3.1
- **Language**: TypeScript 5.5.3
- **Build Tool**: Vite 7.3.7 with `@vitejs/plugin-react`
- **CSS Engine**: Tailwind CSS 3.4.1, Autoprefixer 10.4.18, PostCSS 8.4.35
- **Icons**: Lucide React 0.446.0
- **Fonts**: Space Grotesk (sans-serif) and DM Mono (monospace) loaded via Google Fonts
- **Backend/DB**: `@supabase/supabase-js` present in `package.json` but currently unutilized. In alignment with our engineering philosophy, we avoid redundant off-chain databases and retain the blockchain as the financial source of truth.

---

## 3. Existing Routes & Page Analysis

The application currently manages client-side navigation using URL hash routing (`window.location.hash`) via a custom `useRoute` hook in `src/App.tsx`.

| Route | View ID | Description & Current State |
|---|---|---|
| `#/` | `home` | Landing page featuring Hero banner, Product Preview card, 3-step "How it works" section, "For creators" section, CTA footer, and official BOT Chain links. Static presentation. |
| `#/dashboard` | `dashboard` | Creator Overview dashboard displaying placeholder metrics (Active memberships, Subscription revenue, Next renewal), recent activity empty state, and quick action buttons. |
| `#/tiers` | `tiers` | Creator Membership Tier management. Contains `TierForm` modal for creating in-memory tiers (draft state). Lacks on-chain transaction dispatch. |
| `#/subscribers` | `subscribers` | Subscriber list with search input and status filter dropdown (`All statuses`, `Active`, `Expired`, `Cancelled`, `Pending`). Currently shows empty state. |
| `#/payments` | `payments` | Payment history ledger with filter pills (`All activity`, `Subscriptions`, `Renewals`, `Tips`). Shows empty state. |
| `#/explore` | `explore` | Public community and creator discovery page with search filter. Shows empty state. |
| `#/creator` | `creator` | Public Creator profile page with avatar, placeholder address, "Send a tip" button, and public tiers display. |
| `#/membership` | `membership` | Supporter individual membership details view (status, paid-through date, action triggers). |
| `#/my-memberships` | `my-memberships` | Supporter dashboard showing all memberships held across creators. |

---

## 4. Existing Design System & Reusable Components

The UI follows a cohesive neo-brutalist design system:
- **Palette**:
  - Primary Background: `#f4f1eb` / `#eeece5` (warm cream)
  - Dark Surface / Text: `#121416` (deep obsidian black)
  - Bright Yellow: `#ffda24` (accent buttons, founding tier badges)
  - Cyan: `#19c9df` / `#0aa6bc` (accent badges, highlight text, active navigation)
  - Pink: `#f36bb7` (accent badges, secondary highlights)
  - Neutral Borders: `2px solid #121416`
  - Brutalist Shadows: `shadow-brutal` (`5px 5px 0 #121416`), `shadow-brutal-sm` (`3px 3px 0 #121416`)
- **Reusable UI Elements**:
  - `Mark`: Consistent logo icon with yellow brutalist 'P' and "PatronChain." typography.
  - `Pill`: Neo-brutalist badge component in cyan, pink, yellow, or dark variants.
  - `WalletButton`: Standard connect wallet trigger with brutalist hover translation.
  - `Modal`: Accessible backdrop modal dialog with 2px borders and close button.
  - `ConnectModal`: Provider selection modal.
  - `PageHeader`: Standard view heading with uppercase monospace eyebrow, bold title, and optional description/action button.
  - `EmptyState`: Clean dashed-border empty state container with icon and call to action.
  - `Footer`: Official footer with mandatory links to **Botchain** (`https://www.botchain.ai/`) and **Botscan** (`https://scan.botchain.ai/`).

---

## 5. Identified Gaps & Missing Functionality

1. **Smart Contract Layer**:
   - No Solidity smart contract exists in the repository.
   - The contract must establish the authoritative state for creator registration, tiers, subscriptions, renewals, upgrades, cancellations, tipping, accounting, and withdrawals.

2. **Web3 Provider & Wallet Connection**:
   - `ConnectModal` only renders mock buttons (`Browser wallet`, `WalletConnect`) with no actual EVM provider integration (`window.ethereum`).
   - No automatic account change listeners, network validation (Chain ID 968 / 677), or chain addition (`wallet_addEthereumChain`).

3. **Creator Lifecycle**:
   - No on-chain creator registration (`registerCreator(string metadataURI)`).
   - Tiers created in `TierForm` are stored in ephemeral React state instead of executing `createTier()` on-chain.
   - No tier update (`updateTier()`) or activation toggle (`setTierActive()`).

4. **Supporter Subscription & Financial Lifecycle**:
   - No `subscribe(address creator, uint256 tierId)` payable function call.
   - No `renewSubscription(address creator)` renewal execution.
   - No `upgradeSubscription(address creator, uint256 newTierId)` with upfront disclosure.
   - No `cancelSubscription(address creator)` retaining access through `paidUntil`.
   - No `tipCreator(address creator)` payable interaction.

5. **Accounting & Withdrawals**:
   - No tracking or execution of `withdrawEarnings()` for creators.
   - No platform fee collection or `withdrawPlatformFees()` for the platform treasury.

6. **Historical Activity & Indexing**:
   - Payment history and subscriber tables are blank and do not listen to smart contract events.

7. **Membership Verification**:
   - No public verification service or utility that allows external dApps to verify whether an address holds an active membership.

---

## 6. Integration Requirements & Technology Selection

- **Web3 Client Library**: `viem` (v2.x) will be installed. Viem provides lightweight, type-safe, performant EVM client abstractions without bloated dependencies.
- **Contract Toolchain**:
  - Primary contract implementation in Solidity `^0.8.24` utilizing OpenZeppelin Contracts (`ReentrancyGuard`, `Ownable2Step`, `Pausable`).
  - Full Foundry test suite files created in `test/` and `script/` matching protocol specifications.
  - Hardhat / Viem local compilation and testing runner to execute automated tests natively in this Node.js environment.
- **RPC & Explorer Endpoints**:
  - Testnet: Chain ID `968`, RPC `https://rpc.bohr.life`, Explorer `https://scan.bohr.life`
  - Mainnet: Chain ID `677`, RPC `https://rpc.botchain.ai`, Explorer `https://scan.botchain.ai`

---

## 7. Potential Technical Risks & Mitigations

| Risk | Description | Mitigation |
|---|---|---|
| **EVM Timestamp Drift** | Block timestamps may vary slightly across validators. | All membership expiration checks use strict inequality (`block.timestamp <= paidUntil`). |
| **Withdrawal Reentrancy** | Malicious contracts could attempt reentrant calls during native BOT withdrawals. | Apply OpenZeppelin's `ReentrancyGuard` and strictly adhere to Checks-Effects-Interactions (CEI). |
| **Network Misconfiguration** | Users connecting with Ethereum Mainnet, BSC, or Polygon. | Pre-flight chain ID validation on every transaction; prompt user to switch to BOT Chain Testnet (968) using `wallet_switchEthereumChain` / `wallet_addEthereumChain`. |
| **Gas & Decimal Precision** | BOT has 18 decimals; basis points calculations for fees. | Perform integer arithmetic in basis points (`fee = (amount * feeBps) / 10000`) with bounded max fee (1000 bps / 10%). |
| **Non-rebuilding Requirement** | Must not alter existing aesthetics. | Re-use existing CSS classes, color codes, and component structures while hooking real state. |

---

## 8. Proposed Implementation Sequence

1. **Phase 1 & 2**: Finalize typed network configuration (`src/config/chains.ts`, `src/config/environments.ts`, `src/config/contracts.ts`).
2. **Phase 3 & 4**: Author `contracts/PatronChain.sol` with creator registry, tier engine, subscription lifecycle, tipping, accounting, and security guards.
3. **Phase 5 & 6**: Construct complete Foundry test suite (`test/PatronChain.t.sol`, `test/PatronChainSecurity.t.sol`, `test/PatronChainLifecycle.t.sol`, `test/PatronChainFees.t.sol`, `script/DeployPatronChain.s.sol`), run tests, verify 100% passing results, and extract ABI.
4. **Phase 7**: Deploy `PatronChain.sol` to BOT Chain Testnet (Chain ID 968) using the provided deployer key. Save deployment evidence to `deployments/botchain-testnet.json`.
5. **Phase 8 & 9**: Build typed services (`src/services/wallet.ts`, `src/services/patronchain.ts`, `src/services/verification.ts`, `src/services/history.ts`) and React hooks (`useWallet`, `usePatronChain`).
6. **Phase 10**: Wire all frontend routes, forms, modals, and tables to real contract data and transactions.
7. **Phase 11**: Prepare Mainnet configuration (`docs/MAINNET_READINESS.md`, mainnet deployment script).
8. **Phase 12**: Complete documentation suite and deliver verifiable evidence.
