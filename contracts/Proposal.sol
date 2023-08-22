// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";
import "./IProposal.sol";
import "./IProposalUserChallenge.sol";
import "./ProposalUserChallenge.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./DAO.sol";

// First user can challenge sequencer (ChallengeSequencer)
// Than sequencer can challenge user back (ChallengeUser)
contract Proposal is IProposal {

    bytes public constant signConstant = "\x19Ethereum Signed Message:\n32";

    // 32 bytes hex value
    bytes32 private immutable proposalMerkleRoot;
    bytes private proposalId;
    address payable private immutable sequencerAddress;
    uint256 private immutable  challengePeriod;
    uint256 private immutable nativeCollateral;
    uint256 private immutable tokenCollateral;
    address[] private targets;
    uint256[] private values;
    bytes[] private payloads;
    DAO private immutable dao;
    uint256 private immutable contractCreationTime;

    // how many each address voted
    mapping(address => uint256) public forVotes;
    mapping(address => uint256) public againstVotes;
    uint256 private forVotesNum;
    uint256 private againstVotesNum;

    bool private executed = false;
    bool private canceled = false;

    constructor(
            bytes32 _proposalMerkleRoot,
            bytes memory _proposalId,
            address payable _sequencerAddress,
            uint256 _nativeCollateral,
            uint256 _tokenCollateral,
            uint256 _challengePeriod,
            address[] memory _targets,
            uint256[] memory _values,
            bytes[] memory _payloads,
            address _daoAddress) payable {
        proposalMerkleRoot = _proposalMerkleRoot;
        proposalId = _proposalId;
        sequencerAddress = _sequencerAddress;
        nativeCollateral = _nativeCollateral;
        tokenCollateral = _tokenCollateral;
        challengePeriod = _challengePeriod;
        targets = _targets;
        values = _values;
        payloads = _payloads;
        contractCreationTime = block.timestamp;
        dao = DAO(_daoAddress);

        uint256 votes = validateCollateralAndGetVotes();
        forVotes[_sequencerAddress] += votes;
        forVotesNum += votes;
    }

    function vote(bool voteSide) payable public isInChallengePeriodMod {
        require(canceled == false, "Proposal canceled");
        require(executed == false, "Proposal executed");
        uint256 votes = validateCollateralAndGetVotes();
        if (msg.value == 0) {
            dao.voteWithDaoToken(address(this), voteSide);
        }
        if (voteSide == true) {
            forVotes[msg.sender] += votes;
            forVotesNum += votes;
        } else {
            againstVotes[msg.sender] += votes;
            againstVotesNum += votes;
        }
    }

    function validateCollateralAndGetVotes() private returns (uint256){
        if (msg.value > 0) {
            require(msg.value >= nativeCollateral, "Collateral not enough");
            return msg.value / nativeCollateral;
        } else {
            uint256 votes = dao.validateTokenCollateral(msg.sender, tokenCollateral);
            require(votes > 0, "Token collateral not enough");
            return votes;
        }
    }

    function claimReward() payable public isAfterChallengePeriodMod {
        uint256 voterVotesNum = isPassed() ? forVotes[msg.sender] : againstVotes[msg.sender];
        require(voterVotesNum > 0, "Reward does not apply");
        uint256 allVotesNum = isPassed() ? forVotesNum : againstVotesNum;
        uint256 allVotesOppositeNum = isPassed() ? againstVotesNum : forVotesNum;
        uint256 balanceToDistribute = allVotesOppositeNum * nativeCollateral;
        uint256 reward = (nativeCollateral * voterVotesNum) + ((balanceToDistribute / allVotesNum) * voterVotesNum);
        // if it's last tx, send the dust left to last voter
        if ((address(this).balance - reward) < nativeCollateral) {
            reward = address(this).balance;
        }
        if (isPassed()) {
            delete forVotes[msg.sender];
        } else {
            delete againstVotes[msg.sender];
        }
        payable(msg.sender).transfer(reward);
    }

    function executeProposal() public payable isAfterChallengePeriodMod {
        require(executed == false, "Proposal already executed");
        bool isProposalPassed = isPassed();
        require(isProposalPassed == true, "Proposal did not pass");
        for (uint256 i = 0; i < targets.length; ++i) {
            address target = targets[i];
//            uint256 value = values[i];
            bytes memory payload = payloads[i];
            _execute(target, payload);
        }
        executed = true;
    }

    /**
    * @dev Execute an operation's call.
     */
    function  _execute(
        address target,
        bytes memory data
    ) private {
//        (bool success, ) = target.call{value: value}(data);
        (bool success, ) = target.call(data);
        require(success, "Proposal: underlying transaction reverted");
    }

    function isEnded() public view returns (bool) {
        return !isInChallengePeriod();
    }

    function isPassed() public view override returns (bool) {
        if (isInChallengePeriod()) {
            return false;
        }
        return forVotesNum > againstVotesNum;
    }

    function isExecuted() public view returns (bool) {
        return executed;
    }

    function getProposalId() external view override returns (bytes memory) {
        return proposalId;
    }

    function getProposalMerkleRoot() external view returns (bytes32) {
        return proposalMerkleRoot;
    }

//    function createProposalUserChallenge(
//            bool decision,
//            uint64 votingPower,
//            address userAddress,
//            bytes memory userSignature,
//            bytes memory sequencerSignature) payable external {
//        IProposalUserChallenge storage proposalUserChallenge = proposalUserChallenges[userAddress];
//        require(address(proposalUserChallenge) == 0, "User already challenged");
//        proposalUserChallenge = new ProposalUserChallenge(
//            proposalMerkleRoot,
//            address(this),
//            sequencerAddress,
//            challengePeriod
//        );
//        proposalUserChallenges[userAddress] = proposalUserChallenge;
//    }

    function isInChallengePeriod() internal view returns (bool) {
        return block.timestamp <= (contractCreationTime + challengePeriod);
    }

    modifier isInChallengePeriodMod() {
        require(block.timestamp <= (contractCreationTime + challengePeriod), "Is not in challenge period");
        _;
    }

    modifier isAfterChallengePeriodMod() {
        require(block.timestamp > (contractCreationTime + challengePeriod), "Is not after challenge period");
        _;
    }
}