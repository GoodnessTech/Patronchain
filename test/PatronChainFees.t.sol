// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./PatronChain.t.sol";

contract PatronChainFeesTest is TestBase {
    PatronChain public patronChain;

    address public owner = address(0x1);
    address payable public treasury = payable(address(0x2));
    address public creator = address(0x10);
    address public supporter1 = address(0x20);
    address public supporter2 = address(0x21);

    uint256 public constant INITIAL_FEE_BPS = 500; // 5.0%
    uint256 public constant TIER_PRICE = 20 ether;

    function setUp() public {
        vm.prank(owner);
        patronChain = new PatronChain(owner, treasury, INITIAL_FEE_BPS);

        vm.deal(creator, 50 ether);
        vm.deal(supporter1, 100 ether);
        vm.deal(supporter2, 100 ether);

        vm.startPrank(creator);
        patronChain.registerCreator("ipfs://creator");
        patronChain.createTier("Tier 1", "ipfs://meta", TIER_PRICE, 30 days, 0);
        vm.stopPrank();
    }

    function test_ExactAccountingInvariant() public {
        // Supporter 1 subscribes (20 BOT)
        vm.prank(supporter1);
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);

        uint256 fee1 = (TIER_PRICE * INITIAL_FEE_BPS) / 10000;
        uint256 net1 = TIER_PRICE - fee1;

        assertEq(patronChain.platformFeesAccumulated(), fee1, "Platform fee 1 mismatch");
        assertEq(patronChain.creatorEarnings(creator), net1, "Creator earnings 1 mismatch");

        // Supporter 2 tips 7.5 BOT
        uint256 tipAmount = 7.5 ether;
        vm.prank(supporter2);
        patronChain.tipCreator{value: tipAmount}(creator);

        uint256 fee2 = (tipAmount * INITIAL_FEE_BPS) / 10000;
        uint256 net2 = tipAmount - fee2;

        uint256 totalGross = TIER_PRICE + tipAmount;
        uint256 totalExpectedFees = fee1 + fee2;
        uint256 totalExpectedEarnings = net1 + net2;

        assertEq(patronChain.platformFeesAccumulated(), totalExpectedFees, "Total fees mismatch");
        assertEq(patronChain.creatorEarnings(creator), totalExpectedEarnings, "Total earnings mismatch");

        // Invariant check: contract balance == platformFeesAccumulated + creatorEarnings
        assertEq(
            address(patronChain).balance,
            patronChain.platformFeesAccumulated() + patronChain.creatorEarnings(creator),
            "Invariant violated: balance != fees + earnings"
        );
        assertEq(address(patronChain).balance, totalGross, "Contract balance should equal total gross payments");
    }

    function test_TreasuryFeeWithdrawal() public {
        vm.prank(supporter1);
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);

        uint256 initialTreasuryBal = treasury.balance;
        uint256 feesToWithdraw = patronChain.platformFeesAccumulated();

        vm.prank(owner);
        patronChain.withdrawPlatformFees(treasury);

        assertEq(patronChain.platformFeesAccumulated(), 0, "Platform fees should reset to 0 after withdrawal");
        assertEq(patronChain.totalPlatformFeesWithdrawn(), feesToWithdraw, "Total withdrawn fee counter mismatch");
        assertEq(treasury.balance, initialTreasuryBal + feesToWithdraw, "Treasury balance increase mismatch");
    }

    function test_FeeUpdateAppliesToFuturePayments() public {
        // Update fee to 10% (1000 bps)
        vm.prank(owner);
        patronChain.setPlatformFee(1000);
        assertEq(patronChain.platformFeeBps(), 1000, "New fee should be 1000 bps");

        vm.prank(supporter1);
        patronChain.subscribe{value: TIER_PRICE}(creator, 1);

        uint256 expected10PctFee = (TIER_PRICE * 1000) / 10000; // 2 ether
        uint256 expectedNet = TIER_PRICE - expected10PctFee; // 18 ether

        assertEq(patronChain.platformFeesAccumulated(), expected10PctFee, "10% fee mismatch");
        assertEq(patronChain.creatorEarnings(creator), expectedNet, "Net earnings at 10% mismatch");
    }
}
