//// SPDX-License-Identifier: MIT
//pragma solidity ^0.8.18;
//
//interface IProposalUserChallenge {
//
//    // User can challenge sequencer providing decision and voting power.
//    // This function verifies if user provided the correct vote signed by sequencer.
//    // If publicly available voting cards published by sequencer create a `votingMerkleRoot`
//    // and user has correctly signed card, it means that user is right and sequencer is wrong.
//    function challengeSequencer(
//        bool decision,
//        uint64 votingPower,
//        address userAddress,
//        bytes memory userSignature,
//        bytes memory sequencerSignature) payable external;
//
//    // Sequencer can challenge user providing merkle proofs of voting cards.
//    function challengeUser(address payable userAddress, bytes32[] calldata merkleProofs) payable external;
//    function claimChallengeReward() payable external;
//    function isPassed() external returns (bool);
//    function getChallengeUserEndTime() external view returns (uint256);
//    function getChallengeSequencerEndTime() external view returns (uint256);
//}