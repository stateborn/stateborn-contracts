// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import './pool/IDaoPool.sol';

struct PollCard {
    uint256 nativeForVotes;
    uint256 nativeAgainstVotes;
    uint256 tokenForVotes;
    uint256 tokenAgainstVotes;
}

contract Proposal {
    // 32 bytes hex value
    bytes32 public immutable proposalMerkleRootHex;
    address payable public immutable sequencerAddress;
    uint256 public immutable challengePeriodSeconds;
    uint256 public immutable nativeCollateral;
    uint256 public immutable tokenCollateral;
    bytes[] private payloads;
    address public immutable daoAddress;
    IDaoPool public immutable daoPool;
    uint256 public immutable contractCreationTime;

    uint256 public forVotesCounter;
    uint256 public againstVotesCounter;

    mapping(address => PollCard) public votes;
    bool public executed = false;

    constructor(
        bytes32 _proposalMerkleRootHex,
        address payable _sequencerAddress,
        uint256 _nativeCollateral,
        uint256 _tokenCollateral,
        uint256 _challengePeriodSeconds,
        bytes[] memory _payloads,
        address _daoPoolAddress
    ) payable {
        proposalMerkleRootHex = _proposalMerkleRootHex;
        sequencerAddress = _sequencerAddress;
        nativeCollateral = _nativeCollateral;
        tokenCollateral = _tokenCollateral;
        challengePeriodSeconds = _challengePeriodSeconds;
        payloads = _payloads;
        contractCreationTime = block.timestamp;
        daoPool = IDaoPool(_daoPoolAddress);
        daoAddress = msg.sender;

        uint256 votesCount = _validateCollateralAndGetVotesCount();
        PollCard storage pollCard = votes[_sequencerAddress];
        pollCard.nativeForVotes = votesCount;
        forVotesCounter = votesCount;
    }

    function vote(bool voteSide) public payable isInChallengePeriodMod {
        uint256 votesCount = _validateCollateralAndGetVotesCount();
        PollCard storage pollCard = votes[msg.sender];
        if (voteSide) {
            pollCard.nativeForVotes += votesCount;
            forVotesCounter += votesCount;
        } else {
            pollCard.nativeAgainstVotes += votesCount;
            againstVotesCounter += votesCount;
        }
    }

    function _validateCollateralAndGetVotesCount() private returns (uint256) {
        require(msg.value >= nativeCollateral, 'Collateral too small');
        require(msg.value % nativeCollateral == 0, 'Collateral incorrect');
        return msg.value / nativeCollateral;
    }

    function voteWithToken(bool voteSide) public isInChallengePeriodMod {
        uint256 votesCount = daoPool.balanceOf(msg.sender) / tokenCollateral;
        require(votesCount > 0, 'Token collateral too small');
        PollCard storage pollCard = votes[msg.sender];
        bool firstVote = pollCard.tokenForVotes == 0 && pollCard.tokenAgainstVotes == 0;
        if (voteSide) {
            uint256 previousTokenVotes = pollCard.tokenForVotes;
            pollCard.tokenForVotes = votesCount;
            forVotesCounter = (forVotesCounter - previousTokenVotes) + votesCount;
        } else {
            uint256 previousTokenVotes = pollCard.tokenAgainstVotes;
            pollCard.tokenAgainstVotes = votesCount;
            againstVotesCounter = (againstVotesCounter - previousTokenVotes) + votesCount;
        }
        if (firstVote) {
            daoPool.vote(msg.sender, voteSide);
        }
    }

    function claimReward() public payable isAfterChallengePeriodMod {
        PollCard memory pollCard = votes[msg.sender];
        bool passed = isPassed();
        uint256 wonVoterVotesCount = passed
            ? (pollCard.nativeForVotes + pollCard.tokenForVotes)
            : (pollCard.nativeAgainstVotes + pollCard.tokenAgainstVotes);
        require(wonVoterVotesCount > 0, 'Reward not apply');
        uint256 allWonVotesCount = passed ? forVotesCounter : againstVotesCounter;
        uint256 allOppositeVotesCount = passed ? againstVotesCounter : forVotesCounter;
        uint256 balanceToDistribute = allOppositeVotesCount * nativeCollateral;
        uint256 dust = balanceToDistribute % allWonVotesCount;
        uint256 voterReturnCollateralCount = passed ? pollCard.nativeForVotes : pollCard.nativeAgainstVotes;
        uint256 reward = (voterReturnCollateralCount * nativeCollateral) + ((balanceToDistribute * wonVoterVotesCount) / allWonVotesCount);
        // if it's last tx, send the dust left to last claimer
        if (reward + dust == address(this).balance) {
            reward = address(this).balance;
        }
        delete votes[msg.sender];
        payable(msg.sender).transfer(reward);
    }

    function executeProposal() public payable isAfterChallengePeriodMod {
        require(!executed, 'Proposal already executed');
        require(isPassed(), 'Proposal did not pass');
        executed = true;
        for (uint256 i = 0; i < payloads.length; ++i) {
            bytes memory payload = payloads[i];
            (bool success, ) = daoAddress.call(payload);
            require(success, 'Proposal: underlying transaction reverted');
        }
    }

    function isEnded() public view returns (bool) {
        return !_isInChallengePeriod();
    }

    function isPassed() public view returns (bool) {
        if (_isInChallengePeriod()) {
            return false;
        }
        return forVotesCounter > againstVotesCounter;
    }

    function getPayloads() public view returns (bytes[] memory) {
        return payloads;
    }

    function _isInChallengePeriod() private view returns (bool) {
        return block.timestamp <= (contractCreationTime + challengePeriodSeconds);
    }

    modifier isInChallengePeriodMod() {
        require(block.timestamp <= (contractCreationTime + challengePeriodSeconds), 'Is not in challenge period');
        _;
    }

    modifier isAfterChallengePeriodMod() {
        require(block.timestamp > (contractCreationTime + challengePeriodSeconds), 'Is not after challenge period');
        _;
    }
}
