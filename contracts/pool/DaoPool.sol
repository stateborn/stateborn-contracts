// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IDaoPool.sol";

abstract contract DaoPool is IDaoPool, Ownable {

    mapping(address => address[]) public proposalForVoters;
    mapping(address => address[]) public proposalAgainstVoters;
    mapping(address => uint256) public voterActiveProposals;
    mapping(address => bool) public approvedProposals;

    // only DAO can call this
    function approveProposal(address proposalAddress) public onlyOwner {
        approvedProposals[proposalAddress] = true;
    }

    // is invoked by proposal
    // msg.sender == proposal address
    function vote(address voterAddress, bool voteSide) override external {
        require(approvedProposals[msg.sender], "Proposal not approved");
        if (voteSide) {
            proposalForVoters[msg.sender].push(voterAddress);
        } else {
            proposalAgainstVoters[msg.sender].push(voterAddress);
        }
        voterActiveProposals[voterAddress] += 1;
    }
}