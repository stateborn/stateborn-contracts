import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import {
    deployErc20Dao,
    deployNftToken,
    expectBalanceDiffIsGte,
    expectBalanceNotChanged,
    expectTokenBalanceToEq,
    generateRandomIntNumberFrom1To100,
    generateRandomMerkleRoot,
    generateRandomProposalId,
    initializeErc20TokenAndDaoFixture, sleep, transferERC20TokensToAddress,
    waitForProposalToEnd,
} from './utils/utils';
import {
    checkProposalIsExecuted,
    checkProposalIsPassed,
    createSendErc20Proposal, createSendEthCryptoProposal,
    createSendNftProposal,
    voteOnProposalWithCollateral
} from './utils/proposal-utils';
import { LOGGER } from './utils/pino-logger-service';
import { ERC721Development, Proposal } from '../typechain-types';
import { CHALLENGE_PERIOD_SECONDS } from './test-constants';

// SETUP for faster mining
network.provider.send('evm_setIntervalMining', [500]);

describe('Proposal scenarios', function () {
    const daoTokensBalance = 1000;

    describe('Proposal passed scenarios', function () {
        it('should pass with 1:0 (only creator vote)', async function () {
            const {token, dao, account, otherAccount} = await loadFixture(initializeErc20TokenAndDaoFixture);
            const tokenAddress = await token.getAddress();
            const daoAddress = await dao.getAddress();
            const tokenTransferAmount = generateRandomIntNumberFrom1To100();

            LOGGER.info('1. Create send ERC20 tokens proposal');
            const proposal = await createSendErc20Proposal(
                dao,
                tokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                tokenTransferAmount
            );
            const proposalAddress = await proposal.getAddress();

            await waitForProposalToEnd(proposal);

            LOGGER.info('2. Verify proposal is passed and not executed');
            await checkProposalIsPassed(proposal, true);
            await checkProposalIsExecuted(proposal, false);

            LOGGER.info('3. Verify accounts ERC20 token balances before executing proposal');
            await expectTokenBalanceToEq(token, daoAddress, daoTokensBalance);
            await expectTokenBalanceToEq(token, otherAccount.address, 0);

            LOGGER.info('4. Get accounts balances before claiming reward');
            const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);

            LOGGER.info('5. Execute proposal');
            await proposal.executeProposal();

            LOGGER.info('6. Verify proposal is executed');
            await checkProposalIsExecuted(proposal, true);

            LOGGER.info('7. Get accounts balances after claiming reward');
            const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);

            LOGGER.info('8. Verify accounts ERC20 token balances after executing proposal: DAO has less tokens, other account has more tokens');
            await expectTokenBalanceToEq(token, daoAddress, daoTokensBalance - Number(tokenTransferAmount));
            await expectTokenBalanceToEq(token, otherAccount.address, Number(tokenTransferAmount));

            LOGGER.info('9. Expect claim reward to revert since creator already received back collateral on execute');
            await expect(proposal.claimReward()).to.be.revertedWith('Reward not apply');

            LOGGER.info('10. Expected creator balance: 1 ETH collateral back (no reward)');
            expectBalanceDiffIsGte(balanceOfAccountBefore, balanceOfAccountAfter, 1);

            LOGGER.info('11. Expected proposal balance is 0');
            const balanceOfProposal = await ethers.provider.getBalance(proposalAddress);
            expect(balanceOfProposal).to.be.eq(0);
        });

        // this test covers correctness of NFT asset type DAO transfer tx
        it('should pass with 1:0 (only creator vote) - NFT transfer from DAO', async function () {
            const {dao, account, otherAccount} = await loadFixture(initializeErc20TokenAndDaoFixture);
            const nftToken = await deployNftToken();
            const nftTokenAddress = await nftToken.getAddress();
            const daoAddress = await dao.getAddress();
            await (nftToken as ERC721Development).createNFT(daoAddress, '');

            LOGGER.info('1. Create send ERC20 tokens proposal');
            const proposal = await createSendNftProposal(
                dao,
                nftTokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                1
            );
            const proposalAddress = await proposal.getAddress();

            await waitForProposalToEnd(proposal);

            LOGGER.info('2. Verify proposal is passed and not executed');
            await checkProposalIsPassed(proposal, true);
            await checkProposalIsExecuted(proposal, false);

            LOGGER.info('3. Verify accounts ERC20 token balances before executing proposal');
            expect(await nftToken.balanceOf(daoAddress)).to.eq(1);
            expect(await nftToken.balanceOf(otherAccount.address)).to.eq(0);

            LOGGER.info('4. Get accounts balances before claiming reward');
            const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);

            LOGGER.info('5. Execute proposal');
            await proposal.executeProposal();

            LOGGER.info('6. Verify proposal is executed');
            await checkProposalIsExecuted(proposal, true);

            LOGGER.info('7. Get accounts balances after claiming reward');
            const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);

            LOGGER.info('8. Verify accounts NFT token balances after executing proposal: DAO lost 1 NFT, other account has 1 new NFT');
            expect(await nftToken.balanceOf(daoAddress)).to.eq(0);
            expect(await nftToken.balanceOf(otherAccount.address)).to.eq(1);

            LOGGER.info('9. Expect claim reward to revert since creator already received back collateral on execute');
            await expect(proposal.claimReward()).to.be.revertedWith('Reward not apply');

            LOGGER.info('10. Expected creator balance: 1 ETH collateral back (no reward)');
            expectBalanceDiffIsGte(balanceOfAccountBefore, balanceOfAccountAfter, 1);

            LOGGER.info('11. Expected proposal balance is 0');
            const balanceOfProposal = await ethers.provider.getBalance(proposalAddress);
            expect(balanceOfProposal).to.be.eq(0);
        });

        // this test covers correctness of ETH asset type DAO transfer tx
        it('should pass with 1:0 (only creator vote) - ETH transfer from DAO', async function () {
            const {dao, account, otherAccount} = await loadFixture(initializeErc20TokenAndDaoFixture);
            const daoAddress = await dao.getAddress();
            // send 1 eth from account to dao
            await account.sendTransaction({
                to: daoAddress,
                value: ethers.parseEther('1')
            });
            LOGGER.info('1. Create send ERC20 tokens proposal');
            const proposal = await createSendEthCryptoProposal(
                dao,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                0.3
            );
            const proposalAddress = await proposal.getAddress();

            await waitForProposalToEnd(proposal);

            LOGGER.info('2. Verify proposal is passed and not executed');
            await checkProposalIsPassed(proposal, true);
            await checkProposalIsExecuted(proposal, false);

            LOGGER.info('3. Verify accounts ERC20 token balances before executing proposal');
            expect(await ethers.provider.getBalance(daoAddress)).to.eq(ethers.parseEther('1'));
            const balanceOfOtherAccountBefore = await ethers.provider.getBalance(otherAccount.address);

            LOGGER.info('4. Get accounts balances before executing proposal');
            const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);

            LOGGER.info('5. Execute proposal');
            await proposal.executeProposal();

            LOGGER.info('6. Get accounts balances after claiming reward');
            const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);

            LOGGER.info('7. Verify proposal is executed');
            await checkProposalIsExecuted(proposal, true);

            LOGGER.info('8. Verify ETH balances of DAO and other account after executing proposal: DAO has less ETH, other account has more ETH');
            expect(await ethers.provider.getBalance(daoAddress)).to.eq(ethers.parseEther('0.7'));
            const balanceOfOtherAccountAfter = await ethers.provider.getBalance(otherAccount.address);
            expect(balanceOfOtherAccountAfter - balanceOfOtherAccountBefore).to.eq(ethers.parseEther('0.3'));

            LOGGER.info('9. Expect claim reward to revert since creator already received back collateral on execute');
            await expect(proposal.claimReward()).to.be.revertedWith('Reward not apply');

            LOGGER.info('10. Expected creator balance: 1 ETH collateral back (no reward)');
            expectBalanceDiffIsGte(balanceOfAccountBefore, balanceOfAccountAfter, 1);

            LOGGER.info('11. Expected proposal balance is 0');
            const balanceOfProposal = await ethers.provider.getBalance(proposalAddress);
            expect(balanceOfProposal).to.be.eq(0);
        })


        it('should pass with 3:2 (3 votes for)', async function () {
            const {token, dao, account, otherAccount} = await loadFixture(initializeErc20TokenAndDaoFixture);
            const tokenAddress = await token.getAddress();
            const daoAddress = await dao.getAddress();
            const signers = await ethers.getSigners();
            const otherAccount2 = signers[2];
            const otherAccount3 = signers[3];
            const otherAccount4 = signers[4];

            const tokenTransferAmount = generateRandomIntNumberFrom1To100();

            LOGGER.info('1. Create send ERC20 tokens proposal');
            const proposal = await createSendErc20Proposal(
                dao,
                tokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                tokenTransferAmount
            );
            const proposalAddress = await proposal.getAddress();

            LOGGER.info('2. Vote 2 votes for (including initial creator vote it will be 3) and 2 votes against');
            const proposalByOtherAccount = proposal.connect(otherAccount);
            const res1 = voteOnProposalWithCollateral(proposalByOtherAccount, true, 1);

            const proposalByOtherAccount2 = proposal.connect(otherAccount2);
            const res2 = voteOnProposalWithCollateral(proposalByOtherAccount2, true, 1);

            const proposalByOtherAccount3 = proposal.connect(otherAccount3);
            const res3 = await voteOnProposalWithCollateral(proposalByOtherAccount3, false, 1);

            const proposalByOtherAccount4 = proposal.connect(otherAccount4);
            const res4 = voteOnProposalWithCollateral(proposalByOtherAccount4, false, 1);

            await Promise.all([res1, res2, res3, res4]);

            await waitForProposalToEnd(proposal);

            LOGGER.info('3. Verify proposal is passed and not executed');
            await checkProposalIsPassed(proposal, true);
            await checkProposalIsExecuted(proposal, false);

            LOGGER.info('4. Verify accounts ERC20 token balances before executing proposal');
            await expectTokenBalanceToEq(token, daoAddress, daoTokensBalance);
            await expectTokenBalanceToEq(token, otherAccount.address, 0);

            LOGGER.info('5. Execute proposal');
            await proposal.executeProposal();

            LOGGER.info('6. Verify proposal is executed');
            await checkProposalIsExecuted(proposal, true);

            LOGGER.info('7. Verify accounts ERC20 token balances after executing proposal: DAO has less tokens, other account has more tokens');
            await expectTokenBalanceToEq(token, daoAddress, daoTokensBalance - Number(tokenTransferAmount));
            await expectTokenBalanceToEq(token, otherAccount.address, Number(tokenTransferAmount));

            LOGGER.info('8. Get accounts balances before claiming reward');
            const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountBefore = await ethers.provider.getBalance(otherAccount.address);
            const balanceOfOtherAccount2Before = await ethers.provider.getBalance(otherAccount2.address);
            const balanceOfOtherAccount3Before = await ethers.provider.getBalance(otherAccount3.address);
            const balanceOfOtherAccount4Before = await ethers.provider.getBalance(otherAccount4.address);

            LOGGER.info('9. Claim rewards by all accounts (voters against should revert)');
            await proposal.claimReward();
            await proposalByOtherAccount.claimReward();
            await proposalByOtherAccount2.claimReward();
            await expect(proposalByOtherAccount3.claimReward()).to.be.revertedWith('Reward not apply');
            await expect(proposalByOtherAccount4.claimReward()).to.be.revertedWith('Reward not apply');

            LOGGER.info('10. Get accounts balances after claiming reward');
            const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountAfter = await ethers.provider.getBalance(otherAccount.address);
            const balanceOfOtherAccount2After = await ethers.provider.getBalance(otherAccount2.address);
            const balanceOfOtherAccount3After = await ethers.provider.getBalance(otherAccount3.address);
            const balanceOfOtherAccount4After = await ethers.provider.getBalance(otherAccount4.address);

            // 11. Expected for voting accounts: 1 ETH collateral back + 1/3 of 2 ETH back = ~1.66666 ETH
            LOGGER.info(
                '11. Expected for voters balance: 1 ETH collateral back + 1/3 of 2 ETH back = ~1.66666 ETH. Against voters should get 0 and pay claim tx fee'
            );
            expectBalanceDiffIsGte(balanceOfAccountBefore, balanceOfAccountAfter, 1.66);
            expectBalanceDiffIsGte(balanceOfOtherAccountBefore, balanceOfOtherAccountAfter, 1.66);
            expectBalanceDiffIsGte(balanceOfOtherAccount2Before, balanceOfOtherAccount2After, 1.66);
            expectBalanceNotChanged(balanceOfOtherAccount3Before, balanceOfOtherAccount3After);
            expectBalanceNotChanged(balanceOfOtherAccount4Before, balanceOfOtherAccount4After);

            LOGGER.info('12. Expected proposal balance is 0');
            const balanceOfProposal = await ethers.provider.getBalance(proposalAddress);
            expect(balanceOfProposal).to.be.eq(0);
        });
    });

    describe('Proposal not pass scenarios', function () {
        it('should not pass when 1:1 (creator vote and vote against)', async function () {
            const {token, dao, account, otherAccount} = await loadFixture(initializeErc20TokenAndDaoFixture);
            const tokenAddress = await token.getAddress();

            LOGGER.info('1. Create send ERC20 tokens proposal');
            const proposal = await createSendErc20Proposal(
                dao,
                tokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100()
            );
            const proposalAddress = await proposal.getAddress();

            LOGGER.info('2. Other account votes against');
            const proposalByOtherAccount: Proposal = proposal.connect(otherAccount) as Proposal;
            await voteOnProposalWithCollateral(proposalByOtherAccount, false, 1);

            await waitForProposalToEnd(proposal);

            LOGGER.info('3. Execute proposal should fail');
            await expect(proposal.executeProposal()).to.be.revertedWith('Proposal did not pass');

            LOGGER.info('4. Verify proposal is not passed and not executed');
            await checkProposalIsPassed(proposal, false);
            await checkProposalIsExecuted(proposal, false);

            LOGGER.info('5. Get accounts balances before claiming reward');
            const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountBefore = await ethers.provider.getBalance(otherAccount.address);

            LOGGER.info('6. Claim rewards by all accounts');
            await expect(proposal.claimReward()).to.be.revertedWith('Reward not apply');
            await proposalByOtherAccount.claimReward();

            LOGGER.info('7. Get accounts balances after claiming reward');
            const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountAfter = await ethers.provider.getBalance(otherAccount.address);

            LOGGER.info('8. Expected voter against balance: 1 ETH collateral back + 1 ETH reward = 2 ETH. Creator should get 0 and pay claim tx fee');
            expectBalanceNotChanged(balanceOfAccountBefore, balanceOfAccountAfter);
            expectBalanceDiffIsGte(balanceOfOtherAccountBefore, balanceOfOtherAccountAfter, 2);

            LOGGER.info('9. Expected proposal balance is 0');
            const balanceOfProposal = await ethers.provider.getBalance(proposalAddress);
            expect(balanceOfProposal).to.be.eq(0);
        });

        it('should not pass when 2:3 (3 votes against)', async function () {
            const {token, dao, account, otherAccount} = await loadFixture(initializeErc20TokenAndDaoFixture);
            const tokenAddress = await token.getAddress();

            const signers = await ethers.getSigners();
            const otherAccount2 = signers[2];
            const otherAccount3 = signers[3];
            const otherAccount4 = signers[4];

            LOGGER.info('1. Create send ERC20 tokens proposal');
            const proposal = await createSendErc20Proposal(
                dao,
                tokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100()
            );
            const proposalAddress = await proposal.getAddress();

            LOGGER.info('2. Vote 3 votes against and 1 for');
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

            LOGGER.info('3. Execute proposal');
            await expect(proposal.executeProposal()).to.be.revertedWith('Proposal did not pass');

            LOGGER.info('4. Verify proposal is not passed and not executed');
            await checkProposalIsPassed(proposal, false);
            await checkProposalIsExecuted(proposal, false);

            LOGGER.info('5. Get accounts balances before claiming reward');
            const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountBefore = await ethers.provider.getBalance(otherAccount.address);
            const balanceOfOtherAccount2Before = await ethers.provider.getBalance(otherAccount2.address);
            const balanceOfOtherAccount3Before = await ethers.provider.getBalance(otherAccount3.address);
            const balanceOfOtherAccount4Before = await ethers.provider.getBalance(otherAccount4.address);

            LOGGER.info('6. Claim rewards by all accounts');
            await expect(proposal.claimReward()).to.be.revertedWith('Reward not apply');
            await proposalByOtherAccount.claimReward();
            await proposalByOtherAccount2.claimReward();
            await proposalByOtherAccount3.claimReward();
            await expect(proposalByOtherAccount4.claimReward()).to.be.revertedWith('Reward not apply');

            LOGGER.info('7. Get accounts balances after claiming reward');
            const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);
            const balanceOfOtherAccountAfter = await ethers.provider.getBalance(otherAccount.address);
            const balanceOfOtherAccount2After = await ethers.provider.getBalance(otherAccount2.address);
            const balanceOfOtherAccount3After = await ethers.provider.getBalance(otherAccount3.address);
            const balanceOfOtherAccount4After = await ethers.provider.getBalance(otherAccount4.address);

            LOGGER.info(
                '8. Expected against voters balance: 1 ETH collateral back + 1/3 of 2 ETH back = ~1.66 ETH. For voters should get 0 and pay claim tx fee'
            );
            expectBalanceDiffIsGte(balanceOfOtherAccountBefore, balanceOfOtherAccountAfter, 1.66);
            expectBalanceDiffIsGte(balanceOfOtherAccount2Before, balanceOfOtherAccount2After, 1.66);
            expectBalanceDiffIsGte(balanceOfOtherAccount3Before, balanceOfOtherAccount3After, 1.66);
            expectBalanceNotChanged(balanceOfAccountBefore, balanceOfAccountAfter);
            expectBalanceNotChanged(balanceOfOtherAccount4Before, balanceOfOtherAccount4After);

            LOGGER.info('9. Expected proposal balance is 0');
            const balanceOfProposal = await ethers.provider.getBalance(proposalAddress);
            expect(balanceOfProposal).to.be.eq(0);
        });
    });


    describe('Proposal challenge period extension scenario', function () {
        it('should extend voting period when vote done in last voting hour', async function () {
            const {token, account, otherAccount} = await loadFixture(initializeErc20TokenAndDaoFixture);
            const tokenAddress = await token.getAddress();
            const extendChallengePeriodSeconds = 1000;
            const { dao, ERC20DaoPool } = await deployErc20Dao(tokenAddress, CHALLENGE_PERIOD_SECONDS, extendChallengePeriodSeconds);
            const daoAddress = await dao.getAddress();
            await transferERC20TokensToAddress(token, daoAddress, 1000);
            const tokenTransferAmount = generateRandomIntNumberFrom1To100();

            LOGGER.info('1. Create send ERC20 tokens proposal');
            const proposal = await createSendErc20Proposal(
                dao,
                tokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                tokenTransferAmount
            );

            LOGGER.info('2. Verify proposal is not yet ended');
            expect(await proposal.isEnded(), 'Expecting isEnded correct').to.be.false;
            expect(await proposal.challengePeriodSeconds(), 'Expecting challengePeriodSeconds correct').to.eq(CHALLENGE_PERIOD_SECONDS);

            LOGGER.info('3. Vote on proposal');
            await voteOnProposalWithCollateral(proposal, false, 1);

            LOGGER.info('4. Verify proposal challenge period seconds extended');
            expect(await proposal.isEnded(), 'Expecting isEnded correct').to.be.false;
            const challengePeriodAfterFirstVote = await proposal.challengePeriodSeconds();
            expect(challengePeriodAfterFirstVote, 'Expecting challengePeriodSeconds correct').to.eq(CHALLENGE_PERIOD_SECONDS + extendChallengePeriodSeconds);

            await sleep(CHALLENGE_PERIOD_SECONDS);
            LOGGER.info('5. Verify proposal not ended after sleeping initial challenge period seconds');
            expect(await proposal.isEnded(), 'Expecting isEnded correct').to.be.false;

            LOGGER.info('6. Vote on proposal again to verify voting is possible');
            await voteOnProposalWithCollateral(proposal, false, 1);

            LOGGER.info('7. Verify once again proposal challenge period seconds extended');
            expect(await proposal.isEnded(), 'Expecting isEnded correct').to.be.false;
            expect(await proposal.challengePeriodSeconds(), 'Expecting challengePeriodSeconds correct').to.eq(Number(challengePeriodAfterFirstVote) + extendChallengePeriodSeconds);
        });
    });
});
