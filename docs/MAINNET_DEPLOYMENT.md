# PatronChain — BOT Chain Mainnet Deployment Report

## 1. Executive Summary
PatronChain was successfully deployed to **BOT Chain Mainnet (Chain ID 677)** on November 2, 2026. The deployment was executed using the approved Solidity `0.8.24` production artifact with deterministic optimization (200 runs), minimal safe gas pricing (20 Gwei), and full post-deployment invariant validation.

---

## 2. Official Network Configuration

| Parameter | Value |
| :--- | :--- |
| **Network Name** | BOT Chain Mainnet |
| **Chain ID** | `677` (`0x2a5`) |
| **RPC Endpoint** | `https://rpc.botchain.ai` |
| **Block Explorer** | `https://scan.botchain.ai` |
| **Native Currency** | `BOT` (Decimals: 18) |
| **Consensus Mechanism** | Parlia (Proof-of-Staked Authority) |

---

## 3. Production Deployment Record

| Parameter | Value |
| :--- | :--- |
| **Contract Name** | `PatronChain` |
| **Contract Address** | [`0xa5590be3e48dd445fa871fd813bce8f253a85439`](https://scan.botchain.ai/address/0xa5590be3e48dd445fa871fd813bce8f253a85439) |
| **Deployment Transaction** | [`0x54805fad8932be138b9e35a1bce166b17fd919dc7c31d02a1bbf94755723593d`](https://scan.botchain.ai/tx/0x54805fad8932be138b9e35a1bce166b17fd919dc7c31d02a1bbf94755723593d) |
| **Deployment Block Number** | `28825531` |
| **Deployed Bytecode Size** | `12,979` bytes |
| **Deployer Wallet** | `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` |
| **Contract Owner** | `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` |
| **Treasury Address** | `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` |
| **Platform Fee** | `250` basis points (2.5%) |
| **Max Fee Cap** | `1000` basis points (10.0%) |
| **Circuit Breaker (`paused`)** | `false` (Operational) |

---

## 4. Gas & Expenditure Analysis

| Metric | Measured Value |
| :--- | :--- |
| **Gas Estimated** | `2,986,043` units |
| **Gas Limit Applied** | `3,284,647` units (+10% safety margin) |
| **Actual Gas Used** | `2,961,373` units |
| **Effective Gas Price** | `20,000,000,000 wei` (20 Gwei) |
| **Total BOT Spent on Deployment** | **`0.05922746 BOT`** |
| **Deployment Transactions** | `1` (Single atomic deployment) |
| **Redundant / Resubmitted Transactions** | `0` |

---

## 5. Build & Compiler Specification

- **Compiler Version**: Solidity `0.8.24` (`solc-v0.8.24`)
- **EVM Target**: Default (`cancun` / `paris` compatible)
- **Optimizer Enabled**: `true`
- **Optimizer Runs**: `200`
- **Dependencies**: OpenZeppelin Contracts v5.0.2
  - `ReentrancyGuard.sol`
  - `Ownable2Step.sol`
  - `Pausable.sol`

### Constructor Arguments
1. `initialOwner`: `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51`
2. `initialTreasury`: `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51`
3. `initialFeeBps`: `250`

---

## 6. On-Chain Invariant Assertions

Immediately following transaction confirmation at block `28825531`, five core invariants were queried and verified directly from the mainnet RPC node:
1. `platformFeeBps()` returned `250` ✅
2. `owner()` returned `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` ✅
3. `treasury()` returned `0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51` ✅
4. `paused()` returned `false` ✅
5. `MAX_FEE_BPS()` returned `1000` ✅
