// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./PatronChain.t.sol";

contract PatronChainSecurityTest is TestBase {
    PatronChain public patronChain;

    address public owner = address(0x1);
    address payable public treasury = payable(address(0x2));
    address public creator = address(0x10);
    address public attacker = address(0x666);
    address public supporter = address(0x20);

    uint256 public constant INITIAL_FEE_BPS = 250;
    uint256 public constant TIER_PRICE = 5 ether;

    function setUp() public {
        vm.prank(owner);
        patronChain = new PatronChain(owner, treasury, INITIAL_FEE_BPS);

        vm.deal(creator, 50 ether);
        vm.deal(supporter, 50 ether);
        vm.deal(attacker, 50 ether);

        vm.startPrank(creator);
        patronChain.registerCreator("ipfs://creator");
        patronChain.createTier("Basic", "ipfs://basic", TIER_PRICE, 30 days, 1); // limit = 1
        vm.stopPrank();
    }

    function test_RevertWhen_SubscribeWithInsufficientAmount() public {
        vm.prank(supporter);
        vm.expectRevert(bytes("Incorrect payment amount"));
        patronChain.subscribe{value: 4 ether}(creator, 1);
    }

    function test_RevertWhen_SubscribeWithExcessAmount() public {
        vm.prank(supporter);
        vm.expectRevert(bytes("Incorrect payment amount"));
        patronChain.subscribe{value: 6 ether}(creator, 1);
    }

    function test_RevertWhen_UnregisteredCreatorCreatesTier() public {
        vm.prank(attacker);
        vm.expectRevert(bytes("Creator not registered"));
        patronChain.createTier("Hacked", "ipfs://hacked", 1 ether, 30 days, 0);
    }

    function test_RevertWhen_NonOwnerEditsTier() public {
        vm.prank(attacker);
        vm.expectRevert(bytes("Creator not registered"));
        patronChain.updateTier(1, "Hacked", "ipfs://hacked", 1 ether, 30 days, 0);
    }

    function test_RevertWhen_SubscribeToInactiveTier() public {
        vm.prank(creator);
        patronChain.setTierActive(1, false);

        vm.prank(supporter);
        vm.expectRevert(bytes("Tier not active"));
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);
    }

    function test_RevertWhen_DuplicateActiveSubscription() public {
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);

        // Try to subscribe again while active
        vm.prank(supporter);
        vm.expectRevert(bytes("Active subscription exists"));
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);
    }

    function test_RevertWhen_SubscriberLimitExceeded() public {
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);

        // Second supporter tries to subscribe to tier with limit = 1
        vm.prank(attacker);
        vm.expectRevert(bytes("Tier capacity reached"));
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);
    }

    function test_RevertWhen_AttackerTriesToWithdrawEarnings() public {
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);

        // Attacker has 0 earnings
        vm.prank(attacker);
        vm.expectRevert(bytes("No earnings to withdraw"));
        patronChain.withdrawEarnings();
    }

    function test_RevertWhen_NonOwnerWithdrawsPlatformFees() public {
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);

        vm.prank(attacker);
        vm.expectRevert(bytes("Unauthorized"));
        patronChain.withdrawPlatformFees(payable(attacker));
    }

    function test_RevertWhen_FeeExceedsMax() public {
        vm.prank(owner);
        vm.expectRevert(bytes("Fee exceeds maximum"));
        patronChain.setPlatformFee(1001); // max is 1000 (10%)
    }

    function test_RevertWhen_ContractPaused() public {
        vm.prank(owner);
        patronChain.pause();

        vm.prank(supporter);
        vm.expectRevert();
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);
    }

    function test_CancellationPreservesAccessUntilExpiry() public {
        vm.prank(supporter);
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);

        vm.prank(supporter);
        patronChain.cancelSubscription(creator);

        // Access must STILL be active because paidUntil is in the future!
        assertTrue(patronChain.isSubscriptionActive(creator, supporter), "Access must be preserved after cancellation until expiry");

        (, , , , , bool cancelled, ) = patronChain.verifyMembership(creator, supporter);
        assertTrue(cancelled, "Cancelled flag must be true");
    }
}
