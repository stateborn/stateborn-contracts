// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './DaoPool.sol';
import '../Proposal.sol';

contract NFTDaoPool is DaoPool, IERC721Receiver {
    IERC721 public token;
    mapping(address => uint256[]) public balances;

    event TokensDeposited(address indexed user, address indexed tokenAddress, uint256 tokenId);
    event TokensWithdrawn(address indexed user, address indexed tokenAddress, uint256 tokenId, address indexed withdrawAddress);

    constructor(address _tokenAddress) {
        token = IERC721(_tokenAddress);
    }

    function deposit(uint256 tokenId) public {
        balances[msg.sender].push(tokenId);
        emit TokensDeposited(msg.sender, address(token), tokenId);
        token.safeTransferFrom(msg.sender, address(this), tokenId);
    }

    function withdraw(uint256 tokenId, address withdrawAddress) public hasNoActiveProposals {
        uint256[] storage userTokenIds = balances[msg.sender];
        bool found = false;
        for (uint256 i = 0; i < balances[msg.sender].length; i++) {
            if (userTokenIds[i] == tokenId) {
                token.safeTransferFrom(address(this), withdrawAddress, tokenId);
                userTokenIds[i] = userTokenIds[userTokenIds.length - 1];
                userTokenIds.pop();
                found = true;
                break;
            }
        }
        if (!found) {
            revert('Token not found');
        } else {
            emit TokensWithdrawn(msg.sender, address(token), tokenId, withdrawAddress);
        }
    }

    function resolveProposal(address proposalAddress) public {
        require(approvedProposals[proposalAddress], 'Proposal not approved');
        Proposal proposal = Proposal(proposalAddress);
        require(proposal.isEnded(), 'Proposal not ended');
        address[] memory lostSideVoters = proposal.isPassed() ? proposalAgainstVoters[proposalAddress] : proposalForVoters[proposalAddress];
        for (uint256 i = 0; i < lostSideVoters.length; i++) {
            address voterAddress = lostSideVoters[i];
            uint256[] memory userTokenIds = balances[voterAddress];
            for (uint256 k = 0; k < userTokenIds.length; k++) {
                uint256 tokenId = userTokenIds[k];
                token.safeTransferFrom(address(this), owner(), tokenId);
            }
            delete balances[voterAddress];
            voterActiveProposals[voterAddress] = 0;
        }
        decreaseWonSideVotersProposals(proposal.isPassed(), proposalAddress);
        delete proposalForVoters[proposalAddress];
        delete proposalAgainstVoters[proposalAddress];
        delete approvedProposals[proposalAddress];
    }

    function balanceOf(address account) public view override returns (uint256) {
        return balances[account].length;
    }

    function onERC721Received(address operator, address from, uint256 tokenId, bytes memory data) external override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
