const keccak256 = require('keccak256')
import { MerkleTree } from 'merkletreejs'
import { ethers } from 'hardhat';

const { expect } = require("chai");

const userVote = {
    votingPower: 80,
    decision: true,
}

const userVote2 = {
    votingPower: 100,
    decision: true,
}

const votingCard1 = {
    votingCard: {
        userVote: userVote,
        signature: 'undefined',
        finalVotingPower: 80,
    },
    sequencerSignature: 'undefined',
}

const votingCard2 = {
    votingCard: {
        userVote: userVote2,
        signature: 'undefined',
        finalVotingPower: 180,
    },
    sequencerSignature: 'undefined',
}

function encodeLeaf(userSignedVotingCard: string, sequencerSignature: string) {
    // Same as `abi.encodePacked` in Solidity
    return ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "bytes"],
        [userSignedVotingCard, sequencerSignature]
    );
}

function abiEncodeUserVote(decision: boolean, votingPower: number) {
    // Same as `abi.encodePacked` in Solidity
    return ethers.utils.solidityPack(
        ["bool", "uint64"],
        [decision, votingPower]
    );
}

function abiEncodeSequencerVoting(keccak256UserEncodedAbi: string, userSignature: string) {
    // Same as `abi.encodePacked` in Solidity
    return ethers.utils.solidityPack(
        ["bytes", "bytes"],
        [keccak256UserEncodedAbi, userSignature]
    );
}


describe("Check stateborn", function () {
    it("stateborn should work", async function () {
        const sequencerWallet = (await ethers.getSigners())[1];
        const randomWallet1 = (await ethers.getSigners())[0];
        const randomWallet2 = (await ethers.getSigners())[2];
        console.log('user1 address', randomWallet1.address);
        console.log('user2 address', randomWallet2.address);
        console.log('sequencer address', sequencerWallet.address);


        const userCardToSign1 = ethers.utils.keccak256(abiEncodeUserVote(userVote.decision, userVote.votingPower));
        const userCardToSign2 = ethers.utils.keccak256(abiEncodeUserVote(userVote2.decision, userVote2.votingPower));
        votingCard1.votingCard.signature = await randomWallet1.signMessage(ethers.utils.arrayify(userCardToSign1));
        votingCard2.votingCard.signature = await randomWallet2.signMessage(ethers.utils.arrayify(userCardToSign2));

        const userSignedVotingCard1 = ethers.utils.keccak256(abiEncodeSequencerVoting(userCardToSign1, votingCard1.votingCard.signature));
        const userSignedVotingCard2 = ethers.utils.keccak256(abiEncodeSequencerVoting(userCardToSign2, votingCard2.votingCard.signature));
        votingCard1.sequencerSignature = await sequencerWallet.signMessage(ethers.utils.arrayify(userSignedVotingCard1));
        votingCard2.sequencerSignature = await sequencerWallet.signMessage(ethers.utils.arrayify(userSignedVotingCard2));


        // votingCard2.sequencerSignature = await sequencerWallet.signMessage(userSignedVotingCard2);
        const list = [
            encodeLeaf(userSignedVotingCard1, votingCard1.sequencerSignature),
            encodeLeaf(userSignedVotingCard2, votingCard2.sequencerSignature),
        ];

        const merkleTree = new MerkleTree(list, keccak256, {
            hashLeaves: true,
            sortPairs: true,
        });
        // Compute the Merkle Root
        const root = merkleTree.getHexRoot();
        // Compute the Merkle Proof of the owner address (0'th item in list)
        // off-chain. The leaf node is the hash of that value.
        //zmien tuta zeby dostac hash
        const leaf = keccak256(list[1]);
        const proof = merkleTree.getHexProof(leaf);


        const whitelist = await ethers.getContractFactory("UserDisputer");
        const Whitelist = await whitelist.deploy(root);
        await Whitelist.deployed();
        const result = await Whitelist.publishVote(
            userVote2.decision,
            userVote2.votingPower,
            votingCard2.votingCard.signature,
            sequencerWallet.address,
            votingCard2.sequencerSignature,
            proof
        );
        // expect(ethers.utils.toUtf8Bytes(result)).to.equal(ethers.utils.toUtf8Bytes(userCardToSign1));




        // // Provide the Merkle Proof to the contract, and ensure that it can verify
        // // that this leaf node was indeed part of the Merkle Tree
        // let verified = await Whitelist.checkInWhitelist(proof, 2);
        // expect(verified).to.equal(true);
        //
        // // Provide an invalid Merkle Proof to the contract, and ensure that
        // // it can verify that this leaf node was NOT part of the Merkle Tree
        // verified = await Whitelist.checkInWhitelist([], 2);
        // expect(verified).to.equal(false);
    });
});