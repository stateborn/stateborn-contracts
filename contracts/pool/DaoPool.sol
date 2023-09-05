// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './IDaoPool.sol';

abstract contract DaoPool is IDaoPool, Ownable {
    mapping(address => address[]) internal proposalForVoters;
    mapping(address => address[]) internal proposalAgainstVoters;
    mapping(address => uint256) public voterActiveProposals;
    mapping(address => bool) public approvedProposals;

    // only DAO can call this
    function approveProposal(address proposalAddress) public onlyOwner {
        approvedProposals[proposalAddress] = true;
    }

    // is invoked by proposal
    // msg.sender == proposal address
    function vote(address voterAddress, bool voteSide) external override {
        require(approvedProposals[msg.sender], 'Proposal not approved');
        address[] storage voters = voteSide ? proposalForVoters[msg.sender] : proposalAgainstVoters[msg.sender];
        for (uint256 i = 0; i < voters.length; i++) {
            require(voters[i] != voterAddress, 'Already voted');
        }
        if (voteSide) {
            proposalForVoters[msg.sender].push(voterAddress);
        } else {
            proposalAgainstVoters[msg.sender].push(voterAddress);
        }
        voterActiveProposals[voterAddress] += 1;
    }

    function decreaseWonSideVotersProposals(bool isProposalPassed, address proposalAddress) internal {
        address[] memory wonSideVoters = isProposalPassed ? proposalForVoters[proposalAddress] : proposalAgainstVoters[proposalAddress];
        for (uint256 i = 0; i < wonSideVoters.length; i++) {
            voterActiveProposals[wonSideVoters[i]] -= 1;
        }
    }

    function getProposalForVoters(address proposalAddress) public view returns (address[] memory) {
        return proposalForVoters[proposalAddress];
    }

    function getProposalAgainstVoters(address proposalAddress) public view returns (address[] memory) {
        return proposalAgainstVoters[proposalAddress];
    }

    modifier hasNoActiveProposals() {
        require(voterActiveProposals[msg.sender] == 0, 'User has active proposals');
        _;
    }
}
