# PatronChain — Protocol Specification

## 1. Overview
The `PatronChain` smart contract is written in Solidity `^0.8.24` and deployed on BOT Chain. It provides trustless, on-chain recurring membership management, payment routing, and entitlement verification using native **BOT** tokens.

---

## 2. Data Structures

### 2.1 Structs

#### `Creator`
Represents an individual creator registered on the protocol.
```solidity
struct Creator {
    address wallet;           // Payout and administration address
    string handle;            // Unique alphanumeric handle (e.g. "satoshistudio")
    string displayName;       // Human-readable creator or project name
    string description;       // Bio / statement of creator offering
    string avatarUrl;         // URL or IPFS CID to creator avatar
    string category;          // Niche category (e.g. "Gaming", "Art", "Dev")
    bool registered;          // Registration status flag
    uint256 createdAt;        // Registration block timestamp
    uint256 tierCount;        // Total tiers ever created by this creator
    uint256 totalSubscribers; // Total active/historic subscriber count
}
```

#### `Tier`
Represents a membership tier offered by a creator.
```solidity
struct Tier {
    uint256 tierId;           // 1-indexed identifier scoped to creator
    string name;              // Tier name (e.g. "Supporter", "VIP Pass")
    string description;       // Tier perks and deliverables
    uint256 pricePerPeriod;   // Price in native BOT wei per billing cycle
    uint256 periodDuration;   // Duration of cycle in seconds (e.g., 2592000 for 30 days)
    bool active;              // Whether new subscriptions can join this tier
    uint256 createdAt;        // Creation block timestamp
}
```

#### `Subscription`
Represents the relationship between a subscriber and a creator.
```solidity
struct Subscription {
    address subscriber;       // Subscriber wallet address
    address creator;          // Creator wallet address
    uint256 tierId;           // Active tier ID (1-indexed)
    uint256 paidUntil;        // Unix timestamp when access expires
    bool cancelled;           // Cancellation flag (stops auto-renewal expectation)
    uint256 totalPaid;        // Cumulative native BOT paid to this creator
    uint256 lastPaymentTime;  // Timestamp of the most recent payment
}
```

---

## 3. Custom Errors

```solidity
error NotRegistered();
error AlreadyRegistered();
error HandleAlreadyTaken();
error InvalidHandle();
error InvalidTier();
error TierInactive();
error InvalidAmount();
error InvalidDuration();
error SubscriptionNotFound();
error SubscriptionAlreadyActive();
error ZeroAddress();
error TransferFailed();
error FeeTooHigh();
error NoBalance();
```

---

## 4. Events

```solidity
event CreatorRegistered(address indexed creator, string handle, string displayName);
event CreatorUpdated(address indexed creator, string displayName, string description, string avatarUrl, string category);
event TierCreated(address indexed creator, uint256 indexed tierId, string name, uint256 price, uint256 duration);
event TierUpdated(address indexed creator, uint256 indexed tierId, string name, uint256 price, bool active);
event Subscribed(address indexed subscriber, address indexed creator, uint256 indexed tierId, uint256 paidUntil, uint256 amount);
event Renewed(address indexed subscriber, address indexed creator, uint256 indexed tierId, uint256 paidUntil, uint256 amount);
event Upgraded(address indexed subscriber, address indexed creator, uint256 fromTierId, uint256 toTierId, uint256 paidUntil, uint256 amount);
event Cancelled(address indexed subscriber, address indexed creator, uint256 indexed tierId, uint256 paidUntil);
event Tipped(address indexed tipper, address indexed creator, uint256 amount, string message);
event EarningsWithdrawn(address indexed creator, uint256 amount);
event PlatformFeesWithdrawn(address indexed recipient, uint256 amount);
event PlatformFeeUpdated(uint256 oldFeeBasisPoints, uint256 newFeeBasisPoints);
```

---

## 5. State Variables

| Variable | Type | Visibility | Description |
| :--- | :--- | :--- | :--- |
| `platformFeeBasisPoints` | `uint256` | public | Current protocol fee in basis points (default: 250 = 2.5%) |
| `MAX_FEE_BASIS_POINTS` | `uint256` | public constant | Invariant upper bound for protocol fee (1000 = 10%) |
| `accumulatedPlatformFees` | `uint256` | public | Total native BOT protocol fees available for withdrawal |
| `creators` | `mapping(address => Creator)` | public | Address to creator profile |
| `handleToCreator` | `mapping(bytes32 => address)` | public | Lowercase handle keccak hash to creator address |
| `creatorTiers` | `mapping(address => mapping(uint256 => Tier))` | public | Nested mapping of creator address and tierId to Tier |
| `subscriptions` | `mapping(bytes32 => Subscription)` | public | Subscription key `keccak256(subscriber, creator)` to Subscription |
| `creatorBalances` | `mapping(address => uint256)` | public | Segregated withdrawable creator earnings |

---

## 6. External Functions

### 6.1 Creator Lifecycle

#### `registerCreator`
```solidity
function registerCreator(
    string calldata handle,
    string calldata displayName,
    string calldata description,
    string calldata avatarUrl,
    string calldata category
) external whenNotPaused;
```
Registers the caller as a new creator.
- **Preconditions**: Caller must not be registered; handle must be 3-32 characters, alphanumeric/underscores only; handle must not be taken.
- **Effects**: Stores `Creator` struct, maps lowercased handle hash to `msg.sender`, emits `CreatorRegistered`.

#### `updateCreatorMetadata`
```solidity
function updateCreatorMetadata(
    string calldata displayName,
    string calldata description,
    string calldata avatarUrl,
    string calldata category
) external whenNotPaused;
```
Updates profile metadata for an existing registered creator.

#### `createTier`
```solidity
function createTier(
    string calldata name,
    string calldata description,
    uint256 pricePerPeriod,
    uint256 periodDuration
) external whenNotPaused returns (uint256 tierId);
```
Creates a new membership tier under the caller's account.
- **Preconditions**: Caller must be a registered creator; `pricePerPeriod > 0`; `periodDuration >= 1 days`.
- **Returns**: New 1-indexed `tierId`.

#### `updateTier`
```solidity
function updateTier(
    uint256 tierId,
    string calldata name,
    string calldata description,
    uint256 pricePerPeriod,
    bool active
) external whenNotPaused;
```
Updates tier parameters. Modifying price applies only to future subscriptions or renewals; existing subscribers retain their current `paidUntil`.

---

### 6.2 Supporter Lifecycle

#### `subscribe`
```solidity
function subscribe(address creator, uint256 tierId) external payable nonReentrant whenNotPaused;
```
Initiates a new subscription to a creator's tier.
- **Preconditions**:
  - `creator` must be registered.
  - `tierId` must exist and be active.
  - Caller must not currently have an active subscription to this creator.
  - `msg.value == tier.pricePerPeriod`.
- **Effects**:
  - Sets `sub.tierId = tierId`.
  - Sets `sub.paidUntil = block.timestamp + tier.periodDuration`.
  - Sets `sub.cancelled = false`.
  - Deducts platform fee and credits creator balance.
  - Emits `Subscribed`.

#### `renewSubscription`
```solidity
function renewSubscription(address creator) external payable nonReentrant whenNotPaused;
```
Extends an existing subscription by one billing period.
- **Preconditions**:
  - Subscription must exist (`sub.tierId != 0`).
  - Tier must be active.
  - `msg.value == tier.pricePerPeriod`.
- **Timestamp Computation**:
  - If `block.timestamp <= sub.paidUntil`: `newPaidUntil = sub.paidUntil + tier.periodDuration`.
  - If `block.timestamp > sub.paidUntil`: `newPaidUntil = block.timestamp + tier.periodDuration`.
- **Effects**:
  - Reactivates cancelled subscription (`sub.cancelled = false`).
  - Updates `paidUntil` and `totalPaid`.
  - Deducts platform fee and credits creator.
  - Emits `Renewed`.

#### `upgradeSubscription`
```solidity
function upgradeSubscription(address creator, uint256 newTierId) external payable nonReentrant whenNotPaused;
```
Immediately upgrades the caller to a new tier.
- **Preconditions**:
  - Existing subscription must be active (`block.timestamp <= sub.paidUntil`).
  - `newTierId != sub.tierId`.
  - `newTier.pricePerPeriod >= currentTier.pricePerPeriod`.
  - `msg.value == newTier.pricePerPeriod`.
- **Effects**:
  - Resets `sub.paidUntil = block.timestamp + newTier.periodDuration`.
  - Sets `sub.tierId = newTierId`.
  - Resets `sub.cancelled = false`.
  - Emits `Upgraded`.

#### `cancelSubscription`
```solidity
function cancelSubscription(address creator) external whenNotPaused;
```
Cancels an active subscription.
- **Preconditions**: Subscription must be active.
- **Effects**: Sets `sub.cancelled = true`. Does **not** refund or truncate `paidUntil`; access remains valid until `paidUntil`.
- **Emits**: `Cancelled`.

#### `tipCreator`
```solidity
function tipCreator(address creator, string calldata message) external payable nonReentrant whenNotPaused;
```
Sends a direct tip to a creator.
- **Preconditions**: `creator` must be registered; `msg.value > 0`.
- **Effects**: Splits fee, credits creator balance, emits `Tipped`.

---

### 6.3 Accounting & Withdrawals

#### `withdrawEarnings`
```solidity
function withdrawEarnings() external nonReentrant;
```
Transfers all accumulated creator earnings to `msg.sender`.
- **Preconditions**: `creatorBalances[msg.sender] > 0`.
- **Pattern**: Follows Checks-Effects-Interactions: balance is zeroed before `call{value: amount}("")`.
- **Emits**: `EarningsWithdrawn`.

#### `withdrawPlatformFees`
```solidity
function withdrawPlatformFees(address payable recipient) external onlyOwner nonReentrant;
```
Transfers protocol fee revenue to the protocol treasury address.
- **Preconditions**: Caller is contract owner; `recipient != address(0)`; `accumulatedPlatformFees > 0`.

---

### 6.4 Verification & View Functions

#### `verifyMembership`
```solidity
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
```
Authoritative on-chain check for third-party dApps.
- `isValid` returns `true` if and only if `block.timestamp <= paidUntil` AND `currentTierId >= requiredTierId`.

#### `isSubscriptionActive`
```solidity
function isSubscriptionActive(address subscriber, address creator) external view returns (bool);
```
Convenience helper returning `block.timestamp <= paidUntil && sub.tierId != 0`.
