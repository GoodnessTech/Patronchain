// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PatronChain
 * @notice On-chain recurring membership infrastructure on BOT Chain.
 * @dev Manages creator profiles, membership tiers, recurring subscription lifecycles,
 *      one-time tips, fee accounting, and creator withdrawals.
 */
contract PatronChain is ReentrancyGuard, Ownable2Step, Pausable {

    // --- Constants ---
    uint256 public constant MAX_FEE_BPS = 1000; // 10% maximum platform fee
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant DURATION_MONTHLY = 30 days;
    uint256 public constant DURATION_YEARLY = 365 days;

    // --- Structs ---
    struct CreatorProfile {
        bool isRegistered;
        string metadataURI;
        uint256 registeredAt;
        uint256 totalTiers;
    }

    struct Tier {
        uint256 id;
        address creator;
        string name;
        string descriptionURI;
        uint256 price; // in wei (native BOT)
        uint256 billingPeriod; // duration in seconds (e.g. 30 days, 365 days)
        bool active;
        uint256 subscriberLimit; // 0 for unlimited
        uint256 totalSubscribers; // count of currently active members
    }

    struct Subscription {
        uint256 tierId;
        uint256 startedAt;
        uint256 paidUntil;
        bool cancelled;
        uint256 lastPaymentAt;
        uint256 totalPaid;
    }

    // --- State Variables ---
    uint256 public platformFeeBps; // Fee in basis points (e.g. 250 = 2.5%)
    address payable public treasury;
    uint256 public platformFeesAccumulated;
    uint256 public totalPlatformFeesWithdrawn;

    // Creator registry: creatorAddress => CreatorProfile
    mapping(address => CreatorProfile) public creators;

    // Creator tiers: creatorAddress => tierId => Tier
    mapping(address => mapping(uint256 => Tier)) private _creatorTiers;

    // Subscriptions: creatorAddress => supporterAddress => Subscription
    mapping(address => mapping(address => Subscription)) public subscriptions;

    // Accounting: creatorAddress => pending earnings in wei
    mapping(address => uint256) public creatorEarnings;
    mapping(address => uint256) public totalCreatorWithdrawn;
    mapping(address => uint256) public totalCreatorGrossVolume;
    mapping(address => uint256) public totalCreatorTips;

    // --- Events ---
    event CreatorRegistered(address indexed creator, string metadataURI, uint256 timestamp);
    event CreatorMetadataUpdated(address indexed creator, string metadataURI, uint256 timestamp);
    
    event TierCreated(
        address indexed creator,
        uint256 indexed tierId,
        string name,
        string descriptionURI,
        uint256 price,
        uint256 billingPeriod,
        uint256 subscriberLimit
    );
    event TierUpdated(
        address indexed creator,
        uint256 indexed tierId,
        string name,
        string descriptionURI,
        uint256 price,
        uint256 billingPeriod,
        uint256 subscriberLimit
    );
    event TierStatusChanged(address indexed creator, uint256 indexed tierId, bool active);

    event Subscribed(
        address indexed creator,
        address indexed supporter,
        uint256 indexed tierId,
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount,
        uint256 paidUntil
    );
    event SubscriptionRenewed(
        address indexed creator,
        address indexed supporter,
        uint256 indexed tierId,
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount,
        uint256 newPaidUntil
    );
    event SubscriptionUpgraded(
        address indexed creator,
        address indexed supporter,
        uint256 oldTierId,
        uint256 indexed newTierId,
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount,
        uint256 newPaidUntil
    );
    event SubscriptionCancelled(
        address indexed creator,
        address indexed supporter,
        uint256 indexed tierId,
        uint256 paidUntil
    );

    event CreatorTipped(
        address indexed creator,
        address indexed supporter,
        uint256 grossAmount,
        uint256 fee,
        uint256 netAmount
    );

    event CreatorEarningsWithdrawn(address indexed creator, uint256 amount);
    event PlatformFeesWithdrawn(address indexed recipient, uint256 amount);
    event PlatformFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // --- Modifiers ---
    modifier onlyRegisteredCreator() {
        require(creators[msg.sender].isRegistered, "Creator not registered");
        _;
    }

    /**
     * @notice Contract constructor.
     * @param initialOwner Initial owner address.
     * @param initialTreasury Initial platform treasury address.
     * @param initialFeeBps Initial platform fee in basis points (max 1000).
     */
    constructor(
        address initialOwner,
        address payable initialTreasury,
        uint256 initialFeeBps
    ) Ownable(initialOwner) {
        require(initialTreasury != address(0), "Invalid treasury");
        require(initialFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum");
        treasury = initialTreasury;
        platformFeeBps = initialFeeBps;
    }

    // ==========================================
    // CREATOR REGISTRATION
    // ==========================================

    /**
     * @notice Register connected wallet as a creator.
     * @param metadataURI Off-chain metadata URI (e.g. IPFS or HTTPS JSON).
     */
    function registerCreator(string calldata metadataURI) external whenNotPaused {
        require(!creators[msg.sender].isRegistered, "Creator already registered");

        creators[msg.sender] = CreatorProfile({
            isRegistered: true,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            totalTiers: 0
        });

        emit CreatorRegistered(msg.sender, metadataURI, block.timestamp);
    }

    /**
     * @notice Update creator metadata URI.
     * @param metadataURI New metadata URI.
     */
    function updateCreatorMetadata(string calldata metadataURI) external onlyRegisteredCreator {
        creators[msg.sender].metadataURI = metadataURI;
        emit CreatorMetadataUpdated(msg.sender, metadataURI, block.timestamp);
    }

    /**
     * @notice Check if an address is a registered creator.
     */
    function isCreatorRegistered(address creator) external view returns (bool) {
        return creators[creator].isRegistered;
    }

    /**
     * @notice Get creator profile details.
     */
    function getCreator(address creator) external view returns (CreatorProfile memory) {
        return creators[creator];
    }

    // ==========================================
    // MEMBERSHIP TIERS
    // ==========================================

    /**
     * @notice Create a new membership tier.
     * @param name Name of tier.
     * @param descriptionURI Description or metadata URI.
     * @param price Price in native BOT wei.
     * @param billingPeriod Billing period in seconds (e.g. 30 days or 365 days).
     * @param subscriberLimit Optional maximum active subscribers (0 = unlimited).
     */
    function createTier(
        string calldata name,
        string calldata descriptionURI,
        uint256 price,
        uint256 billingPeriod,
        uint256 subscriberLimit
    ) external onlyRegisteredCreator whenNotPaused returns (uint256 tierId) {
        require(bytes(name).length > 0, "Empty tier name");
        require(price > 0, "Price must be > 0");
        require(
            billingPeriod == DURATION_MONTHLY || billingPeriod == DURATION_YEARLY || billingPeriod >= 1 days,
            "Invalid billing period"
        );

        uint256 newTierId = creators[msg.sender].totalTiers + 1;
        creators[msg.sender].totalTiers = newTierId;

        _creatorTiers[msg.sender][newTierId] = Tier({
            id: newTierId,
            creator: msg.sender,
            name: name,
            descriptionURI: descriptionURI,
            price: price,
            billingPeriod: billingPeriod,
            active: true,
            subscriberLimit: subscriberLimit,
            totalSubscribers: 0
        });

        emit TierCreated(
            msg.sender,
            newTierId,
            name,
            descriptionURI,
            price,
            billingPeriod,
            subscriberLimit
        );

        return newTierId;
    }

    /**
     * @notice Update an existing tier's details.
     */
    function updateTier(
        uint256 tierId,
        string calldata name,
        string calldata descriptionURI,
        uint256 price,
        uint256 billingPeriod,
        uint256 subscriberLimit
    ) external onlyRegisteredCreator {
        Tier storage tier = _creatorTiers[msg.sender][tierId];
        require(tier.id != 0, "Tier does not exist");
        require(bytes(name).length > 0, "Empty tier name");
        require(price > 0, "Price must be > 0");
        require(
            billingPeriod == DURATION_MONTHLY || billingPeriod == DURATION_YEARLY || billingPeriod >= 1 days,
            "Invalid billing period"
        );
        if (subscriberLimit > 0) {
            require(subscriberLimit >= tier.totalSubscribers, "Limit below current subscribers");
        }

        tier.name = name;
        tier.descriptionURI = descriptionURI;
        tier.price = price;
        tier.billingPeriod = billingPeriod;
        tier.subscriberLimit = subscriberLimit;

        emit TierUpdated(
            msg.sender,
            tierId,
            name,
            descriptionURI,
            price,
            billingPeriod,
            subscriberLimit
        );
    }

    /**
     * @notice Toggle tier active state.
     */
    function setTierActive(uint256 tierId, bool active) external onlyRegisteredCreator {
        Tier storage tier = _creatorTiers[msg.sender][tierId];
        require(tier.id != 0, "Tier does not exist");
        tier.active = active;
        emit TierStatusChanged(msg.sender, tierId, active);
    }

    /**
     * @notice Get a specific tier for a creator.
     */
    function getTier(address creator, uint256 tierId) external view returns (Tier memory) {
        Tier memory tier = _creatorTiers[creator][tierId];
        require(tier.id != 0, "Tier does not exist");
        return tier;
    }

    /**
     * @notice Get all tiers for a creator.
     */
    function getCreatorTiers(address creator) external view returns (Tier[] memory) {
        uint256 count = creators[creator].totalTiers;
        Tier[] memory list = new Tier[](count);
        for (uint256 i = 1; i <= count; i++) {
            list[i - 1] = _creatorTiers[creator][i];
        }
        return list;
    }

    // ==========================================
    // SUBSCRIPTION SYSTEM
    // ==========================================

    /**
     * @notice Subscribe to a creator's tier using native BOT.
     * @param creator Creator address.
     * @param tierId Tier ID.
     */
    function subscribe(address creator, uint256 tierId) external payable nonReentrant whenNotPaused {
        require(creators[creator].isRegistered, "Creator not registered");
        Tier storage tier = _creatorTiers[creator][tierId];
        require(tier.id != 0 && tier.active, "Tier not active");
        require(msg.value == tier.price, "Incorrect payment amount");

        Subscription storage sub = subscriptions[creator][msg.sender];
        require(
            sub.startedAt == 0 || block.timestamp > sub.paidUntil,
            "Active subscription exists"
        );

        if (tier.subscriberLimit > 0) {
            require(tier.totalSubscribers < tier.subscriberLimit, "Tier capacity reached");
        }

        tier.totalSubscribers += 1;

        uint256 paidUntil = block.timestamp + tier.billingPeriod;
        sub.tierId = tierId;
        sub.startedAt = block.timestamp;
        sub.paidUntil = paidUntil;
        sub.cancelled = false;
        sub.lastPaymentAt = block.timestamp;
        sub.totalPaid += msg.value;

        (uint256 fee, uint256 netAmount) = _distributePayment(creator, msg.value);

        emit Subscribed(creator, msg.sender, tierId, msg.value, fee, netAmount, paidUntil);
    }

    /**
     * @notice Renew an existing subscription for a creator.
     * @param creator Creator address.
     */
    function renewSubscription(address creator) external payable nonReentrant whenNotPaused {
        require(creators[creator].isRegistered, "Creator not registered");
        Subscription storage sub = subscriptions[creator][msg.sender];
        require(sub.startedAt > 0, "No existing subscription");

        Tier storage tier = _creatorTiers[creator][sub.tierId];
        require(tier.id != 0 && tier.active, "Tier not active for renewal");
        require(msg.value == tier.price, "Incorrect payment amount");

        // Renewal expiry calculation:
        // If paidUntil is in the future, extend from existing paidUntil.
        // If already expired, start from current block timestamp.
        uint256 newPaidUntil;
        if (sub.paidUntil > block.timestamp) {
            newPaidUntil = sub.paidUntil + tier.billingPeriod;
        } else {
            newPaidUntil = block.timestamp + tier.billingPeriod;
            // If it had previously expired, it rejoins active subscribers
            tier.totalSubscribers += 1;
        }

        sub.paidUntil = newPaidUntil;
        sub.cancelled = false; // reactivates a previously cancelled membership
        sub.lastPaymentAt = block.timestamp;
        sub.totalPaid += msg.value;

        (uint256 fee, uint256 netAmount) = _distributePayment(creator, msg.value);

        emit SubscriptionRenewed(creator, msg.sender, sub.tierId, msg.value, fee, netAmount, newPaidUntil);
    }

    /**
     * @notice Upgrade subscription to a new tier immediately.
     * @dev Starts a new billing period immediately from upgrade timestamp.
     *      No automatic refund or prorated credit for remaining time on previous tier in v1.
     * @param creator Creator address.
     * @param newTierId Target tier ID.
     */
    function upgradeSubscription(address creator, uint256 newTierId) external payable nonReentrant whenNotPaused {
        require(creators[creator].isRegistered, "Creator not registered");
        Subscription storage sub = subscriptions[creator][msg.sender];
        require(sub.startedAt > 0, "No existing subscription");
        require(sub.tierId != newTierId, "Already on this tier");

        Tier storage oldTier = _creatorTiers[creator][sub.tierId];
        Tier storage newTier = _creatorTiers[creator][newTierId];
        require(newTier.id != 0 && newTier.active, "Target tier not active");
        require(msg.value == newTier.price, "Incorrect payment amount");

        if (newTier.subscriberLimit > 0) {
            require(newTier.totalSubscribers < newTier.subscriberLimit, "Target tier capacity reached");
        }

        // Adjust subscriber counts
        if (oldTier.totalSubscribers > 0) {
            oldTier.totalSubscribers -= 1;
        }
        newTier.totalSubscribers += 1;

        uint256 oldTierId = sub.tierId;
        uint256 newPaidUntil = block.timestamp + newTier.billingPeriod;

        sub.tierId = newTierId;
        sub.paidUntil = newPaidUntil;
        sub.cancelled = false;
        sub.lastPaymentAt = block.timestamp;
        sub.totalPaid += msg.value;

        (uint256 fee, uint256 netAmount) = _distributePayment(creator, msg.value);

        emit SubscriptionUpgraded(
            creator,
            msg.sender,
            oldTierId,
            newTierId,
            msg.value,
            fee,
            netAmount,
            newPaidUntil
        );
    }

    /**
     * @notice Cancel subscription renewal intent.
     * @dev Access remains fully valid until paidUntil timestamp.
     * @param creator Creator address.
     */
    function cancelSubscription(address creator) external nonReentrant {
        Subscription storage sub = subscriptions[creator][msg.sender];
        require(sub.startedAt > 0, "No subscription found");
        require(!sub.cancelled, "Already cancelled");

        sub.cancelled = true;

        emit SubscriptionCancelled(creator, msg.sender, sub.tierId, sub.paidUntil);
    }

    /**
     * @notice Send a one-time tip to a creator.
     * @param creator Creator address.
     */
    function tipCreator(address creator) external payable nonReentrant whenNotPaused {
        require(creators[creator].isRegistered, "Creator not registered");
        require(msg.value > 0, "Tip must be > 0");

        (uint256 fee, uint256 netAmount) = _distributePayment(creator, msg.value);
        totalCreatorTips[creator] += netAmount;

        emit CreatorTipped(creator, msg.sender, msg.value, fee, netAmount);
    }

    // ==========================================
    // ACCOUNTING & WITHDRAWALS
    // ==========================================

    /**
     * @notice Withdraw accumulated earnings by a creator.
     */
    function withdrawEarnings() external nonReentrant {
        uint256 amount = creatorEarnings[msg.sender];
        require(amount > 0, "No earnings to withdraw");

        creatorEarnings[msg.sender] = 0;
        totalCreatorWithdrawn[msg.sender] += amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal transfer failed");

        emit CreatorEarningsWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Withdraw accumulated platform fees by treasury or owner.
     * @param recipient Target address to receive fees.
     */
    function withdrawPlatformFees(address payable recipient) external nonReentrant {
        require(msg.sender == owner() || msg.sender == treasury, "Unauthorized");
        require(recipient != address(0), "Invalid recipient");

        uint256 amount = platformFeesAccumulated;
        require(amount > 0, "No platform fees to withdraw");

        platformFeesAccumulated = 0;
        totalPlatformFeesWithdrawn += amount;

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Platform fee transfer failed");

        emit PlatformFeesWithdrawn(recipient, amount);
    }

    // ==========================================
    // MEMBERSHIP VERIFICATION (EXTERNAL INTERFACE)
    // ==========================================

    /**
     * @notice Authoritative check for whether a supporter holds active access with a creator.
     * @dev Access is active if subscription started and current timestamp is <= paidUntil.
     *      Cancellation alone does NOT revoke access prior to paidUntil.
     */
    function isSubscriptionActive(address creator, address supporter) public view returns (bool) {
        Subscription memory sub = subscriptions[creator][supporter];
        return (sub.startedAt > 0 && block.timestamp <= sub.paidUntil);
    }

    /**
     * @notice Comprehensive verification view for external applications.
     */
    function verifyMembership(address creator, address supporter) external view returns (
        bool exists,
        bool isActive,
        uint256 tierId,
        uint256 startedAt,
        uint256 paidUntil,
        bool cancelled,
        uint256 totalPaid
    ) {
        Subscription memory sub = subscriptions[creator][supporter];
        exists = (sub.startedAt > 0);
        isActive = (exists && block.timestamp <= sub.paidUntil);
        tierId = sub.tierId;
        startedAt = sub.startedAt;
        paidUntil = sub.paidUntil;
        cancelled = sub.cancelled;
        totalPaid = sub.totalPaid;
    }

    /**
     * @notice Get creator financial overview.
     */
    function getCreatorFinancials(address creator) external view returns (
        uint256 pendingEarnings,
        uint256 totalWithdrawn,
        uint256 totalGrossVolume,
        uint256 totalTipsReceived
    ) {
        pendingEarnings = creatorEarnings[creator];
        totalWithdrawn = totalCreatorWithdrawn[creator];
        totalGrossVolume = totalCreatorGrossVolume[creator];
        totalTipsReceived = totalCreatorTips[creator];
    }

    // ==========================================
    // OWNER & EMERGENCY CONTROLS
    // ==========================================

    /**
     * @notice Update platform fee basis points.
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= MAX_FEE_BPS, "Fee exceeds maximum");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Update treasury address.
     */
    function setTreasury(address payable newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Pause the contract in emergencies.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ==========================================
    // INTERNAL HELPERS
    // ==========================================

    function _distributePayment(address creator, uint256 grossAmount) internal returns (uint256 fee, uint256 netAmount) {
        fee = (grossAmount * platformFeeBps) / BPS_DENOMINATOR;
        netAmount = grossAmount - fee;

        platformFeesAccumulated += fee;
        creatorEarnings[creator] += netAmount;
        totalCreatorGrossVolume[creator] += grossAmount;
    }
}
