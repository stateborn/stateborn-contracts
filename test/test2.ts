// import { address } from 'hardhat/internal/core/config/config-validation';
//
// const keccak256 = require('keccak256')
// import { MerkleTree } from 'merkletreejs'
// import { ethers } from 'hardhat';
//
// const { expect } = require("chai");
// import { time } from "@nomicfoundation/hardhat-network-helpers";
//
// const votingCard1 = {
//     votingCard: {
//         userVote: {
//             votingPower: 80,
//             decision: true,
//         }
//         ,
//         signature: 'undefined',
//         finalVotingPower: 80,
//     },
//     sequencerSignature: 'undefined',
// }
//
// const votingCard2 = {
//     votingCard: {
//         userVote: {
//             votingPower: 100,
//             decision: true,
//         },
//         signature: 'undefined',
//         finalVotingPower: 180,
//     },
//     sequencerSignature: 'undefined',
// }
//
// function encodeLeaf(userSignedVotingCard: string, sequencerSignature: string) {
//     // Same as `abi.encodePacked` in Solidity
//     return ethers.utils.defaultAbiCoder.encode(
//         ["bytes32", "bytes"],
//         [userSignedVotingCard, sequencerSignature]
//     );
// }
//
// function abiEncodeUserVote(decision: boolean, votingPower: number, votingId: string) {
//     // Same as `abi.encodePacked` in Solidity
//     return ethers.utils.solidityPack(
//         ["bool", "uint64", "bytes32"],
//         [decision, votingPower, votingId]
//     );
// }
//
// function abiEncodeSequencerVoting(keccak256UserEncodedAbi: string, userSignature: string) {
//     // Same as `abi.encodePacked` in Solidity
//     return ethers.utils.solidityPack(
//         ["bytes", "bytes"],
//         [keccak256UserEncodedAbi, userSignature]
//     );
// }
//
//
// describe("Check stateborn", function () {
//     it("stateborn should work", async function () {
//         const sequencerWallet = (await ethers.getSigners())[1];
//         const randomWallet1 = (await ethers.getSigners())[0];
//         const randomWallet2 = (await ethers.getSigners())[2];
//         console.log('user1 address', randomWallet1.address);
//         console.log('user2 address', randomWallet2.address);
//         console.log('sequencer address', sequencerWallet.address);
//         const pollId = ethers.utils.formatBytes32String("1");
//
//         const userVote1 = ethers.utils.keccak256(abiEncodeUserVote(votingCard1.votingCard.userVote.decision, votingCard1.votingCard.userVote.votingPower, pollId));
//         const userVote2 = ethers.utils.keccak256(abiEncodeUserVote(votingCard2.votingCard.userVote.decision, votingCard2.votingCard.userVote.votingPower, pollId));
//         votingCard1.votingCard.signature = await randomWallet1.signMessage(ethers.utils.arrayify(userVote1));
//         votingCard2.votingCard.signature = await randomWallet2.signMessage(ethers.utils.arrayify(userVote2));
//
//         const sequencerCard1 = ethers.utils.keccak256(abiEncodeSequencerVoting(userVote1, votingCard1.votingCard.signature));
//         const sequencerCard2 = ethers.utils.keccak256(abiEncodeSequencerVoting(userVote2, votingCard2.votingCard.signature));
//         votingCard1.sequencerSignature = await sequencerWallet.signMessage(ethers.utils.arrayify(sequencerCard1));
//         votingCard2.sequencerSignature = await sequencerWallet.signMessage(ethers.utils.arrayify(sequencerCard2));
//
//
//         // votingCard2.sequencerSignature = await sequencerWallet.signMessage(userSignedVotingCard2);
//         const list = [
//             encodeLeaf(sequencerCard1, votingCard1.sequencerSignature),
//             encodeLeaf(sequencerCard2, votingCard2.sequencerSignature),
//         ];
//
//         const merkleTree = new MerkleTree(list, keccak256, {
//             hashLeaves: true,
//             sortPairs: true,
//         });
//         // Compute the Merkle Root
//         const root = merkleTree.getHexRoot();
//         // Compute the Merkle Proof of the owner address (0'th item in list)
//         // off-chain. The leaf node is the hash of that value.
//         //zmien tuta zeby dostac hash
//         const leaf = keccak256(list[0]);
//         const merkleProofs = merkleTree.getHexProof(leaf);
//
//
//         const VotingMachine = await ethers.getContractFactory("VotingMachine");
//         const votingMachine = await VotingMachine.deploy();
//         await votingMachine.deployed();
//         let pollAddress = '';
//         const waitForEventEmitted = new Promise((resolve) => {
//             votingMachine.on('PollCreated', (pollId, _pollAddress) => {
//                 console.log(`Proxy created at ${pollAddress} with id ${pollId}`);
//                 pollAddress = _pollAddress;
//                 resolve(true);
//             });
//         });
//         await votingMachine.connect(sequencerWallet).createPoll(
//             pollId,
//             root,
//             [],
//             [],
//             [],
//             {value: ethers.utils.parseEther("9000") });
//         await waitForEventEmitted;
//         const Poll = await ethers.getContractFactory("Poll");
//         const poll = Poll.attach(pollAddress);
//         await poll.disputeSequencer(
//             votingCard1.votingCard.userVote.decision,
//             votingCard1.votingCard.userVote.votingPower,
//             randomWallet1.address,
//             votingCard1.votingCard.signature,
//             votingCard1.sequencerSignature,
//             {value: ethers.utils.parseEther("9000") }
//         );
//         console.log('user balance: ', ethers.utils.formatEther(await ethers.provider.getBalance(randomWallet1.address)));
//         console.log('sequencer balance: ', ethers.utils.formatEther(await ethers.provider.getBalance(sequencerWallet.address)));
//         //3 days +1
//         await time.increase(259200 + 1);
//         // await poll.connect(sequencerWallet).disputeUser(
//         //     randomWallet1.address,
//         //     merkleProofs,
//         // );
//         await time.increase(259200 + 1);
//         await poll.connect(randomWallet1).claimDispute();
//
//         await time.increase(259200 + 1);
//         console.log('po dispute user balance: ', ethers.utils.formatEther(await ethers.provider.getBalance(randomWallet1.address)));
//         console.log('po dispute sequencer balance: ', ethers.utils.formatEther(await ethers.provider.getBalance(sequencerWallet.address)));
//     });
// });
