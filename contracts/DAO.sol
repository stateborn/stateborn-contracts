pragma solidity ^0.8.18;

import "./IProposal.sol";
import "./Proposal.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";
import "./ERC20DAOPool.sol";

abstract contract DAO {

    mapping(bytes => IProposal) public proposals;
    uint256 public challengePeriodSeconds = 1 minutes;
    uint256 public nativeCollateral = 1 ether;
    uint256 public tokenCollateral;
    event ProposalCreated(bytes proposalId, address proposalAddress);

    function validateTokenCollateral(address userAddress, uint256 requiredCollateral) public virtual returns (uint256);
    function voteWithDaoToken(address proposalAddress, bool vote) public virtual;

    // _tokenCollateral - should already include decimals
    // _challengePeriod - in seconds
    // _nativeCollateral - in wei
    constructor(uint256 _tokenCollateral, uint256 _challengePeriod, uint256 _nativeCollateral) {
        tokenCollateral = _tokenCollateral;
        challengePeriodSeconds = _challengePeriod;
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
            address[] calldata _targets,
            uint256[] calldata _values,
            bytes[] calldata _payloads) payable public {
        IProposal existingPool = proposals[_proposalId];
        require(address(existingPool) == address(0), "Proposal already exists");
        IProposal prop = new Proposal{value: msg.value}(_proposalMerkleRoot, _proposalId, payable(msg.sender), nativeCollateral, tokenCollateral, challengePeriodSeconds, _targets, _values, _payloads, address(this));
        proposals[_proposalId] = prop;
        emit ProposalCreated(_proposalId, address(prop));
    }

    // it could be interface based for more assets support
    function sendErc20(bytes memory proposalId, address tokenAddress, address to, uint256 amount) external {
        IProposal proposal = proposals[proposalId];
        require(address(proposal) != address(0), "Proposal does not exist");
        bool isProposalPassed = proposal.isPassed();
        require(isProposalPassed == true, "Proposal did not pass");
        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(to, amount), "ERC20 transfer failed");
    }

    function sendNft(bytes memory proposalId, address tokenAddress, address to, uint256 tokenId) external {
        IProposal proposal = proposals[proposalId];
        require(address(proposal) != address(0), "Proposal does not exist");
        bool isProposalPassed = proposal.isPassed();
        require(isProposalPassed == true, "Proposal did not pass");
        IERC721 token = IERC721(tokenAddress);
        token.transferFrom(address(this), to, tokenId);
    }

}