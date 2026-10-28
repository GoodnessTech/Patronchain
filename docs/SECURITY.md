# PatronChain — Security Specification & Threat Model

## 1. Threat Model & Asset Identification

### 1.1 Protected Assets
1. **User Native BOT Balances**: Native BOT paid by supporters during subscriptions, renewals, upgrades, and tips.
2. **Creator Withdrawable Balances**: Pending earnings credited to individual creators (`creatorBalances[creator]`).
3. **Protocol Fee Treasury**: Platform fees (`accumulatedPlatformFees`) reserved for protocol governance.
4. **Subscription Entitlement**: Authenticity and integrity of time-bound access rights (`paidUntil`, `tierId`).

### 1.2 Potential Adversaries
- **Malicious Subscribers**: Attempting to gain membership without paying, underpaying, spoofing payment receipts, or double-claiming duration.
- **Malicious Creators**: Attempting to drain other creators' funds, manipulate fee calculations, or trap subscriber capital.
- **Reentrancy Attackers**: Calling malicious fallback / receive functions during native ETH/BOT withdrawals to drain contract reserves.
- **Front-Runners / MEV Searchers**: Exploiting pending transactions to register handles or front-run price changes.
- **Compromised Protocol Owner**: Attempting to extract unearned creator funds or impose extortionate fee rates.

---

## 2. Security Invariants & Guarantees

| Invariant | Mathematical Formulation | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Solvency Invariant** | `address(this).balance >= accumulatedPlatformFees + sum(creatorBalances)` | Every deposit adds exact `msg.value` split; withdrawals decrement before transfer |
| **Fee Ceiling Invariant** | `platformFeeBasisPoints <= 1000` (10.0%) | Checked in constructor and `setPlatformFee()`; reverts with `FeeTooHigh()` |
| **Pull Pattern Invariant** | Zero external calls during payment processing | Direct state credit; zero push transfers to creators in `subscribe`/`renew`/`tip` |
| **Zero-Address Guard** | Critical addresses cannot be zero | `ZeroAddress()` checks on creator targets and fee recipient |
| **Monotonic Renewal** | `newPaidUntil > currentPaidUntil` | Calculated as `paidUntil + duration` or `block.timestamp + duration` |

---

## 3. Vulnerability Mitigations & Implementation Details

### 3.1 Reentrancy & External Calls
- **Vector**: When calling `address.call{value: amount}("")` to release earnings, a malicious contract could reenter `withdrawEarnings()` or other state-modifying functions.
- **Mitigation**:
  1. OpenZeppelin's battle-tested `ReentrancyGuard` modifier is applied to all withdrawal and payment functions (`withdrawEarnings`, `withdrawPlatformFees`, `subscribe`, `renewSubscription`, `upgradeSubscription`, `tipCreator`).
  2. Strict **Checks-Effects-Interactions (CEI)** pattern:
     ```solidity
     uint256 balance = creatorBalances[msg.sender];
     if (balance == 0) revert NoBalance();

     // Effect BEFORE interaction
     creatorBalances[msg.sender] = 0;

     // Interaction
     (bool success, ) = msg.sender.call{value: balance}("");
     if (!success) revert TransferFailed();
     ```

### 3.2 Access Control & Governance
- **Vector**: Unauthorized extraction of platform fees or manipulation of fee rates.
- **Mitigation**:
  - OpenZeppelin `Ownable2Step` enforces two-phase ownership transfer:
    1. Current owner calls `transferOwnership(newOwner)`.
    2. Proposed owner must explicitly call `acceptOwnership()`.
  - Eliminates catastrophic loss of protocol control due to typos or invalid recipient addresses.

### 3.3 Fee Extraction Safety
- **Vector**: Owner attempting to drain creator earnings via protocol withdrawal.
- **Mitigation**:
  - `withdrawPlatformFees` only withdraws from `accumulatedPlatformFees`.
  - It has zero access to `creatorBalances[creator]` mapping.
  - Invariant: Protocol owner can never touch creator funds.

### 3.4 Timestamp Manipulation Analysis
- **Vector**: Miners/validators slightly adjusting `block.timestamp` to extend access.
- **Analysis**:
  - On BOT Chain (Bohr consensus / PoS), block timestamps are constrained by network slot limits (variance typically < 15 seconds).
  - PatronChain subscription periods are measured in days (`periodDuration >= 1 days = 86,400 seconds`).
  - A 15-second variance is less than 0.017% of a 1-day cycle and 0.0005% of a 30-day cycle, rendering timestamp manipulation economically insignificant.

### 3.5 Denial-of-Service (DoS) Prevention
- **Vector**: Creator contract with rejecting fallback causing `subscribe()` to revert.
- **Mitigation**:
  - Under no circumstances does `subscribe`, `renewSubscription`, `upgradeSubscription`, or `tipCreator` perform an external call to the creator address.
  - Funds are credited to internal mapping `creatorBalances[creator]`.
  - Even if a creator's address is a contract that always reverts on receive, subscriber transactions succeed unconditionally. The creator simply cannot withdraw until they implement a valid recipient.

### 3.6 Handle Squatting & Collision
- **Vector**: Front-running handles or uppercase/lowercase spoofing (e.g. `Creator` vs `creator`).
- **Mitigation**:
  - `toLower()` normalizes all handles before computing `keccak256(bytes(lowerHandle))`.
  - Handle lengths are constrained to `3` to `32` characters.
  - Only alphanumeric characters (`a-z`, `0-9`) and underscores (`_`) are permitted.

---

## 4. Emergency Circuit Breakers

The contract inherits OpenZeppelin's `Pausable`:
- If an anomalous network condition or upstream RPC vulnerability arises, the contract owner can invoke `pause()`.
- While paused:
  - New subscriptions, renewals, upgrades, and tips are blocked.
  - View functions (`verifyMembership`, `isSubscriptionActive`) remain completely operational, allowing downstream apps to continue reading entitlements.
  - `withdrawEarnings()` can still be called (unless specifically paused) to ensure creators can always retrieve earned capital.
