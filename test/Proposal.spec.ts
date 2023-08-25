import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
    deployDao, expectBalanceDiffIsGte, expectBalanceNotChanged,
    generateRandomIntNumberFrom1To100,
    generateRandomMerkleRoot,
    generateRandomProposalId,
    initializeErc20TokenAndDao,
    initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens, sleep, waitForProposalToEnd
} from './utils/utils';
import {
    createSendErc20Proposal,
    createSendErc20ProposalWithTokensTx,
    encodeSendErc20TokensTx, expectProposalVoteResults,
    voteOnProposalWithCollateral,
    voteOnProposalWithTokenCollateral
} from './utils/proposal-utils';
import { CHALLENGE_PERIOD_SECONDS, NATIVE_COLLATERAL, TOKEN_COLLATERAL } from './test-constants';
import { BigNumber } from 'ethers';

// SETUP for faster mining
network.provider.send("evm_setIntervalMining", [500]);

describe("Proposal test", function () {
    const daoTokensBalance = 1000;
    describe("creation", function () {
        it("should initialize correct ERC-20 proposal", async function () {
            //given
            const {token, dao, account, otherAccount, ERC20DAOPool } = await loadFixture(initializeErc20TokenAndDao);
            const tokenTransferAmount = generateRandomIntNumberFrom1To100();
            const proposalId = generateRandomProposalId()
            const proposalMerkleRootHex = generateRandomMerkleRoot();
            const sendDaoTokensTx  = encodeSendErc20TokensTx(dao, proposalId, token.address, otherAccount.address, tokenTransferAmount);

            //when
            const proposal = await createSendErc20ProposalWithTokensTx(
                dao,
                proposalId,
                proposalMerkleRootHex,
                sendDaoTokensTx
            );

            //then
            expect(await proposal.proposalMerkleRootHex(), "Expecting proposalMerkleRootHex correct").to.eq(proposalMerkleRootHex);
            expect(await proposal.sequencerAddress(), "Expecting sequencerAddress correct").to.eq(account.address);
            expect(await proposal.challengePeriodSeconds(), "Expecting challengePeriodSeconds correct").to.eq(CHALLENGE_PERIOD_SECONDS);
            expect(await proposal.nativeCollateral(), "Expecting nativeCollateral correct").to.eq(NATIVE_COLLATERAL);
            expect(await proposal.tokenCollateral(), "Expecting tokenCollateral correct").to.eq(TOKEN_COLLATERAL);
            expect((await proposal.getPayloads()).length, "Expecting getPayloads length correct").to.eq(1);
            expect((await proposal.getPayloads())[0], "Expecting getPayloads correct").to.eq(sendDaoTokensTx);
            expect(await proposal.daoAddress(), "Expecting daoAddress correct").to.eq(dao.address);
            expect(await proposal.daoPool(), "Expecting daoPool correct").to.eq(ERC20DAOPool.address);
            // it assumes block mining to be done ~3 second
            const nowInSeconds = Math.floor(new Date().getTime() / 1000);
            const oneSecondBeforeNow = BigNumber.from(nowInSeconds - 3);
            const oneSecondAfterNow = BigNumber.from(nowInSeconds + 3)
            const contractionCreationTime = await proposal.contractCreationTime();
            expect(contractionCreationTime, "Expecting contractCreationTime correct").to.be.gte(oneSecondBeforeNow);
            expect(contractionCreationTime, "Expecting contractCreationTime correct").to.be.lte(oneSecondAfterNow);
            expect(await proposal.forVotesCounter(), "Expecting forVotesCounter correct").to.eq(1);
            expect(await proposal.againstVotesCounter(), "Expecting againstVotesCounter correct").to.eq(0);
            expect(await proposal.executed(), "Expecting executed correct").to.be.false;
            expect(await proposal.isEnded(), "Expecting isEnded correct").to.be.false;
            expect(await proposal.isPassed(), "Expecting isPassed correct").to.be.false;
        });

        it("should create proposal with 5 ETH collateral", async function () {
            //given
            const { dao, token, account,  otherAccount }  = await loadFixture(initializeErc20TokenAndDao);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100(),
                "5");
            //when and then
            const vote = await proposal.votes(account.address);
            expectProposalVoteResults(vote, 5, 0, 0, 0);
        });

        it("should revert when creating proposal with 0 ETH collateral", async function () {
            const { dao }  = await loadFixture(initializeErc20TokenAndDao);
            await expect(dao.createProposal(generateRandomProposalId(), generateRandomMerkleRoot(), [])).to.be.revertedWith("Collateral too small");
        });

        it("should revert when creating proposal with too small collateral (0.1 ETH)", async function () {
            const { dao }  = await loadFixture(initializeErc20TokenAndDao);
            await expect(dao.createProposal(generateRandomProposalId(), generateRandomMerkleRoot(), [], {value: ethers.utils.parseEther("0.1")})).to.be.revertedWith("Collateral too small");
        });

        it("should revert when creating proposal with incorrect collateral (1.2 ETH - not multiplication of required collateral)", async function () {
            const { dao }  = await loadFixture(initializeErc20TokenAndDao);
            await expect(dao.createProposal(generateRandomProposalId(), generateRandomMerkleRoot(), [], {value: ethers.utils.parseEther("1.2")})).to.be.revertedWith("Collateral incorrect");
        });
    });

    describe("vote, voteWithToken", function () {

        it("should increment voter votes when vote for (5 ETH vote)", async function () {
            //given
            const { dao, token, account,  otherAccount }  = await loadFixture(initializeErc20TokenAndDao);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);

            //when
            await voteOnProposalWithCollateral(proposalByOtherAccount, true, 5);

            //then
            const vote = await proposal.votes(otherAccount.address);
            expectProposalVoteResults(vote, 5, 0, 0, 0);
            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("6"));
        });

        it("should increment voter votes when vote for 3 times (3x5 ETH vote)", async function () {
            //given
            const { dao, token, account,  otherAccount }  = await loadFixture(initializeErc20TokenAndDao);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);

            //when
            await voteOnProposalWithCollateral(proposalByOtherAccount, true, 5);
            await voteOnProposalWithCollateral(proposalByOtherAccount, true, 5);
            await voteOnProposalWithCollateral(proposalByOtherAccount, true, 5);

            //then
            const vote = await proposal.votes(otherAccount.address);
            expectProposalVoteResults(vote, 15, 0, 0, 0);
            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("16"));
        });

        it("should increment voter votes when vote against (5 ETH vote)", async function () {
            //given
            const { dao, token, account,  otherAccount }  = await loadFixture(initializeErc20TokenAndDao);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);

            //when
            await voteOnProposalWithCollateral(proposalByOtherAccount, false, 5);

            //then
            const vote = await proposal.votes(otherAccount.address);
            expectProposalVoteResults(vote, 0, 5, 0, 0);
            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("6"));
        });

        it("should set votes once when vote for with 500 token collateral 3 times (expecting 5 votes)", async function () {
            //given
            const { dao, token, account,  otherAccount, ERC20DAOPool }  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);

            //when
            await voteOnProposalWithTokenCollateral(proposalByOtherAccount, true);
            await voteOnProposalWithTokenCollateral(proposalByOtherAccount, true);
            await voteOnProposalWithTokenCollateral(proposalByOtherAccount, true);

            //then
            const vote = await proposal.votes(otherAccount.address);
            expectProposalVoteResults(vote, 0, 0, 5, 0);
            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("1"));
        });

        it("should increment voter votes when vote for with 500 token collateral (5 votes)", async function () {
            //given
            const { dao, token, account,  otherAccount, ERC20DAOPool }  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);

            //when
            await voteOnProposalWithTokenCollateral(proposalByOtherAccount, true);

            //then
            const vote = await proposal.votes(otherAccount.address);
            expectProposalVoteResults(vote, 0, 0, 5, 0);
            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("1"));
        });

        it("should increment voter votes when vote against with 500 token collateral (5 votes)", async function () {
            //given
            const { dao, token, account,  otherAccount, ERC20DAOPool }  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);

            //when
            await voteOnProposalWithTokenCollateral(proposalByOtherAccount, false);

            //then
            const vote = await proposal.votes(otherAccount.address);
            expectProposalVoteResults(vote, 0, 0, 0, 5);
            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("1"));
        });

        it("should increment voter votes when vote for and against (10 ETH votes total)", async function () {
            //given
            const { dao, token, account,  otherAccount }  = await loadFixture(initializeErc20TokenAndDao);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);

            //when
            await voteOnProposalWithCollateral(proposalByOtherAccount, true, 5);
            await voteOnProposalWithCollateral(proposalByOtherAccount, false, 5);

            //then
            const vote = await proposal.votes(otherAccount.address);
            expectProposalVoteResults(vote, 5, 5, 0, 0);
            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("11"));
        });

        it("should increment voter votes when vote for and against with 500 token collateral (10 votes total)", async function () {
            //given
            const { dao, token, account,  otherAccount, ERC20DAOPool }  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);

            //when
            await voteOnProposalWithTokenCollateral(proposalByOtherAccount, false);
            await voteOnProposalWithTokenCollateral(proposalByOtherAccount, true);

            //then
            const vote = await proposal.votes(otherAccount.address);
            expectProposalVoteResults(vote, 0, 0, 5, 5);
            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("1"));
        });

        it("should revert when vote with 1 ETH collateral after proposal challenge time ended", async function () {
            //given
            const { token, account,  otherAccount}  = await loadFixture(initializeErc20TokenAndDao);
            const {dao } = await deployDao(token.address, 1, NATIVE_COLLATERAL, TOKEN_COLLATERAL);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);
            await sleep(1000);

            //when and then
            await expect(voteOnProposalWithCollateral(proposalByOtherAccount, true, 1)).to.be.revertedWith("Is not in challenge period");
        });

        it("should revert when vote with 500 tokens collateral after proposal challenge time ended", async function () {
            //given
            const { token, account,  otherAccount}  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);
            const {dao } = await deployDao(token.address, 1, NATIVE_COLLATERAL, TOKEN_COLLATERAL);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);
            await sleep(1000);

            //when and then
            await expect(voteOnProposalWithTokenCollateral(proposalByOtherAccount, false)).to.be.revertedWith("Is not in challenge period");
        });
    });

    describe("claimReward", function () {
        it("should revert when claiming reward before proposal ended", async function () {
            //given
            const { dao, token, account,  otherAccount, ERC20DAOPool }  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());

            //when and then
            await expect(proposal.claimReward()).to.be.revertedWith("Is not after challenge period");
        });

        it("should revert when claiming reward when reward not apply", async function () {
            //given
            const { dao, token, account,  otherAccount, ERC20DAOPool }  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            const proposalByOtherAccount = proposal.connect(otherAccount);
            await waitForProposalToEnd(proposalByOtherAccount);

            //when and then
            await expect(proposalByOtherAccount.claimReward()).to.be.revertedWith("Reward not apply");
        });

        it("should reward proposal creator only once (when no voters)", async function () {
            //given
            const { dao, token, account,  otherAccount, ERC20DAOPool }  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());
            await waitForProposalToEnd(proposal);

            const creatorAddressBeforeClaim = await ethers.provider.getBalance(account.address);

            //when
            await proposal.claimReward();

            //then
            expect(proposal);
            expectBalanceDiffIsGte(creatorAddressBeforeClaim, await ethers.provider.getBalance(account.address), 1);
            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("0"));

            //when and then
            await expect(proposal.claimReward()).to.be.revertedWith("Reward not apply");
        });

        it("should reward challenger only once and not reward creator when 1:1", async function () {
            //given
            const { dao, token, account,  otherAccount, ERC20DAOPool }  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());

            const proposalByOtherAccount = proposal.connect(otherAccount);
            await voteOnProposalWithCollateral(proposalByOtherAccount, false, 2);
            await waitForProposalToEnd(proposal);

            const creatorBalanceBeforeClaim = await ethers.provider.getBalance(account.address);
            const otherAccountBalanceBeforeClaim = await ethers.provider.getBalance(otherAccount.address);

            //when and then
            await expect(proposal.claimReward()).to.be.revertedWith("Reward not apply");
            await proposalByOtherAccount.claimReward();

            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("0"));
            expectBalanceDiffIsGte(otherAccountBalanceBeforeClaim, await ethers.provider.getBalance(otherAccount.address), 3);
            expectBalanceNotChanged(creatorBalanceBeforeClaim, await ethers.provider.getBalance(account.address));

            await expect(proposal.claimReward()).to.be.revertedWith("Reward not apply");
            await expect(proposalByOtherAccount.claimReward()).to.be.revertedWith("Reward not apply");
        });

        it("should reward against voters only once and not for voters when 2:3 (3 votes against)", async function () {
            //given
            const { dao, token, account,  otherAccount, ERC20DAOPool }  = await loadFixture(initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens);

            const signers = await ethers.getSigners();
            const otherAccount2 = signers[2];
            const otherAccount3 = signers[3];
            const otherAccount4 = signers[4];
            const proposal = await createSendErc20Proposal(
                dao,
                token.address,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100());

            const proposalByOtherAccount = proposal.connect(otherAccount);
            const res1 = voteOnProposalWithCollateral(proposalByOtherAccount, true, 1);

            const proposalByOtherAccount2 = proposal.connect(otherAccount2);
            const res2 = voteOnProposalWithCollateral(proposalByOtherAccount2, false, 1);

            const proposalByOtherAccount3 = proposal.connect(otherAccount3);
            const res3 = await voteOnProposalWithCollateral(proposalByOtherAccount3, false, 1);

            const proposalByOtherAccount4 = proposal.connect(otherAccount4);
            const res4 = voteOnProposalWithCollateral(proposalByOtherAccount4, false, 1);

            await Promise.all([res1, res2, res3, res4]);

            await waitForProposalToEnd(proposal);

            const creatorBalanceBeforeClaim = await ethers.provider.getBalance(account.address);
            const otherAccountBalanceBeforeClaim = await ethers.provider.getBalance(otherAccount.address);
            const otherAccount2BalanceBeforeClaim = await ethers.provider.getBalance(otherAccount2.address);
            const otherAccount3BalanceBeforeClaim = await ethers.provider.getBalance(otherAccount3.address);
            const otherAccount4BalanceBeforeClaim = await ethers.provider.getBalance(otherAccount4.address);

            //when and then
            await expect(proposal.claimReward()).to.be.revertedWith("Reward not apply");
            await expect(proposalByOtherAccount.claimReward()).to.be.revertedWith("Reward not apply");
            await proposalByOtherAccount2.claimReward();
            await proposalByOtherAccount3.claimReward();
            await proposalByOtherAccount4.claimReward();

            expect(await ethers.provider.getBalance(proposal.address)).to.eq(ethers.utils.parseEther("0"));
            expectBalanceNotChanged(creatorBalanceBeforeClaim, await ethers.provider.getBalance(account.address));
            expectBalanceNotChanged(otherAccountBalanceBeforeClaim, await ethers.provider.getBalance(otherAccount.address));
            expectBalanceDiffIsGte(otherAccount2BalanceBeforeClaim, await ethers.provider.getBalance(otherAccount2.address), 1);
            expectBalanceDiffIsGte(otherAccount3BalanceBeforeClaim, await ethers.provider.getBalance(otherAccount3.address), 1);
            expectBalanceDiffIsGte(otherAccount4BalanceBeforeClaim, await ethers.provider.getBalance(otherAccount4.address), 1);

            await expect(proposal.claimReward()).to.be.revertedWith("Reward not apply");
            await expect(proposalByOtherAccount.claimReward()).to.be.revertedWith("Reward not apply");
            await expect(proposalByOtherAccount2.claimReward()).to.be.revertedWith("Reward not apply");
            await expect(proposalByOtherAccount3.claimReward()).to.be.revertedWith("Reward not apply");
            await expect(proposalByOtherAccount4.claimReward()).to.be.revertedWith("Reward not apply");
        });
    });
});
