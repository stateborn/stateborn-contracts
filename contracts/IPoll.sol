// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IPoll {


    // User can dispute sequencer providing decision and voting power.
    // This function verifies if user provided the correct vote signed by sequencer.
    // If publicly available voting cards published by sequencer create a `votingMerkleRoot`
    // and user has correctly signed card, it means that user is right and sequencer is wrong.
    function disputeSequencer(
        bool decision,
        uint64 votingPower,
        address userAddress,
        bytes memory userSignature,
        bytes memory sequencerSignature) payable external;

    // Sequencer can dispute user providing merkle proofs of voting cards.
    function disputeUser(address payable userAddress, bytes32[] calldata merkleProofs) payable external;

    // Sequencer can dispute user providing merkle proofs of voting cards.
    function claimDispute() payable external;

}