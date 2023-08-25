//// SPDX-License-Identifier: MIT
//pragma solidity ^0.8.18;
//
//import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
//import "@openzeppelin/cosdsdsntracts/utils/cryptography/ECDSA.sol";
//import "hardhat/console.sol";
//import "./DAO.sol";
//import "./Proposal.sol";
//
//using ECDSA for bytes32;
//
//struct UserChallenge {
//    bytes32 sequencerCard;
//    uint256 voteTimestamp;
//    bytes sequencerSignature;
//    bool isResolved;
//}
//
//// First user can challenge sequencer (ChallengeSequencer)
//// Than sequencer can challenge user back (ChallengeUser)
//contract ProposalUserChallenge {
//
//    bytes public constant signConstant = "\x19Ethereum Signed Message:\n32";
//    bytes32 public proposalMerkleRoot;
//    Proposal private proposal;
//    address payable public sequencerAddress;
//    address private userAddress;
//    uint256 public contractCreationTime;
//    uint256 public challengePeriod;
//
//    address[] public forVoters;
//    mapping(address => uint256) public voters;
//    address[] public againstVoters;
//
//    bool public executed = false;
//    bool public canceled = false;
//    bool public challenged = false;
//
//    UserChallenge private userChallenge;
//
//    constructor(
//            bytes32 _proposalMerkleRoot,
//            bytes memory _proposalAddress,
//            address payable _sequencerAddress,
//            uint256 _challengePeriod,
//            bool decision,
//            uint64 votingPower,
//            address userAddress,
//            bytes memory userSignature,
//            bytes memory sequencerSignature) {
//        proposalMerkleRoot = _proposalMerkleRoot;
//        proposal = Proposal(_proposalAddress);
//        sequencerAddress = _sequencerAddress;
//        contractCreationTime = block.timestamp;
//        challengePeriod = _challengePeriod;
//        challengeProposal(decision, votingPower, userAddress, userSignature, sequencerSignature);
//    }
//
//
//    // User can challenge sequencer providing decision and voting power.
//    // This function verifies if user provided the correct vote signed by sequencer.
//    // If publicly available voting cards published by sequencer create a `votingMerkleRoot`
//    // and user has correctly signed card, it means that user is right and sequencer is wrong.
//    function challengeProposal(
//            address voterAddress,
//            bytes32 vote,
//            uint256 votingPower,
//            uint256 voteTimestamp,
//            bytes memory voterSignature,
//            bytes memory sequencerSignature) private payable {
//        proposal.validateCollateral();
//        bytes32 sequencerCard = validateVote(voterAddress, vote, votingPower, voteTimestamp, voterSignature, sequencerSignature);
//        userChallenge = UserChallenge(sequencerCard, voteTimestamp, sequencerSignature, false);
//        challenged = true;
//    }
//
//    function validateVote(
//            address voterAddress,
//            bytes32 vote,
//            uint256 votingPower,
//            uint256 voteTimestamp,
//            bytes memory voterSignature,
//            bytes memory sequencerSignature) internal returns (bytes32) {
//        bytes32 voteCard = keccak256(abi.encodePacked(voterAddress, proposal.getProposalId(), vote, votingPower, voteTimestamp));
//        bytes32 voteHash = keccak256(abi.encodePacked(signConstant, voteCard));
//        require(getSigner(voteHash, voterSignature) == voterAddress, "Voter signature is incorrect");
//
//        bytes32 sequencerCard = keccak256(abi.encodePacked(voteCard, voterSignature));
//        bytes32 sequencerCardHash = keccak256(abi.encodePacked(signConstant, sequencerCard));
//        require(getSigner(sequencerCardHash, sequencerSignature) == sequencerAddress, "Sequencer signature is incorrect");
//        return sequencerCard;
//    }
//
//    // Sequencer can challenge user providing merkle proofs of voting cards
//    function challengeVoter(
//            address voterAddress,
//            bytes32 vote,
//            uint256 votingPower,
//            uint256 voteTimestamp,
//            bytes memory userSignature,
//            bytes memory sequencerSignature,
//            bytes32[] calldata merkleProofs) payable public onlyBySequencer isInChallengeUserPeriod {
//        proposal.validateCollateral();
//        require(userChallenge.sequencerCard != 0, "User has not challenged");
//        validateVote(voterAddress, vote, votingPower, voteTimestamp, userSignature, sequencerSignature);
//        require(voteTimestamp >= userChallenge.voteTimestamp, "Voter vote is newer");
//        bytes32 leaf = keccak256(abi.encode(userChallenge.sequencerCard, userChallenge.sequencerSignature));
//        bool verified = MerkleProof.verify(merkleProofs, proposalMerkleRoot, leaf);
//        address payable recipient = verified ? sequencerAddress : userAddress;
//        userChallenge.isResolved = true;
////        recipient.transfer(collateral);
//    }
//
//    function claimChallengeReward() payable public isAfterFirstChallengePeriod {
//        require(userChallenge.sequencerCard != 0, "User did not challenged");
//        require(userChallenge.isResolved == false, "User is already resolved");
//        userChallenge.isResolved = true;
////        payable(msg.sender).transfer(collateral);
//    }
//
////    function isPassed() public view returns (bool) {
////        bool isAfterChallengeUserPeriod = block.timestamp >= (contractCreationTime + challengePeriod + challengePeriod);
////        if (!isAfterChallengeUserPeriod) {
////            return false;
////        }
////        for (uint256 i = 0; i < challengingUsersAddresses.length; i++) {
////            address userAddress = challengingUsersAddresses[i];
////            UserChallenge memory challenge = userChallenges[userAddress];
////            if (challenge.isResolved == false) {
////                return false;
////            }
////        }
////        return forVoters.length > againstVoters.length;
////    }
//
////    function isChallenged() public view returns (bool) {
////        bool isAfterChallengeUserPeriod = block.timestamp >= (contractCreationTime + challengePeriod + challengePeriod);
////        if (!isAfterChallengeUserPeriod) {
////            return false;
////        }
////        for (uint256 i = 0; i < challengingUsersAddresses.length; i++) {
////            address userAddress = challengingUsersAddresses[i];
////            UserChallenge memory challenge = userChallenges[userAddress];
////            if (challenge.isResolved == false) {
////                return false;
////            }
////        }
////        return true;
////    }
//
//    function getChallengeSequencerEndTime() external view returns (uint256) {
////        return contractCreationTime + challengePeriod;
//        return contractCreationTime;
//    }
//
//    function getChallengeUserEndTime() external view returns (uint256) {
//        return contractCreationTime + challengePeriod + challengePeriod;
//    }
//
//    function getSigner(bytes32 dataHash, bytes memory signature) view internal returns (address) {
//        return dataHash.recover(signature);
//    }
//
//    modifier isInFirstChallengePeriod() {
//        require(block.timestamp <= (contractCreationTime + challengePeriod), "Time to challenge sequencer has passed");
//        _;
//    }
//
//    modifier isInChallengeUserPeriod() {
//        require((block.timestamp >= (contractCreationTime + challengePeriod)) && (block.timestamp <= (contractCreationTime + challengePeriod + challengePeriod)), "Time to challenge user has passed");
//        _;
//    }
//
//    modifier isAfterFirstChallengePeriod() {
//        require(block.timestamp >= (contractCreationTime + challengePeriod + challengePeriod), "Claim sequencer collateral impossible yet");
//        _;
//    }
//
//    modifier onlyBySequencer() {
//        require(msg.sender == sequencerAddress, "Only sequencer can challenge user");
//        _;
//    }
//
//}
