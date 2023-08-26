// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./DaoPool.sol";
import "../Proposal.sol";

contract ERC20DaoPool is DaoPool {

    IERC20 public token;
    mapping(address => uint256) public balances;

    event TokensDeposited(address indexed user, address indexed tokenAddress, uint256 amount);
    event TokensWithdrawn(address indexed user, address indexed tokenAddress, uint256 amount, address indexed withdrawAddress);

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
    }

    function deposit(uint256 amount) public {
        balances[msg.sender] += amount;
        emit TokensDeposited(msg.sender, address(token), amount);
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }

    function withdraw(uint256 amount, address withdrawAddress) public {
        require(voterActiveProposals[msg.sender] == 0, "User has active proposals");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(token.transferFrom(address(this), withdrawAddress, amount), "Transfer failed");
        balances[msg.sender] -= amount;
        if (balances[msg.sender] == 0) {
            delete balances[msg.sender];
        }
        emit TokensWithdrawn(msg.sender, address(token), amount, withdrawAddress);
    }

    function resolveProposal(address proposalAddress) public {
        Proposal proposal = Proposal(proposalAddress);
        require(proposal.isEnded(), "Proposal not ended");
        address[] memory voters = proposal.isPassed() ? proposalForVoters[proposalAddress] : proposalAgainstVoters[proposalAddress];
        uint256 toTransferAmount = 0;
        for (uint256 i = 0; i < voters.length; i++) {
            address voterAddress = voters[i];
            toTransferAmount += balanceOf(voterAddress);
            delete balances[voterAddress];
            voterActiveProposals[voterAddress] = 0;
        }
        delete proposalForVoters[proposalAddress];
        delete proposalAgainstVoters[proposalAddress];
        delete approvedProposals[proposalAddress];
        require(token.transfer(owner(), toTransferAmount), "Token transfer failed");
    }

    function balanceOf(address account) override public view returns (uint256) {
        return balances[account];
    }
}