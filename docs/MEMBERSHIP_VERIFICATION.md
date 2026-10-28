# PatronChain — Third-Party Membership Verification Guide

## 1. Overview

PatronChain provides an authoritative on-chain verification interface designed for seamless integration into:
- Web3 dApps (token-gated content, exclusive features)
- Discord bots (Guild / Collab.Land / custom role bots)
- Backend APIs (gatekeeping streaming media, newsletters, downloads)
- Mobile applications

Because membership entitlement lives entirely on-chain, integrators require **no API keys, no centralized webhooks, and zero third-party dependencies**—only a standard BOT Chain RPC connection.

---

## 2. Smart Contract Verification Interface

The `PatronChain` contract exposes two primary view methods for verification:

```solidity
/**
 * @notice Authoritative check for third-party applications
 * @param subscriber The address of the subscriber
 * @param creator The address of the creator
 * @param requiredTierId The minimum required tier ID (e.g. 1)
 * @return isValid True if subscriber has unexpired access at or above requiredTierId
 * @return currentTierId The tier ID the subscriber currently holds
 * @return paidUntil Unix timestamp when access expires
 * @return isCancelled Whether subscriber cancelled recurring renewal intent
 */
function verifyMembership(
    address subscriber,
    address creator,
    uint256 requiredTierId
) external view returns (
    bool isValid,
    uint256 currentTierId,
    uint256 paidUntil,
    bool isCancelled
);

/**
 * @notice Convenience check for simple boolean access
 * @param subscriber The address of the subscriber
 * @param creator The address of the creator
 * @return True if subscription exists and is currently active
 */
function isSubscriptionActive(
    address subscriber,
    address creator
) external view returns (bool);
```

---

## 3. Integration Examples

### 3.1 TypeScript with Viem (Recommended)

```typescript
import { createPublicClient, http, parseAbi } from 'viem';

// 1. Configure BOT Chain client
const client = createPublicClient({
  transport: http('https://rpc.bohr.life'), // or https://rpc.botchain.ai for mainnet
});

const PATRONCHAIN_ADDRESS = '0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f';

const PATRONCHAIN_ABI = parseAbi([
  'function verifyMembership(address subscriber, address creator, uint256 requiredTierId) external view returns (bool isValid, uint256 currentTierId, uint256 paidUntil, bool isCancelled)',
  'function isSubscriptionActive(address subscriber, address creator) external view returns (bool)',
]);

export async function checkAccess(
  subscriberAddress: `0x${string}`,
  creatorAddress: `0x${string}`,
  requiredTier: bigint = 1n
): Promise<{ hasAccess: boolean; paidUntil: Date; isCancelled: boolean }> {
  const [isValid, currentTierId, paidUntil, isCancelled] = await client.readContract({
    address: PATRONCHAIN_ADDRESS,
    abi: PATRONCHAIN_ABI,
    functionName: 'verifyMembership',
    args: [subscriberAddress, creatorAddress, requiredTier],
  });

  return {
    hasAccess: isValid,
    paidUntil: new Date(Number(paidUntil) * 1000),
    isCancelled,
  };
}

// Example usage
async function run() {
  const result = await checkAccess(
    '0x0f27914603B48D1D1d4681E1553c3C65448b1115',
    '0x34090545BD562b0bE1Cdc855F7cA9beE4566CE51',
    1n
  );

  if (result.hasAccess) {
    console.log(`Access Granted! Paid until: ${result.paidUntil.toISOString()}`);
    if (result.isCancelled) {
      console.log('Notice: User has cancelled renewal, but access remains valid.');
    }
  } else {
    console.log('Access Denied: Expired or non-existent membership.');
  }
}
```

---

### 3.2 JavaScript with Ethers.js v6

```javascript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://rpc.bohr.life');
const contractAddress = '0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f';

const abi = [
  'function verifyMembership(address subscriber, address creator, uint256 requiredTierId) view returns (bool isValid, uint256 currentTierId, uint256 paidUntil, bool isCancelled)',
];

const contract = new ethers.Contract(contractAddress, abi, provider);

async function verifySubscriber(userAddress, creatorAddress, minTier = 1) {
  const [isValid, tier, paidUntil, isCancelled] = await contract.verifyMembership(
    userAddress,
    creatorAddress,
    minTier
  );

  console.log(`Subscriber: ${userAddress}`);
  console.log(`Status    : ${isValid ? 'VALID' : 'INVALID'}`);
  console.log(`Tier ID   : ${tier.toString()}`);
  console.log(`Expires   : ${new Date(Number(paidUntil) * 1000).toLocaleString()}`);
  console.log(`Cancelled : ${isCancelled}`);

  return isValid;
}
```

---

### 3.3 Direct Raw JSON-RPC `eth_call`

For low-overhead environments (e.g. Cloudflare Workers, bash scripts):

```bash
# 4-byte selector for verifyMembership(address,address,uint256) is 0xd1eb5d4e
curl -s -X POST https://rpc.bohr.life \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "0xb1ceb34818617a5b59c0d6ca98e2c4481b8a845f",
      "data": "0xd1eb5d4e0000000000000000000000000f27914603b48d1d1d4681e1553c3c65448b111500000000000000000000000034090545bd562b0be1cdc855f7ca9bee4566ce510000000000000000000000000000000000000000000000000000000000000001"
    }, "latest"],
    "id": 1
  }'
```

---

## 4. Edge Cases & Semantic Rules

| Scenario | `isValid` | `isCancelled` | Access Permitted? |
| :--- | :---: | :---: | :---: |
| Active, uncancelled subscription | `true` | `false` | **YES** |
| Active, but subscriber clicked Cancel | `true` | `true` | **YES** (until `paidUntil`) |
| Expired subscription (`block.timestamp > paidUntil`) | `false` | `false`/`true` | **NO** |
| Subscriber holds Tier 1, requirement is Tier 2 | `false` | `false` | **NO** |
| Subscriber holds Tier 3, requirement is Tier 1 | `true` | `false` | **YES** (`currentTierId >= requiredTierId`) |
