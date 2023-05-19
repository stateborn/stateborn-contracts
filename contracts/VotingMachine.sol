// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "./IPoll.sol";
import "./Poll.sol";

contract VotingMachine {

    mapping(bytes => IPoll) public polls;
    uint256 public disputePeriod = 3 days;
    uint256 public collateral = 9000 ether;

    event PollCreated(bytes pollId, address pollAddress);

    function setDisputePeriod(uint256 _disputePeriod) public {
        disputePeriod = _disputePeriod;
    }

    function setDisputeCollateral(uint256 _disputeCollateral) public {
        collateral = _disputeCollateral;
    }

    function createPoll(bytes memory _pollId, bytes32 _pollMerkleRoot) payable public {
        IPoll existingPool = polls[_pollId];
        require(address(existingPool) == address(0), "Poll already exists");
        require(msg.value == collateral, "Collateral required to create poll");
        IPoll pool = new Poll(_pollMerkleRoot, _pollId, payable(msg.sender), collateral, disputePeriod);
        polls[_pollId];
        payable(address(pool)).send(msg.value);
        emit PollCreated(_pollId, address(pool));
    }

}