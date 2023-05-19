// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";
import "./IPoll.sol";

using ECDSA for bytes32;

struct UserDispute {
    bytes32 sequencerCard;
    bytes sequencerSignature;
    bool isResolved;
}

contract Poll is IPoll {

    bytes public constant signConstant = "\x19Ethereum Signed Message:\n32";
    bytes32 public pollMerkleRoot;
    bytes public pollId;
    address payable public sequencerAddress;
    mapping(address => UserDispute) public userDisputes;
    uint256 public contractCreationTime;
    uint256 public disputePeriod;
    uint256 public collateral;

    constructor(bytes32 _pollMerkleRoot, bytes memory _pollId, address payable _sequencerAddress, uint256 _collateral, uint256 _disputePeriod) {
        pollMerkleRoot = _pollMerkleRoot;
        pollId = _pollId;
        sequencerAddress = _sequencerAddress;
        contractCreationTime = block.timestamp;
        collateral = _collateral;
        disputePeriod = _disputePeriod;
    }

    // User can dispute sequencer providing decision and voting power.
    // This function verifies if user provided the correct vote signed by sequencer.
    // If publicly available voting cards published by sequencer create a `votingMerkleRoot`
    // and user has correctly signed card, it means that user is right and sequencer is wrong.
    function disputeSequencer(
            bool decision,
            uint64 votingPower,
            address userAddress,
            bytes memory userSignature,
            bytes memory sequencerSignature) public payable isInDisputeSequencerPeriod {
        require(msg.value == collateral, "Collateral required to dispute sequencer");

        bytes32 userVote = keccak256(abi.encodePacked(decision, votingPower, pollId));
        bytes32 userVoteHash = keccak256(abi.encodePacked(signConstant, userVote));
        require(getSigner(userVoteHash, userSignature) == userAddress, "User signature is incorrect");

        bytes32 sequencerCard = keccak256(abi.encodePacked(userVote, userSignature));
        bytes32 sequencerCardHash = keccak256(abi.encodePacked(signConstant, sequencerCard));
        require(getSigner(sequencerCardHash, sequencerSignature) == sequencerAddress, "Sequencer signature is incorrect");
        UserDispute memory dispute = UserDispute(sequencerCard, sequencerSignature, false);
        userDisputes[userAddress] = dispute;
    }

    // Sequencer can dispute user providing merkle proofs of voting cards.
    function disputeUser(address payable userAddress, bytes32[] calldata merkleProofs) payable public onlyBySequencer isInDisputeUserPeriod {
        UserDispute storage dispute = userDisputes[userAddress];
        require(dispute.sequencerCard != 0, "User has not disputed");
        bytes32 leaf = keccak256(abi.encode(dispute.sequencerCard, dispute.sequencerSignature));
        bool verified = MerkleProof.verify(merkleProofs, pollMerkleRoot, leaf);
        address payable recipient = verified ? sequencerAddress : userAddress;
        dispute.isResolved = true;
        recipient.transfer(collateral);
    }

    // Sequencer can dispute user providing merkle proofs of voting cards.
    function claimDispute() payable public isAfterDisputeUserPeriod {
        UserDispute storage dispute = userDisputes[msg.sender];
        console.log(dispute.isResolved);
        require(dispute.sequencerCard != 0, "User has not disputed");
        require(dispute.isResolved == false, "User is already resolved");
        dispute.isResolved = true;
        payable(msg.sender).transfer(collateral);
    }

    function getSigner(bytes32 dataHash, bytes memory signature) view internal returns (address) {
        return dataHash.recover(signature);
    }

    modifier isInDisputeSequencerPeriod() {
        require(block.timestamp <= contractCreationTime + disputePeriod, "Time to dispute sequencer has passed");
        _;
    }

    modifier isInDisputeUserPeriod() {
        require((block.timestamp >= contractCreationTime + disputePeriod) && (block.timestamp <= contractCreationTime + disputePeriod + disputePeriod), "Time to dispute user has passed");
        _;
    }

    modifier isAfterDisputeUserPeriod() {
        require(block.timestamp >= contractCreationTime + disputePeriod + disputePeriod, "Claim sequencer collateral impossible yet");
        _;
    }

    modifier onlyBySequencer() {
        require(msg.sender == sequencerAddress, "Only sequencer can dispute user");
        _;
    }
}