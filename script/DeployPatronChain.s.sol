// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../contracts/PatronChain.sol";

interface VmScript {
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract DeployPatronChain {
    VmScript internal constant vm = VmScript(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 public constant BOTCHAIN_TESTNET_CHAIN_ID = 968;
    uint256 public constant BOTCHAIN_MAINNET_CHAIN_ID = 677;

    uint256 public constant INITIAL_FEE_BPS = 250; // 2.5%

    function run() external returns (address deployedAddress) {
        uint256 chainId = block.chainid;
        require(
            chainId == BOTCHAIN_TESTNET_CHAIN_ID || chainId == BOTCHAIN_MAINNET_CHAIN_ID,
            "Unsupported chain ID. Must be 968 (testnet) or 677 (mainnet)"
        );

        address payable treasuryAddress = payable(msg.sender);

        vm.startBroadcast();

        PatronChain patronChain = new PatronChain(
            msg.sender, // initial owner
            treasuryAddress,
            INITIAL_FEE_BPS
        );

        vm.stopBroadcast();

        deployedAddress = address(patronChain);
    }
}
