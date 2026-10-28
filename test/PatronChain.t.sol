// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface Vm {
    function warp(uint256) external;
    function deal(address, uint256) external;
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function expectRevert(bytes calldata) external;
}

// Simple test base contract compatible with Foundry and standalone EVM runners
abstract contract TestBase {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertEq(uint256 a, uint256 b, string memory message) internal pure {
        require(a == b, message);
    }

    function assertEq(address a, address b, string memory message) internal pure {
        require(a == b, message);
    }

    function assertEq(bool a, bool b, string memory message) internal pure {
        require(a == b, message);
    }

    function assertTrue(bool condition, string memory message) internal pure {
        require(condition, message);
    }

    function assertFalse(bool condition, string memory message) internal pure {
        require(!condition, message);
    }
}

import "../contracts/PatronChain.sol";

contract PatronChainTest is TestBase {
    PatronChain public patronChain;

    address public owner = address(0x1);
    address payable public treasury = payable(address(0x2));
    address public creator = address(0x10);
    address public supporter = address(0x20);

    uint256 public constant INITIAL_FEE_BPS = 250; // 2.5%
    uint256 public constant TIER_PRICE = 10 ether; // 10 BOT

    function setUp() public {
        vm.prank(owner);
        patronChain = new PatronChain(owner, treasury, INITIAL_FEE_BPS);

        vm.deal(creator, 100 ether);
        vm.deal(supporter, 100 ether);
    }

    function test_CreatorRegistration() public {
        vm.prank(creator);
        patronChain.registerCreator("ipfs://creator-metadata");

        assertTrue(patronChain.isCreatorRegistered(creator), "Creator should be registered");

        PatronChain.CreatorProfile memory profile = patronChain.getCreator(creator);
        assertTrue(profile.isRegistered, "Profile registration flag must be true");
        assertEq(profile.metadataURI, "ipfs://creator-metadata", "Metadata URI mismatch");
    }

    function test_TierCreation() public {
        vm.startPrank(creator);
        patronChain.registerCreator("ipfs://creator-metadata");
        uint256 tierId = patronChain.createTier(
            "Founding Member",
            "ipfs://tier-metadata",
            TIER_PRICE,
            30 days,
            100
        );
        vm.stopPrank();

        assertEq(tierId, 1, "First tier ID should be 1");
        PatronChain.Tier memory tier = patronChain.getTier(creator, tierId);
        assertEq(tier.name, "Founding Member", "Tier name mismatch");
        assertEq(tier.price, TIER_PRICE, "Tier price mismatch");
        assertEq(tier.billingPeriod, 30 days, "Tier billing period mismatch");
        assertTrue(tier.active, "Tier should be active");
    }

    function test_SubscriptionLifecycle() public {
        vm.startPrank(creator);
        patronChain.registerCreator("ipfs://creator-metadata");
        uint256 tierId = patronChain.createTier(
            "Studio Access",
            "ipfs://tier-meta",
            TIER_PRICE,
            30 days,
            0
        );
        vm.stopPrank();

        // Supporter subscribes
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_PRICE}(creator, tierId);

        assertTrue(patronChain.isSubscriptionActive(creator, supporter), "Subscription should be active");

        (
            bool exists,
            bool isActive,
            uint256 currentTier,
            uint256 startedAt,
            uint256 paidUntil,
            bool cancelled,
            uint256 totalPaid
        ) = patronChain.verifyMembership(creator, supporter);

        assertTrue(exists, "Membership record should exist");
        assertTrue(isActive, "Membership should be active");
        assertEq(currentTier, tierId, "Tier ID mismatch");
        assertTrue(startedAt > 0, "StartedAt should be set");
        assertTrue(paidUntil > startedAt, "PaidUntil should be in the future");
        assertFalse(cancelled, "Cancelled should be false");
        assertEq(totalPaid, TIER_PRICE, "Total paid mismatch");

        // Verify accounting
        uint256 expectedFee = (TIER_PRICE * INITIAL_FEE_BPS) / 10000;
        uint256 expectedNet = TIER_PRICE - expectedFee;

        assertEq(patronChain.platformFeesAccumulated(), expectedFee, "Platform fee mismatch");
        assertEq(patronChain.creatorEarnings(creator), expectedNet, "Creator earnings mismatch");
    }

    function test_Tipping() public {
        vm.prank(creator);
        patronChain.registerCreator("ipfs://creator-metadata");

        uint256 tipAmount = 5 ether;
        vm.prank(supporter);
        patronChain.tipCreator{value: tipAmount}(creator);

        uint256 expectedFee = (tipAmount * INITIAL_FEE_BPS) / 10000;
        uint256 expectedNet = tipAmount - expectedFee;

        assertEq(patronChain.creatorEarnings(creator), expectedNet, "Tip creator net earnings mismatch");
    }

    function test_Withdrawal() public {
        vm.startPrank(creator);
        patronChain.registerCreator("ipfs://creator-metadata");
        patronChain.createTier("Pro", "ipfs://meta", TIER_PRICE, 30 days, 0);
        vm.stopPrank();

        vm.prank(supporter);
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);

        uint256 initialCreatorBal = creator.balance;
        uint256 pending = patronChain.creatorEarnings(creator);
        assertTrue(pending > 0, "Creator should have pending earnings");

        vm.prank(creator);
        patronChain.withdrawEarnings();

        assertEq(patronChain.creatorEarnings(creator), 0, "Creator earnings should be zero after withdrawal");
        assertEq(creator.balance, initialCreatorBal + pending, "Creator balance should increase by withdrawn amount");
    }
}
