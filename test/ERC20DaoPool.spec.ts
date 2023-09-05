import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
  approveErc20,
  deployErc20Token,
  expectBalanceDiffIsGte,
  generateRandomIntNumberFrom1To100,
  generateRandomMerkleRoot,
  generateRandomProposalId,
  initializeErc20TokenAndDaoFixture,
  parseTokensUnits,
  transferERC20TokensToAddress,
  waitForProposalToEnd,
} from './utils/utils';
import { createErc20DaoPool, depositTokensToPool } from './utils/dao-pool-utils';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { createSendErc20Proposal } from './utils/proposal-utils';

const erc20DaoPoolFixture = async () => {
  const token = await deployErc20Token();
  const daoPool = await createErc20DaoPool(token);
  const account = (await ethers.getSigners())[0];
  return { token, daoPool, account };
};
network.provider.send('evm_setIntervalMining', [500]);
describe('ERC20DaoPool test', function () {
  describe('deposit', async function () {
    it('should revert deposit ERC-20 tokens when not approved', async function () {
      //given
      const { daoPool } = await loadFixture(erc20DaoPoolFixture);

      //when and then
      await expect(daoPool.deposit(1)).to.be.revertedWith('ERC20: insufficient allowance');
    });

    it('should deposit ERC-20 tokens to pool', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);
      await token.approve(daoPool.address, parseTokensUnits(1));
      expect(await token.balanceOf(daoPool.address)).to.eq(parseTokensUnits(0));
      expect(await daoPool.balanceOf(account.address)).to.eq(parseTokensUnits(0));

      //when
      await daoPool.deposit(parseTokensUnits(1));

      //then
      expect(await token.balanceOf(daoPool.address)).to.eq(parseTokensUnits(1));
      expect(await daoPool.balanceOf(account.address)).to.eq(parseTokensUnits(1));
    });

    it('should deposit multiple times ERC-20 tokens to pool', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);
      await token.approve(daoPool.address, parseTokensUnits(3));
      expect(await token.balanceOf(daoPool.address)).to.eq(parseTokensUnits(0));
      expect(await daoPool.balanceOf(account.address)).to.eq(parseTokensUnits(0));

      //when
      await daoPool.deposit(parseTokensUnits(1));
      await daoPool.deposit(parseTokensUnits(1));
      await daoPool.deposit(parseTokensUnits(1));

      //then
      expect(await token.balanceOf(daoPool.address)).to.eq(parseTokensUnits(3));
      expect(await daoPool.balanceOf(account.address)).to.eq(parseTokensUnits(3));
    });
  });

  describe('vote', async function () {
    it('should revert when proposal not approved', async function () {
      //given
      const { daoPool, account } = await loadFixture(erc20DaoPoolFixture);

      //when and then
      await expect(daoPool.vote(account.address, true)).to.be.revertedWith('Proposal not approved');
    });

    it('should vote for on proposal', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);
      const proposal = (await ethers.getSigners())[1];
      await token.approve(daoPool.address, parseTokensUnits(1));
      await daoPool.deposit(parseTokensUnits(1));
      await daoPool.approveProposal(proposal.address);

      //when
      const proposalDaoPool = daoPool.connect(proposal);
      await proposalDaoPool.vote(account.address, true);

      //then
      expect((await daoPool.getProposalForVoters(proposal.address)).length).to.eq(1);
      expect((await daoPool.getProposalForVoters(proposal.address))[0]).to.eq(account.address);
      expect(await daoPool.voterActiveProposals(account.address)).to.eq(1);
    });

    it('should vote against on proposal', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);
      const proposal = (await ethers.getSigners())[1];
      await token.approve(daoPool.address, parseTokensUnits(1));
      await daoPool.deposit(parseTokensUnits(1));
      await daoPool.approveProposal(proposal.address);

      //when
      const proposalDaoPool = daoPool.connect(proposal);
      await proposalDaoPool.vote(account.address, false);

      //then
      expect((await daoPool.getProposalAgainstVoters(proposal.address)).length).to.eq(1);
      expect((await daoPool.getProposalAgainstVoters(proposal.address))[0]).to.eq(account.address);
      expect(await daoPool.voterActiveProposals(account.address)).to.eq(1);
    });

    it('should revert when vote twice', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);
      const proposal = (await ethers.getSigners())[1];
      await token.approve(daoPool.address, parseTokensUnits(1));
      await daoPool.deposit(parseTokensUnits(1));
      await daoPool.approveProposal(proposal.address);
      const proposalDaoPool = daoPool.connect(proposal);
      await proposalDaoPool.vote(account.address, true);

      //when and then
      await expect(proposalDaoPool.vote(account.address, true)).to.revertedWith('Already voted');
      expect((await daoPool.getProposalForVoters(proposal.address)).length).to.eq(1);
      expect((await daoPool.getProposalForVoters(proposal.address))[0]).to.eq(account.address);
      expect(await daoPool.voterActiveProposals(account.address)).to.eq(1);
    });
  });
  describe('withdraw', async function () {
    it('should revert when user (msg.sender) has 0 tokens in pool', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);

      //when and then
      await expect(daoPool.withdraw(parseTokensUnits(1), account.address)).to.revertedWith('Insufficient balance');
    });

    it('should revert when withdraw token amount too big', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);
      await token.approve(daoPool.address, parseTokensUnits(10));
      await daoPool.deposit(parseTokensUnits(10));

      //when and then
      await expect(daoPool.withdraw(parseTokensUnits(11), account.address)).to.revertedWith('Insufficient balance');
    });

    it('should revert when user (msg.sender) votes in active proposals', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);
      const proposal = (await ethers.getSigners())[1];
      await token.approve(daoPool.address, parseTokensUnits(1));
      await daoPool.deposit(parseTokensUnits(1));
      await daoPool.approveProposal(proposal.address);
      const proposalDaoPool = daoPool.connect(proposal);
      await proposalDaoPool.vote(account.address, true);

      //when and then
      await expect(daoPool.withdraw(parseTokensUnits(1), account.address)).to.revertedWith('User has active proposals');
    });

    it('should withdraw some of user (msg.sender) tokens in pool', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);
      const proposal = (await ethers.getSigners())[1];
      await token.approve(daoPool.address, parseTokensUnits(10));
      await daoPool.deposit(parseTokensUnits(10));
      await daoPool.approveProposal(proposal.address);
      expect(await token.balanceOf(daoPool.address)).to.eq(parseTokensUnits(10));
      expect(await daoPool.balanceOf(account.address)).to.eq(parseTokensUnits(10));

      const accountTokensBalanceBefore = await token.balanceOf(account.address);

      //when
      await daoPool.withdraw(parseTokensUnits(3), account.address);

      //then
      expect(await token.balanceOf(daoPool.address)).to.eq(parseTokensUnits(7));
      expect(await daoPool.balanceOf(account.address)).to.eq(parseTokensUnits(7));
      const accountTokensBalanceAfter = await token.balanceOf(account.address);
      expect(accountTokensBalanceAfter.sub(accountTokensBalanceBefore)).to.eq(parseTokensUnits(3));
    });

    it('should withdraw all of user (msg.sender) when withdraw half of tokens twice ', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);
      const proposal = (await ethers.getSigners())[1];
      await token.approve(daoPool.address, parseTokensUnits(10));
      await daoPool.deposit(parseTokensUnits(10));
      await daoPool.approveProposal(proposal.address);
      expect(await token.balanceOf(daoPool.address)).to.eq(parseTokensUnits(10));
      expect(await daoPool.balanceOf(account.address)).to.eq(parseTokensUnits(10));

      const accountTokensBalanceBefore = await token.balanceOf(account.address);

      //when
      await daoPool.withdraw(parseTokensUnits(4), account.address);
      await daoPool.withdraw(parseTokensUnits(6), account.address);

      //then
      expect(await token.balanceOf(daoPool.address)).to.eq(parseTokensUnits(0));
      expect(await daoPool.balanceOf(account.address)).to.eq(parseTokensUnits(0));
      const accountTokensBalanceAfter = await token.balanceOf(account.address);
      expect(accountTokensBalanceAfter.sub(accountTokensBalanceBefore)).to.eq(parseTokensUnits(10));
    });
  });

  describe('resolveProposal', async function () {
    it('should revert when proposal not approved', async function () {
      //given
      const { daoPool, token, account } = await loadFixture(erc20DaoPoolFixture);

      //when and then
      //account.address as proposal address
      await expect(daoPool.resolveProposal(account.address)).to.revertedWith('Proposal not approved');
    });

    it('should revert when proposal not ended yet', async function () {
      //given
      const { token, dao, account, otherAccount, ERC20DaoPool } = await loadFixture(initializeErc20TokenAndDaoFixture);
      const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        generateRandomIntNumberFrom1To100(),
        '5'
      );

      //when and then
      await expect(ERC20DaoPool.resolveProposal(proposal.address)).to.revertedWith('Proposal not ended');
    });

    it('should resolve proposal without token votes', async function () {
      //given
      const { token, dao, account, otherAccount, ERC20DaoPool } = await loadFixture(initializeErc20TokenAndDaoFixture);
      const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        generateRandomIntNumberFrom1To100(),
        '5'
      );
      await waitForProposalToEnd(proposal);
      expect(await ERC20DaoPool.approvedProposals(proposal.address)).to.eq(true);

      //when
      await ERC20DaoPool.resolveProposal(proposal.address);

      //then
      expect((await ERC20DaoPool.getProposalForVoters(proposal.address)).length).to.eq(0);
      expect((await ERC20DaoPool.getProposalAgainstVoters(proposal.address)).length).to.eq(0);
      expect(await ERC20DaoPool.approvedProposals(proposal.address)).to.eq(false);
      expect(await ERC20DaoPool.voterActiveProposals(account.address)).to.eq(0);
      expect(await ERC20DaoPool.balanceOf(proposal.address)).to.eq(parseTokensUnits(0));
    });

    it('should resolve proposal with token vote for won side', async function () {
      //given
      const { token, dao, account, otherAccount, ERC20DaoPool } = await loadFixture(initializeErc20TokenAndDaoFixture);
      const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        generateRandomIntNumberFrom1To100(),
        '5'
      );
      await approveErc20(token, ERC20DaoPool.address, 100);
      await depositTokensToPool(ERC20DaoPool, 100);
      await proposal.voteWithToken(true);
      await waitForProposalToEnd(proposal);
      expect((await ERC20DaoPool.getProposalForVoters(proposal.address)).length).to.eq(1);
      expect((await ERC20DaoPool.getProposalAgainstVoters(proposal.address)).length).to.eq(0);
      expect(await ERC20DaoPool.approvedProposals(proposal.address)).to.eq(true);
      expect(await ERC20DaoPool.voterActiveProposals(account.address)).to.eq(1);
      expect(await ERC20DaoPool.balanceOf(account.address)).to.eq(parseTokensUnits(100));

      //when
      await ERC20DaoPool.resolveProposal(proposal.address);

      //then
      expect((await ERC20DaoPool.getProposalForVoters(proposal.address)).length).to.eq(0);
      expect((await ERC20DaoPool.getProposalAgainstVoters(proposal.address)).length).to.eq(0);
      expect(await ERC20DaoPool.approvedProposals(proposal.address)).to.eq(false);
      expect(await ERC20DaoPool.voterActiveProposals(account.address)).to.eq(0);
      expect(await ERC20DaoPool.balanceOf(account.address)).to.eq(parseTokensUnits(100));
    });

    it('should resolve proposal with token vote for lost side (voter loose everything)', async function () {
      //given
      const { token, dao, account, otherAccount, ERC20DaoPool } = await loadFixture(initializeErc20TokenAndDaoFixture);
      const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        generateRandomIntNumberFrom1To100(),
        '5'
      );
      await approveErc20(token, ERC20DaoPool.address, 300);
      await depositTokensToPool(ERC20DaoPool, 300);
      await proposal.voteWithToken(true);
      await transferERC20TokensToAddress(token, otherAccount.address, 200);
      const tokenByOtherAccount = token.connect(otherAccount);
      await approveErc20(tokenByOtherAccount, ERC20DaoPool.address, 200);
      const daoPoolByOtherAccount = ERC20DaoPool.connect(otherAccount);
      await depositTokensToPool(daoPoolByOtherAccount, 200);
      const proposalByOtherAccount = proposal.connect(otherAccount);
      await proposalByOtherAccount.voteWithToken(false);

      await waitForProposalToEnd(proposal);
      expect((await ERC20DaoPool.getProposalForVoters(proposal.address)).length).to.eq(1);
      expect((await ERC20DaoPool.getProposalAgainstVoters(proposal.address)).length).to.eq(1);
      expect(await ERC20DaoPool.approvedProposals(proposal.address)).to.eq(true);
      expect(await ERC20DaoPool.voterActiveProposals(account.address)).to.eq(1);
      expect(await ERC20DaoPool.voterActiveProposals(otherAccount.address)).to.eq(1);
      expect(await ERC20DaoPool.balanceOf(account.address)).to.eq(parseTokensUnits(300));
      expect(await ERC20DaoPool.balanceOf(otherAccount.address)).to.eq(parseTokensUnits(200));
      const tokensBalanceOfDaoBeforeResolveProposal = await token.balanceOf(dao.address);

      //when
      await ERC20DaoPool.resolveProposal(proposal.address);

      //then
      expect((await ERC20DaoPool.getProposalForVoters(proposal.address)).length).to.eq(0);
      expect((await ERC20DaoPool.getProposalAgainstVoters(proposal.address)).length).to.eq(0);
      expect(await ERC20DaoPool.approvedProposals(proposal.address)).to.eq(false);
      expect(await ERC20DaoPool.voterActiveProposals(account.address)).to.eq(0);
      expect(await ERC20DaoPool.voterActiveProposals(otherAccount.address)).to.eq(0);
      expect(await ERC20DaoPool.balanceOf(account.address)).to.eq(parseTokensUnits(300));
      expect(await ERC20DaoPool.balanceOf(otherAccount.address)).to.eq(parseTokensUnits(0));
      expect(await token.balanceOf(otherAccount.address)).to.eq(parseTokensUnits(0));
      // dao receives lost user tokens
      const tokensBalanceOfDaoAfterResolveProposal = await token.balanceOf(dao.address);
      expect(tokensBalanceOfDaoAfterResolveProposal.sub(tokensBalanceOfDaoBeforeResolveProposal)).to.eq(parseTokensUnits(200));
    });
  });
});
