import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, network } from "hardhat";
import {
    approveErc20, expectBalanceDiffIsGte, expectBalanceNotChanged, expectTokenBalanceToEq,
    generateRandomIntNumberFrom1To100,
    generateRandomMerkleRoot,
    generateRandomProposalId,
    initializeErc20TokenAndDao,
    transferERC20TokensToAddress, waitForProposalToEnd
} from './utils/utils';
import {
    checkProposalIsExecuted,
    checkProposalIsPassed,
    createSendErc20Proposal,
    voteOnProposalWithCollateral,
    voteOnProposalWithTokenCollateral
} from './utils/proposal-utils';
import { LOGGER } from './utils/pino-logger-service';
import { depositTokensToPool } from './utils/dao-pool-utils';
import { expect } from 'chai';

// SETUP for faster mining
network.provider.send("evm_setIntervalMining", [500]);

describe("Proposal with DAO governance token collateral votes scenarios", function () {
    const daoTokensBalance = 1000;

    describe("Proposal passed scenarios", function () {;

        it("should pass with 3:2 (3 votes for with token collateral, 2 votes against with ETH collateral)", async function () {
            const {token, dao, account, otherAccount, ERC20DaoPool } = await loadFixture(initializeErc20TokenAndDao);

            const signers = await ethers.getSigners();
            const otherAccount2 = signers[2];
            const otherAccount3 = signers[3];
            const otherAccount4 = signers[4];

            const tokenTransferAmount = generateRandomIntNumberFrom1To100();

            LOGGER.info("1. Create send ERC20 tokens proposal");
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                tokenTransferAmount);

            LOGGER.info("2. Send 100 ERC20 tokens to other account and other account 2");
            const transferRes = transferERC20TokensToAddress(token, otherAccount.address, 100);
            const transferRes2 = transferERC20TokensToAddress(token, otherAccount2.address, 100);
            await Promise.all([transferRes, transferRes2]);

            LOGGER.info("3. Approve ERC20Pool to spend 100 tokens of other account and other account 2");
            const tokenByOtherAccount = token.connect(otherAccount);
            const approveRes = approveErc20(tokenByOtherAccount, ERC20DaoPool.address, 100);
            const tokenByOtherAccount2 = token.connect(otherAccount2);
            const approveRes2 = approveErc20(tokenByOtherAccount2, ERC20DaoPool.address, 100);
            await Promise.all([approveRes, approveRes2]);

            LOGGER.info("4. Deposit 100 tokens to DAO pool by other account and other account 2");
            const daoPoolByOtherAccount = ERC20DaoPool.connect(otherAccount);
            const depositRes = depositTokensToPool(daoPoolByOtherAccount, 100);
            const daoPoolByOtherAccount2 = ERC20DaoPool.connect(otherAccount2);
            const depositRes2 = depositTokensToPool(daoPoolByOtherAccount2, 100);
            await Promise.all([depositRes, depositRes2]);

            LOGGER.info("4. Vote 2 votes for with token collateral (including initial creator vote it will be 3) and 2 votes against with ETH collateral");
            const proposalByOtherAccount = proposal.connect(otherAccount);
            const res1 = voteOnProposalWithTokenCollateral(proposalByOtherAccount, true);

            const proposalByOtherAccount2 = proposal.connect(otherAccount2);
            const res2 = voteOnProposalWithTokenCollateral(proposalByOtherAccount2, true);

            const proposalByOtherAccount3 = proposal.connect(otherAccount3);
            const res3 = await voteOnProposalWithCollateral(proposalByOtherAccount3, false, 1);

            const proposalByOtherAccount4 = proposal.connect(otherAccount4);
            const res4 = voteOnProposalWithCollateral(proposalByOtherAccount4, false, 1);

            await Promise.all([res1, res2, res3, res4]);

            await waitForProposalToEnd(proposal);

            LOGGER.info("5. Verify proposal is passed and not executed");
            await checkProposalIsPassed(proposal, true);
            await checkProposalIsExecuted(proposal, false);

            LOGGER.info("6. Verify accounts ERC20 token balances before executing proposal");
            await expectTokenBalanceToEq(token, dao.address, daoTokensBalance);
            await expectTokenBalanceToEq(token, otherAccount.address, 0);

            LOGGER.info("7. Execute proposal");
            await proposal.executeProposal();

            LOGGER.info("8. Verify proposal is executed");
            await checkProposalIsExecuted(proposal, true);

            LOGGER.info("9. Verify accounts ERC20 token balances after executing proposal: DAO has less tokens, other account has more tokens");
            await expectTokenBalanceToEq(token, dao.address, daoTokensBalance - Number(tokenTransferAmount));
            await expectTokenBalanceToEq(token, otherAccount.address, Number(tokenTransferAmount));

            LOGGER.info("10. Get accounts balances before claiming reward");
            const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountBefore = await ethers.provider.getBalance(otherAccount.address);
            const balanceOfOtherAccount2Before = await ethers.provider.getBalance(otherAccount2.address);
            const balanceOfOtherAccount3Before = await ethers.provider.getBalance(otherAccount3.address);
            const balanceOfOtherAccount4Before = await ethers.provider.getBalance(otherAccount4.address);

            LOGGER.info("11. Claim rewards by all accounts (voters against should revert)");
            await proposal.claimReward();
            await proposalByOtherAccount.claimReward();
            await proposalByOtherAccount2.claimReward();
            await expect(proposalByOtherAccount3.claimReward()).to.be.revertedWith("Reward not apply");
            await expect(proposalByOtherAccount4.claimReward()).to.be.revertedWith("Reward not apply");

            LOGGER.info("12. Get accounts balances after claiming reward");
            const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountAfter = await ethers.provider.getBalance(otherAccount.address);
            const balanceOfOtherAccount2After = await ethers.provider.getBalance(otherAccount2.address);
            const balanceOfOtherAccount3After = await ethers.provider.getBalance(otherAccount3.address);
            const balanceOfOtherAccount4After = await ethers.provider.getBalance(otherAccount4.address);

            // 11. Expected for voting accounts: 1 ETH collateral back + 1/3 of 2 ETH back = ~1.66666 ETH
            LOGGER.info("13. Expected for voters balance: 1/3 of 2 ETH = ~0.66666 ETH, creator gets 1 ETH collateral extra. Against voters should get 0 and pay claim tx fee")
            expectBalanceDiffIsGte(balanceOfAccountBefore, balanceOfAccountAfter, 1.66);
            expectBalanceDiffIsGte(balanceOfOtherAccountBefore, balanceOfOtherAccountAfter, 0.66);
            expectBalanceDiffIsGte(balanceOfOtherAccount2Before, balanceOfOtherAccount2After, 0.66);
            expectBalanceNotChanged(balanceOfOtherAccount3Before, balanceOfOtherAccount3After);
            expectBalanceNotChanged(balanceOfOtherAccount4Before, balanceOfOtherAccount4After);

            LOGGER.info("14. Expected proposal balance is 0");
            const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
            expect(balanceOfProposal).to.be.eq(0);
        });

        it("should not pass with 2:3 (2 votes for with ETH collateral, 3 votes against with token collateral)", async function () {
            const {token, dao, account, otherAccount, ERC20DaoPool } = await loadFixture(initializeErc20TokenAndDao);

            const signers = await ethers.getSigners();
            const otherAccount2 = signers[2];
            const otherAccount3 = signers[3];
            const otherAccount4 = signers[4];

            const tokenTransferAmount = generateRandomIntNumberFrom1To100();

            LOGGER.info("1. Create send ERC20 tokens proposal");
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                tokenTransferAmount);

            LOGGER.info("2. Send 100 ERC20 tokens to other account and other account 2");
            const transferRes = transferERC20TokensToAddress(token, otherAccount.address, 100);
            const transferRes2 = transferERC20TokensToAddress(token, otherAccount2.address, 100);
            const transferRes3 = transferERC20TokensToAddress(token, otherAccount3.address, 100);
            await Promise.all([transferRes, transferRes2, transferRes3]);

            LOGGER.info("3. Approve ERC20Pool to spend 100 tokens of other account and other account 2");
            const tokenByOtherAccount = token.connect(otherAccount);
            const approveRes = approveErc20(tokenByOtherAccount, ERC20DaoPool.address, 100);
            const tokenByOtherAccount2 = token.connect(otherAccount2);
            const approveRes2 = approveErc20(tokenByOtherAccount2, ERC20DaoPool.address, 100);
            const tokenByOtherAccount3 = token.connect(otherAccount3);
            const approveRes3 = approveErc20(tokenByOtherAccount3, ERC20DaoPool.address, 100);
            await Promise.all([approveRes, approveRes2, approveRes3]);

            LOGGER.info("4. Deposit 100 tokens to DAO pool by other account and other account 2 and other account 3");
            const daoPoolByOtherAccount = ERC20DaoPool.connect(otherAccount);
            const depositRes = depositTokensToPool(daoPoolByOtherAccount, 100);
            const daoPoolByOtherAccount2 = ERC20DaoPool.connect(otherAccount2);
            const depositRes2 = depositTokensToPool(daoPoolByOtherAccount2, 100);
            const daoPoolByOtherAccount3 = ERC20DaoPool.connect(otherAccount3);
            const depositRes3 = depositTokensToPool(daoPoolByOtherAccount3, 100);
            await Promise.all([depositRes, depositRes2, depositRes3]);

            LOGGER.info("5. Vote 1 votes for with ETH collateral (including initial creator vote it will be 2) and 3 votes against with token collateral");
            const proposalByOtherAccount = proposal.connect(otherAccount);
            const res1 = voteOnProposalWithTokenCollateral(proposalByOtherAccount, false);

            const proposalByOtherAccount2 = proposal.connect(otherAccount2);
            const res2 = voteOnProposalWithTokenCollateral(proposalByOtherAccount2, false);

            const proposalByOtherAccount3 = proposal.connect(otherAccount3);
            const res3 = voteOnProposalWithTokenCollateral(proposalByOtherAccount3, false);

            const proposalByOtherAccount4 = proposal.connect(otherAccount4);
            const res4 = voteOnProposalWithCollateral(proposalByOtherAccount4, true, 1);

            await Promise.all([res1, res2, res3, res4]);

            await waitForProposalToEnd(proposal);

            LOGGER.info("6. Verify proposal is not passed and not executed");
            await checkProposalIsPassed(proposal, false);
            await checkProposalIsExecuted(proposal, false);

            LOGGER.info("7. Execute proposal");
            await expect(proposal.executeProposal()).to.be.revertedWith("Proposal did not pass");

            LOGGER.info("8. Get accounts balances before claiming reward");
            const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountBefore = await ethers.provider.getBalance(otherAccount.address);
            const balanceOfOtherAccount2Before = await ethers.provider.getBalance(otherAccount2.address);
            const balanceOfOtherAccount3Before = await ethers.provider.getBalance(otherAccount3.address);
            const balanceOfOtherAccount4Before = await ethers.provider.getBalance(otherAccount4.address);

            LOGGER.info("9. Claim rewards by all accounts (voters against should revert)");
            await expect(proposal.claimReward()).to.be.revertedWith("Reward not apply");
            await proposalByOtherAccount.claimReward();
            await proposalByOtherAccount2.claimReward();
            await proposalByOtherAccount3.claimReward();
            await expect(proposalByOtherAccount4.claimReward()).to.be.revertedWith("Reward not apply");

            LOGGER.info("10. Get accounts balances after claiming reward");
            const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountAfter = await ethers.provider.getBalance(otherAccount.address);
            const balanceOfOtherAccount2After = await ethers.provider.getBalance(otherAccount2.address);
            const balanceOfOtherAccount3After = await ethers.provider.getBalance(otherAccount3.address);
            const balanceOfOtherAccount4After = await ethers.provider.getBalance(otherAccount4.address);

            LOGGER.info("11. Expected against voters balance: 1/3 of 2 ETH = ~0.66666 ETH. For voters should get 0 and pay claim tx fee")
            expectBalanceNotChanged(balanceOfAccountBefore, balanceOfAccountAfter);
            expectBalanceDiffIsGte(balanceOfOtherAccountBefore, balanceOfOtherAccountAfter, 0.66);
            expectBalanceDiffIsGte(balanceOfOtherAccount2Before, balanceOfOtherAccount2After, 0.66);
            expectBalanceDiffIsGte(balanceOfOtherAccount3Before, balanceOfOtherAccount3After, 0.66);
            expectBalanceNotChanged(balanceOfOtherAccount4Before, balanceOfOtherAccount4After);

            LOGGER.info("12. Expected proposal balance is 0");
            const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
            expect(balanceOfProposal).to.be.eq(0);
        });

    });
});
