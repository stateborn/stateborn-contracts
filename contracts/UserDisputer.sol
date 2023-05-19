// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";
using ECDSA for bytes32;

contract UserDisputer {

    bytes32 public merkleRoot;
    constructor(bytes32 _merkleRoot) {
        merkleRoot = _merkleRoot;
    }

    function checkInWhitelist(bytes32[] calldata proof, uint64 maxAllowanceToMint) view public returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, maxAllowanceToMint));
        bool verified = MerkleProof.verify(proof, merkleRoot, leaf);
        return verified;
    }

    function publishVote(
        bool decision,
        uint64 votingPower,
        bytes memory userSignature,
        address sequencerAddress,
        bytes memory sequencerSignature,
        bytes32[] calldata proof) view public returns (bytes32) {
        bytes memory signConstant = "\x19Ethereum Signed Message:\n32";

        bytes32 hashedUserVote = keccak256(abi.encodePacked(decision, votingPower));
        bytes32 userSignedHash = keccak256(abi.encodePacked(signConstant, hashedUserVote));
        console.log("ADRES USERA", getSigner(userSignedHash, userSignature, msg.sender));
        assert(getSigner(userSignedHash, userSignature, msg.sender) == msg.sender);

        bytes32 sequencerHashedVote = keccak256(abi.encodePacked(hashedUserVote, userSignature));
        bytes32 sequencerSignedHash = keccak256(abi.encodePacked(signConstant, sequencerHashedVote));
        console.log("ADRES SEQUENERA", getSigner(sequencerSignedHash, sequencerSignature, sequencerAddress));
        assert(getSigner(sequencerSignedHash, sequencerSignature, sequencerAddress) == sequencerAddress);

        bytes32 leaf = keccak256(abi.encode(sequencerHashedVote, sequencerSignature));
        bool verified = MerkleProof.verify(proof, merkleRoot, leaf);
        console.logBytes32(sequencerHashedVote);
        console.log("VERIFIED", verified);
        require(verified == true, "User vote is incorrect");
        return userSignedHash;
    }

    function getSigner(bytes32 dataHash, bytes memory signature, address account) view internal returns (address) {
        return dataHash.recover(signature);
    }

}