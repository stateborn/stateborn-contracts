import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
    generateRandomIntNumberFrom1To100,
    generateRandomMerkleRoot,
    generateRandomProposalId,
    initializeErc20TokenAndDao,
    waitForProposalToEnd
} from './utils/utils';
import {
    checkProposalIsExecuted,
    checkProposalIsPassed,
    createSendErc20Proposal,
    voteOnProposalWithCollateral
} from './utils/proposal-utils';
import { LOGGER } from './utils/pino-logger-service';

// SETUP for faster mining
network.provider.send("evm_setIntervalMining", [500]);

describe("Proposal not pass scenarios", function () {

    it("should not pass when 1:1 (creator vote and vote against)", async function () {
        const {token, dao, owner, otherAccount} = await loadFixture(initializeErc20TokenAndDao);

        // 1. Create send ERC20 tokens proposal
        const proposal = await createSendErc20Proposal(
            dao,
            token.address,
            generateRandomProposalId(),
            generateRandomMerkleRoot(),
            otherAccount.address,
            generateRandomIntNumberFrom1To100());

        // 2. Vote against by other account
        const proposalByOtherAccount = proposal.connect(otherAccount);
        await voteOnProposalWithCollateral(proposalByOtherAccount, false, 1);

        await waitForProposalToEnd(proposal);

        // 3. Execute proposal should fail
        expect(proposal.executeProposal()).to.be.revertedWith("Proposal is not passed");

        // 4. Verify proposal state
        await checkProposalIsPassed(proposal, false);
        await checkProposalIsExecuted(proposal, false);

        // 5. Get balance of other account before claiming reward
        const balanceOfAccountBefore = await ethers.provider.getBalance(owner.address);
        const balanceOfOtherAccountBefore = await ethers.provider.getBalance(otherAccount.address);

        // 6. Claim reward
        LOGGER.debug('Claiming proposal reward');
        expect(proposal.claimReward()).to.be.revertedWith("Reward does not apply");
        await proposalByOtherAccount.claimReward();

        // 7. Get balance of other account after claiming reward
        const balanceOfAccountAfter = await ethers.provider.getBalance(owner.address);
        const balanceOfOtherAccountAfter = await ethers.provider.getBalance(otherAccount.address);

        // 8. Expected other account balance: 1 ETH collateral back + 1 ETH proposal reward = 2. Lost account gets zero, but reverted claim is tx cost, so diff < 0.1
        expect(Number(Number(ethers.utils.formatEther(balanceOfOtherAccountAfter.sub(balanceOfOtherAccountBefore).toString())).toFixed(2))).to.be.gte(2);
        expect(Number(Number(ethers.utils.formatEther(balanceOfAccountAfter.sub(balanceOfAccountBefore).toString())).toFixed(2))).to.be.lt(0.1);

        // 9. Expected proposal balance is 0
        const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
        expect(balanceOfProposal).to.be.eq(0);
    });

    it("should not pass when 2:3 (3 votes against)", async function () {
        const {token, dao, owner, otherAccount} = await loadFixture(initializeErc20TokenAndDao);

        const signers = await ethers.getSigners();
        const otherAccount2 = signers[2];
        const otherAccount3 = signers[3];
        const otherAccount4 = signers[4];

        // 1. Create send ERC20 tokens proposal
        const proposal = await createSendErc20Proposal(
            dao,
            token.address,
            generateRandomProposalId(),
            generateRandomMerkleRoot(),
            otherAccount.address,
            generateRandomIntNumberFrom1To100());

        // 2. Vote 3 votes against and 1 for
        const proposalByOtherAccount = proposal.connect(otherAccount);
        const res1 = voteOnProposalWithCollateral(proposalByOtherAccount, false, 1);

        const proposalByOtherAccount2 = proposal.connect(otherAccount2);
        const res2 = voteOnProposalWithCollateral(proposalByOtherAccount2, false, 1);

        const proposalByOtherAccount3 = proposal.connect(otherAccount3);
        const res3 = await voteOnProposalWithCollateral(proposalByOtherAccount3, false, 1);

        const proposalByOtherAccount4 = proposal.connect(otherAccount4);
        const res4 = voteOnProposalWithCollateral(proposalByOtherAccount4, true, 1);

        await Promise.all([res1, res2, res3, res4]);

        await waitForProposalToEnd(proposal);

        // 3. Execute proposal
        expect(proposal.executeProposal()).to.be.revertedWith("Proposal is not passed");

        // 4. Verify proposal state
        await checkProposalIsPassed(proposal, false);
        await checkProposalIsExecuted(proposal, false);

        // 5. Get balance of other account before claiming reward
        const balanceOfAccountBefore = await ethers.provider.getBalance(owner.address);
        const balanceOfOtherAccountBefore = await ethers.provider.getBalance(otherAccount.address);
        const balanceOfOtherAccount2Before = await ethers.provider.getBalance(otherAccount2.address);
        const balanceOfOtherAccount3Before = await ethers.provider.getBalance(otherAccount3.address);
        const balanceOfOtherAccount4Before = await ethers.provider.getBalance(otherAccount4.address);

        // 6. Other account claim reward
        LOGGER.info('Claiming proposal reward');
        await proposalByOtherAccount.claimReward();
        await proposalByOtherAccount2.claimReward();
        await proposalByOtherAccount3.claimReward();
        expect(proposal.claimReward()).to.be.revertedWith("Reward does not apply");
        expect(proposalByOtherAccount4.claimReward()).to.be.revertedWith("Reward does not apply");

        // 7. Get balance of other account after claiming reward
        const balanceOfAccountAfter = await ethers.provider.getBalance(owner.address);
        const balanceOfOtherAccountAfter = await ethers.provider.getBalance(otherAccount.address);
        const balanceOfOtherAccount2After = await ethers.provider.getBalance(otherAccount2.address);
        const balanceOfOtherAccount3After = await ethers.provider.getBalance(otherAccount3.address);
        const balanceOfOtherAccount4After = await ethers.provider.getBalance(otherAccount4.address);

        // 8. Expected other account balance: 1 ETH collateral back + 1/3 of 2 ETH back
        expect(Number(Number(ethers.utils.formatEther(balanceOfOtherAccountAfter.sub(balanceOfOtherAccountBefore).toString())).toFixed(2))).to.be.gte(1.66);
        expect(Number(Number(ethers.utils.formatEther(balanceOfOtherAccount2After.sub(balanceOfOtherAccount2Before).toString())).toFixed(2))).to.be.gte(1.66);
        expect(Number(Number(ethers.utils.formatEther(balanceOfOtherAccount3After.sub(balanceOfOtherAccount3Before).toString())).toFixed(2))).to.be.gte(1.66);
        // only tx cost
        expect(Number(Number(ethers.utils.formatEther(balanceOfAccountAfter.sub(balanceOfAccountBefore).toString())).toFixed(2))).to.be.lt(0.1);
        expect(Number(Number(ethers.utils.formatEther(balanceOfOtherAccount4After.sub(balanceOfOtherAccount4Before).toString())).toFixed(2))).to.be.lt(0.1);

        // 9. Expected proposal balance is 0
        const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
        expect(balanceOfProposal).to.be.eq(0);
    });

});
