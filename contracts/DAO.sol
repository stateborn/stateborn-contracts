// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./Proposal.sol";
import "./ERC20DAOPool.sol";

abstract contract DAO is ReentrancyGuard {

    mapping(bytes => Proposal) private proposals;
    uint256 public challengePeriodSeconds = 1 minutes;
    uint256 public nativeCollateral = 1 ether;
    uint256 public tokenCollateral;

    event ProposalCreated(bytes proposalId, address proposalAddress);
    event DaoPoolCreated(address daoPoolAddress);

    function getDaoPool() virtual internal returns (ERC20DAOPool);

    // _tokenCollateral - should already include decimals
    // _challengePeriod - in seconds
    // _nativeCollateral - in wei
    constructor(uint256 _tokenCollateral, uint256 _challengePeriodSeconds, uint256 _nativeCollateral) {
        tokenCollateral = _tokenCollateral;
        challengePeriodSeconds = _challengePeriodSeconds;
        nativeCollateral = _nativeCollateral;
    }

    function setChallengePeriod(uint256 _challengePeriod) public {
        challengePeriodSeconds = _challengePeriod;
    }

    function setChallengeCollateral(uint256 _challengeCollateral) public {
        nativeCollateral = _challengeCollateral;
    }

    function createProposal(
            bytes memory _proposalId,
            bytes32 _proposalMerkleRoot,
            bytes[] calldata _payloads) payable public nonReentrant {
        Proposal existingPool = proposals[_proposalId];
        require(address(existingPool) == address(0), "Proposal already exists");
        Proposal proposal = new Proposal{value: msg.value}(_proposalMerkleRoot, payable(msg.sender), nativeCollateral, tokenCollateral, challengePeriodSeconds, _payloads, address(getDaoPool()));
        proposals[_proposalId] = proposal;
        getDaoPool().approveProposal(address(proposal));
        emit ProposalCreated(_proposalId, address(proposal));
    }

    // it could be interface based for more assets support
    function sendErc20(bytes memory proposalId, address tokenAddress, address to, uint256 amount) external {
        Proposal proposal = proposals[proposalId];
        require(address(proposal) != address(0), "Proposal does not exist");
        bool isProposalPassed = proposal.isPassed();
        require(isProposalPassed == true, "Proposal did not pass");
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(to, amount), "ERC20 transfer failed");
    }

    function sendNft(bytes memory proposalId, address tokenAddress, address to, uint256 tokenId) external {
        Proposal proposal = proposals[proposalId];
        require(address(proposal) != address(0), "Proposal does not exist");
        bool isProposalPassed = proposal.isPassed();
        require(isProposalPassed == true, "Proposal did not pass");
        IERC721 token = IERC721(tokenAddress);
        token.transferFrom(address(this), to, tokenId);
    }

}