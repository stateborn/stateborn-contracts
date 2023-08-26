// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./DaoPool.sol";
import "../Proposal.sol";

contract NFTDaoPool is DaoPool {

    ERC721 public token;
    mapping(address => uint256[]) public balances;

    event TokensDeposited(address indexed user, address indexed tokenAddress, uint256 tokenId);
    event TokensWithdrawn(address indexed user, address indexed tokenAddress, uint256 tokenId, address indexed withdrawAddress);

    constructor(address _tokenAddress) {
        token = ERC721(_tokenAddress);
    }

    function deposit(uint256 tokenId) public {
        balances[msg.sender].push(tokenId);
        emit TokensDeposited(msg.sender, address(token), tokenId);
        token.safeTransferFrom(msg.sender, address(this), tokenId);
    }

    function withdraw(uint256 tokenId, address withdrawAddress) public {
        require(voterActiveProposals[msg.sender] == 0, "User has active proposals");
        uint256 index;
        uint256[] storage userTokenIds = balances[msg.sender];
        for (uint256 i = 0; i < balances[msg.sender].length ; i++) {
            if (userTokenIds[i] == tokenId) {
                index = userTokenIds[i];
                token.safeTransferFrom(address(this), withdrawAddress, tokenId);
                delete userTokenIds[i];
                break;
            }
        }
        emit TokensWithdrawn(msg.sender, address(token), tokenId, withdrawAddress);
    }

    function resolveProposal(address proposalAddress) public {
        Proposal proposal = Proposal(proposalAddress);
        require(proposal.isEnded(), "Proposal not ended");
        address[] memory voters = proposal.isPassed() ? proposalForVoters[proposalAddress] : proposalAgainstVoters[proposalAddress];
        uint256 toTransferAmount = 0;
        for (uint256 i = 0; i < voters.length; i++) {
            address voterAddress = voters[i];
            uint256[] memory userTokenIds = balances[voterAddress];
            for (uint256 k = 0; k < userTokenIds.length; k++) {
                uint256 tokenId = userTokenIds[k];
                token.safeTransferFrom(address(this), owner(), tokenId);
            }
            delete balances[voterAddress];
            voterActiveProposals[voterAddress] = 0;
        }
        delete proposalForVoters[proposalAddress];
        delete proposalAgainstVoters[proposalAddress];
        delete approvedProposals[proposalAddress];
    }

    function balanceOf(address account) override public view returns (uint256) {
        return balances[account].length;
    }
}