import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import {
  deployNftToken,
  expectBalanceDiffIsGte,
  expectBalanceNotChanged,
  expectTokenBalanceToEq,
  generateRandomIntNumberFrom1To100,
  generateRandomMerkleRoot,
  generateRandomProposalId,
  initializeErc20TokenAndDaoFixture,
  waitForProposalToEnd,
} from './utils/utils';
import {
  checkProposalIsExecuted,
  checkProposalIsPassed,
  createSendErc20Proposal,
  createSendNftProposal,
  voteOnProposalWithCollateral
} from './utils/proposal-utils';
import { LOGGER } from './utils/pino-logger-service';
import { ERC721Development, Proposal } from '../typechain-types';
import { erc721 } from '../typechain-types/@openzeppelin/contracts/token';

// SETUP for faster mining
network.provider.send('evm_setIntervalMining', [500]);

describe('Proposal scenarios', function () {
  const daoTokensBalance = 1000;

  describe('Proposal passed scenarios', function () {
    it('should pass with 1:0 (only creator vote)', async function () {
      const { token, dao, account, otherAccount } = await loadFixture(initializeErc20TokenAndDaoFixture);

      const tokenTransferAmount = generateRandomIntNumberFrom1To100();

      LOGGER.info('1. Create send ERC20 tokens proposal');
      const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        tokenTransferAmount
      );

      await waitForProposalToEnd(proposal);

      LOGGER.info('2. Verify proposal is passed and not executed');
      await checkProposalIsPassed(proposal, true);
      await checkProposalIsExecuted(proposal, false);

      LOGGER.info('3. Verify accounts ERC20 token balances before executing proposal');
      await expectTokenBalanceToEq(token, dao.address, daoTokensBalance);
      await expectTokenBalanceToEq(token, otherAccount.address, 0);

      LOGGER.info('4. Execute proposal');
      await proposal.executeProposal();

      LOGGER.info('5. Verify proposal is executed');
      await checkProposalIsExecuted(proposal, true);

      LOGGER.info('6. Verify accounts ERC20 token balances after executing proposal: DAO has less tokens, other account has more tokens');
      await expectTokenBalanceToEq(token, dao.address, daoTokensBalance - Number(tokenTransferAmount));
      await expectTokenBalanceToEq(token, otherAccount.address, Number(tokenTransferAmount));

      LOGGER.info('7. Get accounts balances before claiming reward');
      const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);

      LOGGER.info('8. Claim rewards by all accounts');
      await proposal.claimReward();

      LOGGER.info('9. Get accounts balances after claiming reward');
      const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);

      LOGGER.info('10. Expected creator balance: 1 ETH collateral back (no reward)');
      expectBalanceDiffIsGte(balanceOfAccountBefore, balanceOfAccountAfter, 1);

      LOGGER.info('11. Expected proposal balance is 0');
      const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
      expect(balanceOfProposal).to.be.eq(0);
    });

    // this test covers correctness of NFT asset type DAO transfer tx
    it('should pass with 1:0 (only creator vote) - NFT transfer from DAO', async function () {
      const {  dao, account, otherAccount } = await loadFixture(initializeErc20TokenAndDaoFixture);
      const nftToken = await deployNftToken();
      await (nftToken as ERC721Development).createNFT(dao.address, '');

      LOGGER.info('1. Create send ERC20 tokens proposal');
      const proposal = await createSendNftProposal(
          dao,
          nftToken.address,
          generateRandomProposalId(),
          generateRandomMerkleRoot(),
          otherAccount.address,
          1
      );

      await waitForProposalToEnd(proposal);

      LOGGER.info('2. Verify proposal is passed and not executed');
      await checkProposalIsPassed(proposal, true);
      await checkProposalIsExecuted(proposal, false);

      LOGGER.info('3. Verify accounts ERC20 token balances before executing proposal');
      expect(await nftToken.balanceOf(dao.address)).to.eq(1);
      expect(await nftToken.balanceOf(otherAccount.address)).to.eq(0);

      LOGGER.info('4. Execute proposal');
      await proposal.executeProposal();

      LOGGER.info('5. Verify proposal is executed');
      await checkProposalIsExecuted(proposal, true);

      LOGGER.info('6. Verify accounts ERC20 token balances after executing proposal: DAO has less tokens, other account has more tokens');
      expect(await nftToken.balanceOf(dao.address)).to.eq(0);
      expect(await nftToken.balanceOf(otherAccount.address)).to.eq(1);

      LOGGER.info('7. Get accounts balances before claiming reward');
      const balanceOfAccountBefore = await ethers.provider.getBalance(account.address);

      LOGGER.info('8. Claim rewards by all accounts');
      await proposal.claimReward();

      LOGGER.info('9. Get accounts balances after claiming reward');
      const balanceOfAccountAfter = await ethers.provider.getBalance(account.address);

      LOGGER.info('10. Expected creator balance: 1 ETH collateral back (no reward)');
      expectBalanceDiffIsGte(balanceOfAccountBefore, balanceOfAccountAfter, 1);

      LOGGER.info('11. Expected proposal balance is 0');
      const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
      expect(balanceOfProposal).to.be.eq(0);
    });


    it('should pass with 3:2 (3 votes for)', async function () {
      const { token, dao, account, otherAccount } = await loadFixture(initializeErc20TokenAndDaoFixture);

      const signers = await ethers.getSigners();
      const otherAccount2 = signers[2];
      const otherAccount3 = signers[3];
      const otherAccount4 = signers[4];

      const tokenTransferAmount = generateRandomIntNumberFrom1To100();

      LOGGER.info('1. Create send ERC20 tokens proposal');
      const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        tokenTransferAmount
      );

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
      await expectTokenBalanceToEq(token, dao.address, daoTokensBalance);
      await expectTokenBalanceToEq(token, otherAccount.address, 0);

      LOGGER.info('5. Execute proposal');
      await proposal.executeProposal();

      LOGGER.info('6. Verify proposal is executed');
      await checkProposalIsExecuted(proposal, true);

      LOGGER.info('7. Verify accounts ERC20 token balances after executing proposal: DAO has less tokens, other account has more tokens');
      await expectTokenBalanceToEq(token, dao.address, daoTokensBalance - Number(tokenTransferAmount));
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
      const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
      expect(balanceOfProposal).to.be.eq(0);
    });
  });

  describe('Proposal not pass scenarios', function () {
    it('should not pass when 1:1 (creator vote and vote against)', async function () {
      const { token, dao, account, otherAccount } = await loadFixture(initializeErc20TokenAndDaoFixture);

      LOGGER.info('1. Create send ERC20 tokens proposal');
      const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        generateRandomIntNumberFrom1To100()
      );

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
      const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
      expect(balanceOfProposal).to.be.eq(0);
    });

    it('should not pass when 2:3 (3 votes against)', async function () {
      const { token, dao, account, otherAccount } = await loadFixture(initializeErc20TokenAndDaoFixture);

      const signers = await ethers.getSigners();
      const otherAccount2 = signers[2];
      const otherAccount3 = signers[3];
      const otherAccount4 = signers[4];

      LOGGER.info('1. Create send ERC20 tokens proposal');
      const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        generateRandomIntNumberFrom1To100()
      );

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
      const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
      expect(balanceOfProposal).to.be.eq(0);
    });
  });
});
