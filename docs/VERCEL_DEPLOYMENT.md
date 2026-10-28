# PatronChain — Vercel Deployment & Environment Configuration Guide 🚀

This document provides a step-by-step walkthrough for deploying **PatronChain** to [Vercel](https://vercel.com/) with zero friction, optimal caching, and client-side SPA routing.

---

## 1. Quick Deployment Overview

PatronChain's frontend is a React + Vite Single Page Application (SPA) communicating directly with the **BOT Chain** via Viem and browser wallets (MetaMask, Rabby, Coinbase Wallet).

* **Repository**: [https://github.com/GoodnessTech/Patronchain.git](https://github.com/GoodnessTech/Patronchain.git)
* **Framework Preset**: Vite
* **Build Command**: `npm run build` (or `vite build`)
* **Output Directory**: `dist`
* **Install Command**: `npm install`
* **SPA Routing**: Handled automatically via `vercel.json`

---

## 2. Environment Variables Configuration

Set these variables in Vercel under:  
**Project Settings → Environment Variables** (Apply to *Production*, *Preview*, and *Development* environments).

| Environment Variable | Description | Required? | Recommended Default Value |
| :--- | :--- | :---: | :--- |
| `VITE_ACTIVE_NETWORK` | Active chain mode (`testnet` or `mainnet`) | **Yes** | `testnet` |
| `VITE_PATRONCHAIN_TESTNET_ADDRESS` | Deployed PatronChain contract on BOT Chain Testnet | **Yes** | `0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f` |
| `VITE_PATRONCHAIN_MAINNET_ADDRESS` | Deployed PatronChain contract on BOT Chain Mainnet | Optional | `0x0000000000000000000000000000000000000000` |
| `VITE_TESTNET_RPC_URL` | RPC endpoint for BOT Chain Testnet (Bohr) | Optional | `https://rpc.bohr.life` |
| `VITE_TESTNET_EXPLORER_URL` | Block explorer base URL for Testnet | Optional | `https://scan.bohr.life` |
| `VITE_MAINNET_RPC_URL` | RPC endpoint for BOT Chain Mainnet | Optional | `https://rpc.botchain.ai` |
| `VITE_MAINNET_EXPLORER_URL` | Block explorer base URL for Mainnet | Optional | `https://scan.botchain.ai` |

> ⚠️ **CRITICAL SECURITY NOTICE**:  
> **DO NOT** add any `PRIVATE_KEY` or `MAINNET_DEPLOYER_PRIVATE_KEY` to Vercel!  
> PatronChain is a non-custodial Web3 dApp: all transactions are signed directly in the user's browser wallet. Private keys are only used for offline node CLI deployment scripts (`scripts/deploy_testnet.mjs`, `scripts/deploy_mainnet.mjs`).

---

## 3. Step-by-Step Vercel Deployment Instructions

### Step 1: Import the Repository
1. Log in to [Vercel](https://vercel.com/dashboard).
2. Click **"Add New..."** → **"Project"**.
3. Select your GitHub account and choose **`GoodnessTech/Patronchain`**.

### Step 2: Configure Project Settings
Vercel will automatically detect Vite. Confirm the settings:
* **Framework Preset**: `Vite`
* **Root Directory**: `./`
* **Build Command**: `npm run build`
* **Output Directory**: `dist`
* **Install Command**: `npm install`

### Step 3: Add Environment Variables
Expand the **Environment Variables** section and paste the following:

```env
VITE_ACTIVE_NETWORK=testnet
VITE_PATRONCHAIN_TESTNET_ADDRESS=0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f
VITE_PATRONCHAIN_MAINNET_ADDRESS=0x0000000000000000000000000000000000000000
VITE_TESTNET_RPC_URL=https://rpc.bohr.life
VITE_TESTNET_EXPLORER_URL=https://scan.bohr.life
VITE_MAINNET_RPC_URL=https://rpc.botchain.ai
VITE_MAINNET_EXPLORER_URL=https://scan.botchain.ai
```

### Step 4: Deploy
Click **"Deploy"**.  
Vercel will install dependencies, compile the production bundle via Vite, apply `vercel.json` rewrites, and generate your live URL (e.g., `https://patronchain.vercel.app`).

---

## 4. Post-Deployment Verification Checklist

After deployment succeeds:
1. **Visit the deployed URL**.
2. **Verify Neo-Brutalist Styling**: Confirm typography, high-contrast borders, and color accents (`#ffda24`, `#19c9df`, `#f36bb7`, `#121416`, `#f4f1eb`) render crisply.
3. **Connect Wallet**: Click "Connect Wallet". Ensure your browser wallet prompts you to connect or switch to **BOT Chain Testnet** (`Chain ID: 968`).
4. **Test Public Verification**: Enter creator address `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` and supporter address `0x6f076b14D59040BcEe83606fcEcc38F4D056866b` into the Verify widget to observe live on-chain status fetched from the contract.
5. **Footer Links**: Confirm links to [Botchain](https://www.botchain.ai/) and [Botscan](https://scan.botchain.ai/) function properly.
