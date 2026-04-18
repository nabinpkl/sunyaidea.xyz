// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CommitRegistry} from "../src/CommitRegistry.sol";

/// @notice Deploy CommitRegistry to any EVM chain.
///
///         forge script script/CommitRegistry.s.sol:DeployCommitRegistry \
///             --rpc-url $SEPOLIA_RPC_URL \
///             --private-key $DEPLOYER_PRIVATE_KEY \
///             --broadcast --verify
contract DeployCommitRegistry is Script {
    function run() external returns (CommitRegistry registry) {
        vm.startBroadcast();
        registry = new CommitRegistry();
        vm.stopBroadcast();

        console.log("CommitRegistry deployed at:", address(registry));
        console.log("chainId:", block.chainid);
        console.log("domainSeparator:");
        console.logBytes32(registry.domainSeparator());
    }
}
