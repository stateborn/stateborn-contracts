import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  deployDao,
  deployErc20Token, generateRandomIntNumberFrom1To100,
  generateRandomMerkleRoot,
  generateRandomProposalId, initializeErc20TokenAndDao, sleep,
  transferERC20TokensToDao, waitForProposalToEnd
} from './utils/utils';
import {
  checkProposalIsEnded,
  checkProposalIsExecuted,
  checkProposalIsPassed,
  createSendErc20Proposal, voteOnProposalWithCollateral
} from './utils/proposal-utils';
import { LOGGER } from './utils/pino-logger-service';

// SETUP for faster mining
network.provider.send("evm_setIntervalMining", [500]);

describe("Proposal passed scenarios", function () {

  const daoTokensBalance = 1000;
  const tokenDecimals = 18;

  it("should pass with 1:0 (only creator vote)", async function () {
    const {token, dao, owner, otherAccount } = await loadFixture(initializeErc20TokenAndDao);

    const tokenTransferAmount = generateRandomIntNumberFrom1To100();

    // 1. Create send ERC20 tokens proposal
    const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        tokenTransferAmount);
    dao.removeAllListeners('ProposalCreated');

    await waitForProposalToEnd(proposal);

    // 2. Verify proposal state
    await checkProposalIsPassed(proposal, true);
    await checkProposalIsExecuted(proposal, false);

    // 3. Verify balances of other account and DAO before executing proposal
    const balanceOfOtherAccountBefore = await token.balanceOf(otherAccount.address);
    const balanceOfDaoAccountBefore = await token.balanceOf(dao.address);
    expect(String(balanceOfOtherAccountBefore)).to.be.eq("0");
    expect(String(balanceOfDaoAccountBefore)).to.be.eq(ethers.utils.parseUnits((daoTokensBalance).toString(), tokenDecimals).toString());

    // 4. Execute proposal
    await proposal.executeProposal();

    // 4. Verify proposal executed state
    await checkProposalIsExecuted(proposal, true);

    // 6. Verify balances of other account and DAO after executing proposal: other account should receive tokens, DAO should lose tokens
    const balanceOfOtherAccountAfter = await token.balanceOf(otherAccount.address);
    const balanceOfDaoAfter = await token.balanceOf(dao.address);
    expect(String(balanceOfOtherAccountAfter)).to.be.eq(ethers.utils.parseUnits(tokenTransferAmount, tokenDecimals).toString());
    expect(String(balanceOfDaoAfter)).to.be.eq(ethers.utils.parseUnits((daoTokensBalance - Number(tokenTransferAmount)).toString(), tokenDecimals).toString());
  });

  it("should pass with 3:2 (only creator vote)", async function () {
    const {token, dao, owner, otherAccount } = await loadFixture(initializeErc20TokenAndDao);

    const signers = await ethers.getSigners();
    const otherAccount2 = signers[2];
    const otherAccount3 = signers[3];
    const otherAccount4 = signers[4];

    const tokenTransferAmount = generateRandomIntNumberFrom1To100();

    // 1. Create send ERC20 tokens proposal
    const proposal = await createSendErc20Proposal(
        dao,
        token.address,
        generateRandomProposalId(),
        generateRandomMerkleRoot(),
        otherAccount.address,
        tokenTransferAmount);

    // 2. Vote 2 votes for (including initial creator vote it will be 3) and 2 votes against
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

    // 3. Verify proposal state
    await checkProposalIsPassed(proposal, true);
    await checkProposalIsExecuted(proposal, false);

    // 4. Verify balances of other account and DAO before executing proposal
    const tokenBalanceOfOtherAccountBefore = await token.balanceOf(otherAccount.address);
    const tokenBalanceOfDaoAccountBefore = await token.balanceOf(dao.address);
    expect(String(tokenBalanceOfOtherAccountBefore)).to.be.eq("0");
    expect(String(tokenBalanceOfDaoAccountBefore)).to.be.eq(ethers.utils.parseUnits((daoTokensBalance).toString(), tokenDecimals).toString());

    // 5. Execute proposal
    await proposal.executeProposal();

    // 6. Verify proposal executed state
    await checkProposalIsExecuted(proposal, true);

    // 7. Verify balances of other account and DAO after executing proposal: other account should receive tokens, DAO should lose tokens
    const tokenBalanceOfOtherAccountAfter = await token.balanceOf(otherAccount.address);
    const tokenBalanceOfDaoAfter = await token.balanceOf(dao.address);
    expect(String(tokenBalanceOfOtherAccountAfter)).to.be.eq(ethers.utils.parseUnits(tokenTransferAmount, tokenDecimals).toString());
    expect(String(tokenBalanceOfDaoAfter)).to.be.eq(ethers.utils.parseUnits((daoTokensBalance - Number(tokenTransferAmount)).toString(), tokenDecimals).toString());

    // 8. Get ETH balance of all accounts before claiming reward
    const balanceOfAccountBefore = await ethers.provider.getBalance(owner.address);
    const balanceOfOtherAccountBefore = await ethers.provider.getBalance(otherAccount.address);
    const balanceOfOtherAccount2Before = await ethers.provider.getBalance(otherAccount2.address);
    const balanceOfOtherAccount3Before = await ethers.provider.getBalance(otherAccount3.address);
    const balanceOfOtherAccount4Before = await ethers.provider.getBalance(otherAccount4.address);

    // 9. Claim rewards
    await proposal.claimReward();
    await proposalByOtherAccount.claimReward();
    await proposalByOtherAccount2.claimReward();
    expect(proposalByOtherAccount3.claimReward()).to.be.revertedWith("Reward does not apply");
    expect(proposalByOtherAccount4.claimReward()).to.be.revertedWith("Reward does not apply");

    // 10. Get ETH balance of all accounts after claiming reward
    const balanceOfAccountAfter = await ethers.provider.getBalance(owner.address);
    const balanceOfOtherAccountAfter = await ethers.provider.getBalance(otherAccount.address);
    const balanceOfOtherAccount2After = await ethers.provider.getBalance(otherAccount2.address);
    const balanceOfOtherAccount3After = await ethers.provider.getBalance(otherAccount3.address);
    const balanceOfOtherAccount4After = await ethers.provider.getBalance(otherAccount4.address);

    // 11. Expected for voting accounts: 1 ETH collateral back + 1/3 of 2 ETH back = ~1.66666 ETH. Lost account gets zero but pays tx cost for claim (reverted), so diff < 0.1
    expect(Number(Number(ethers.utils.formatEther(balanceOfAccountAfter.sub(balanceOfAccountBefore).toString())).toFixed(2))).to.be.gte(1.66);
    expect(Number(Number(ethers.utils.formatEther(balanceOfOtherAccountAfter.sub(balanceOfOtherAccountBefore).toString())).toFixed(2))).to.be.gte(1.66);
    expect(Number(Number(ethers.utils.formatEther(balanceOfOtherAccount2After.sub(balanceOfOtherAccount2Before).toString())).toFixed(2))).to.be.gte(1.66);
    expect(Number(Number(ethers.utils.formatEther(balanceOfOtherAccount3After.sub(balanceOfOtherAccount3Before).toString())).toFixed(2))).to.be.lt(0.1);
    expect(Number(Number(ethers.utils.formatEther(balanceOfOtherAccount4After.sub(balanceOfOtherAccount4Before).toString())).toFixed(2))).to.be.lt(0.1);

    // 12. Expected proposal balance is 0
    const balanceOfProposal = await ethers.provider.getBalance(proposal.address);
    expect(balanceOfProposal).to.be.eq(0);
  });

});
