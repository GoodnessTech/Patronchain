// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./PatronChain.t.sol";

contract PatronChainLifecycleTest is TestBase {
    PatronChain public patronChain;

    address public owner = address(0x1);
    address payable public treasury = payable(address(0x2));
    address public creator = address(0x10);
    address public supporter = address(0x20);

    uint256 public constant INITIAL_FEE_BPS = 250;
    uint256 public constant TIER_BASIC_PRICE = 5 ether;
    uint256 public constant TIER_PRO_PRICE = 15 ether;

    function setUp() public {
        vm.prank(owner);
        patronChain = new PatronChain(owner, treasury, INITIAL_FEE_BPS);

        vm.deal(creator, 50 ether);
        vm.deal(supporter, 100 ether);

        vm.startPrank(creator);
        patronChain.registerCreator("ipfs://creator");
        patronChain.createTier("Basic", "ipfs://basic", TIER_BASIC_PRICE, 30 days, 0); // tier 1
        patronChain.createTier("Pro", "ipfs://pro", TIER_PRO_PRICE, 30 days, 0); // tier 2
        vm.stopPrank();
    }

    function test_RenewalBeforeExpiry_ExtendsFromPaidUntil() public {
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_BASIC_PRICE}(creator, 1);

        (, , , , uint256 initialPaidUntil, , ) = patronChain.verifyMembership(creator, supporter);

        // Advance 10 days (20 days before expiry)
        vm.warp(block.timestamp + 10 days);

        // Supporter renews early
        vm.prank(supporter);
        patronChain.renewSubscription{value: TIER_BASIC_PRICE}(creator);

        (, , , , uint256 newPaidUntil, , ) = patronChain.verifyMembership(creator, supporter);

        // New expiry must be EXACTLY initialPaidUntil + 30 days
        assertEq(newPaidUntil, initialPaidUntil + 30 days, "Early renewal should extend from initial paidUntil");
    }

    function test_RenewalAfterExpiry_StartsFromCurrentBlockTimestamp() public {
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_BASIC_PRICE}(creator, 1);

        // Advance 35 days (5 days after expiry)
        vm.warp(block.timestamp + 35 days);

        assertFalse(patronChain.isSubscriptionActive(creator, supporter), "Subscription should be expired");

        uint256 renewalTimestamp = block.timestamp;
        vm.prank(supporter);
        patronChain.renewSubscription{value: TIER_BASIC_PRICE}(creator);

        assertTrue(patronChain.isSubscriptionActive(creator, supporter), "Subscription should be active again");

        (, , , , uint256 newPaidUntil, , ) = patronChain.verifyMembership(creator, supporter);
        assertEq(newPaidUntil, renewalTimestamp + 30 days, "Lapsed renewal should start from current block timestamp");
    }

    function test_ImmediateUpgrade_SwitchesTierAndStartsNewPeriod() public {
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_BASIC_PRICE}(creator, 1);

        // Advance 15 days
        vm.warp(block.timestamp + 15 days);

        uint256 upgradeTimestamp = block.timestamp;

        // Upgrade to Pro (tier 2)
        vm.prank(supporter);
        patronChain.upgradeSubscription{value: TIER_PRO_PRICE}(creator, 2);

        (
            bool exists,
            bool isActive,
            uint256 tierId,
            ,
            uint256 newPaidUntil,
            bool cancelled,
            uint256 totalPaid
        ) = patronChain.verifyMembership(creator, supporter);

        assertTrue(exists, "Membership exists");
        assertTrue(isActive, "Membership is active");
        assertEq(tierId, 2, "Must be upgraded to tier 2");
        assertFalse(cancelled, "Cancelled must be false");
        assertEq(newPaidUntil, upgradeTimestamp + 30 days, "Upgrade period starts from upgrade timestamp");
        assertEq(totalPaid, TIER_BASIC_PRICE + TIER_PRO_PRICE, "Total paid accumulates both payments");
    }

    function test_RenewalReactivatesCancelledSubscription() public {
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_BASIC_PRICE}(creator, 1);

        vm.prank(supporter);
        patronChain.cancelSubscription(creator);

        (, , , , , bool cancelled, ) = patronChain.verifyMembership(creator, supporter);
        assertTrue(cancelled, "Cancelled flag should be true");

        // Supporter changes mind and renews
        vm.prank(supporter);
        patronChain.renewSubscription{value: TIER_BASIC_PRICE}(creator);

        (, , , , , bool cancelledAfterRenewal, ) = patronChain.verifyMembership(creator, supporter);
        assertFalse(cancelledAfterRenewal, "Cancelled flag should be cleared after renewal");
    }
}
