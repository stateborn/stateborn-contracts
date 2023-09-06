import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import {
    deployNftToken,
    generateRandomIntNumberFrom1To100,
    generateRandomMerkleRoot,
    generateRandomProposalId,
    initializeErc20TokenAndDaoFixture,
    initializeNftTokenAndDaoFixture,
    mintNft,
    waitForProposalToEnd,
} from './utils/utils';
import { createNftDaoPool } from './utils/dao-pool-utils';
import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import { ERC721Development } from '../typechain-types';
import { createSendErc20Proposal } from './utils/proposal-utils';

const nftDaoPool = async () => {
    const token = await deployNftToken();
    const daoPool = await createNftDaoPool(token);
    const account = (await ethers.getSigners())[0];
    const devToken = token as ERC721Development;
    await mintNft(devToken, account.address);
    return {token, daoPool, account};
};
network.provider.send('evm_setIntervalMining', [500]);

describe('NFTDaoPool test', function () {
    describe('deposit', async function () {
        it('should revert deposit NFT tokens when invalid token id', async function () {
            //given
            const {daoPool} = await loadFixture(nftDaoPool);
            //when and then
            await expect(daoPool.deposit(1)).to.be.revertedWith('ERC721: caller is not token owner or approved');
        });

        it('should deposit NFT tokens to pool', async function () {
            //given
            const {daoPool, token, account} = await loadFixture(nftDaoPool);
            const daoPoolAddress = await daoPool.getAddress();
            await token.approve(daoPoolAddress, 1);
            expect(await token.balanceOf(account.address)).to.eq(1);
            expect(await token.balanceOf(daoPoolAddress)).to.eq(0);
            expect(await daoPool.balanceOf(account.address)).to.eq(0);

            //when
            await daoPool.deposit(1);

            //then
            expect(await token.balanceOf(account.address)).to.eq(0);
            expect(await token.balanceOf(daoPoolAddress)).to.eq(1);
            expect(await daoPool.balanceOf(account.address)).to.eq(1);
        });

        it('should deposit multiple times NFT tokens to pool', async function () {
            //given
            const {daoPool, token, account} = await loadFixture(nftDaoPool);
            const daoPoolAddress = await daoPool.getAddress();
            await mintNft(token as ERC721Development, account.address);
            await token.approve(daoPoolAddress, 1);
            await token.approve(daoPoolAddress, 2);
            expect(await token.balanceOf(account.address)).to.eq(2);
            expect(await token.balanceOf(daoPoolAddress)).to.eq(0);
            expect(await daoPool.balanceOf(account.address)).to.eq(0);

            //when
            await daoPool.deposit(1);
            await daoPool.deposit(2);

            //then
            expect(await token.balanceOf(account.address)).to.eq(0);
            expect(await token.balanceOf(daoPoolAddress)).to.eq(2);
            expect(await daoPool.balanceOf(account.address)).to.eq(2);
        });
    });

    describe('vote', async function () {
        it('should revert when proposal not approved', async function () {
            //given
            const {daoPool, token, account} = await loadFixture(nftDaoPool);

            //when and then
            await expect(daoPool.vote(account.address, true)).to.be.revertedWith('Proposal not approved');
        });

        it('should vote for on proposal', async function () {
            //given
            const {daoPool, token, account} = await loadFixture(nftDaoPool);
            const daoPoolAddress = await daoPool.getAddress();
            const proposal = (await ethers.getSigners())[1];
            await token.approve(daoPoolAddress, 1);
            await daoPool.deposit(1);
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
            const {daoPool, token, account} = await loadFixture(nftDaoPool);
            const proposal = (await ethers.getSigners())[1];
            const daoPoolAddress = await daoPool.getAddress();
            await token.approve(daoPoolAddress, 1);
            await daoPool.deposit(1);
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
            const {daoPool, token, account} = await loadFixture(nftDaoPool);
            const proposal = (await ethers.getSigners())[1];
            const daoPoolAddress = await daoPool.getAddress();
            await token.approve(daoPoolAddress, 1);
            await daoPool.deposit(1);
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
            const {daoPool, token, account} = await loadFixture(nftDaoPool);

            //when and then
            await expect(daoPool.withdraw(1, account.address)).to.revertedWith('Token not found');
        });

        it('should revert when user (msg.sender) doesnt own given token ID', async function () {
            //given
            const {daoPool, token, account} = await loadFixture(nftDaoPool);
            const daoPoolAddress = await daoPool.getAddress();
            await token.approve(daoPoolAddress, 1);
            await daoPool.deposit(1);

            //when and then
            await expect(daoPool.withdraw(2, account.address)).to.revertedWith('Token not found');
        });

        it('should revert when user (msg.sender) votes in active proposals', async function () {
            //given
            const {daoPool, token, account} = await loadFixture(nftDaoPool);
            const proposal = (await ethers.getSigners())[1];
            const daoPoolAddress = await daoPool.getAddress();
            await token.approve(daoPoolAddress, 1);
            await daoPool.deposit(1);
            await daoPool.approveProposal(proposal.address);
            const proposalDaoPool = daoPool.connect(proposal);
            await proposalDaoPool.vote(account.address, true);

            //when and then
            await expect(daoPool.withdraw(1, account.address)).to.revertedWith('User has active proposals');
        });

        it('should withdraw some of user (msg.sender) tokens in pool', async function () {
            //given
            const {daoPool, token, account} = await loadFixture(nftDaoPool);
            await mintNft(token as ERC721Development, account.address);
            const daoPoolAddress = await daoPool.getAddress();
            const proposal = (await ethers.getSigners())[1];
            await token.approve(daoPoolAddress, 1);
            await token.approve(daoPoolAddress, 2);
            await daoPool.deposit(1);
            await daoPool.deposit(2);
            await daoPool.approveProposal(proposal.address);
            expect(await token.balanceOf(daoPoolAddress)).to.eq(2);
            expect(await daoPool.balanceOf(account.address)).to.eq(2);

            const accountTokensBalanceBefore = await token.balanceOf(account.address);

            //when
            await daoPool.withdraw(1, account.address);

            //then
            expect(await token.balanceOf(daoPoolAddress)).to.eq(1);
            expect(await daoPool.balanceOf(account.address)).to.eq(1);
            const accountTokensBalanceAfter = await token.balanceOf(account.address);
            expect(accountTokensBalanceAfter - accountTokensBalanceBefore).to.eq(1);
        });

        it('should withdraw 2 of user (msg.sender) when withdraw 2 times', async function () {
            //given
            const {daoPool, token, account} = await loadFixture(nftDaoPool);
            const daoPoolAddress = await daoPool.getAddress();
            await mintNft(token as ERC721Development, account.address);
            const proposal = (await ethers.getSigners())[1];
            await token.approve(daoPoolAddress, 1);
            await token.approve(daoPoolAddress, 2);
            await daoPool.deposit(1);
            await daoPool.deposit(2);
            await daoPool.approveProposal(proposal.address);
            expect(await token.balanceOf(daoPoolAddress)).to.eq(2);
            expect(await daoPool.balanceOf(account.address)).to.eq(2);

            const accountTokensBalanceBefore = await token.balanceOf(account.address);

            //when
            await daoPool.withdraw(1, account.address);
            await daoPool.withdraw(2, account.address);

            //then
            expect(await token.balanceOf(daoPoolAddress)).to.eq(0);
            expect(await daoPool.balanceOf(account.address)).to.eq(0);
            const accountTokensBalanceAfter = await token.balanceOf(account.address);
            expect(accountTokensBalanceAfter - accountTokensBalanceBefore).to.eq(2);
        });
    });

    describe('resolveProposal', async function () {
        it('should revert when proposal not approved', async function () {
            //given
            const {daoPool, token, account} = await loadFixture(nftDaoPool);

            //when and then
            //account.address as proposal address
            await expect(daoPool.resolveProposal(account.address)).to.revertedWith('Proposal not approved');
        });

        it('should revert when proposal not ended yet', async function () {
            //given
            const {token, dao, account, otherAccount, NFTDaoPool} = await loadFixture(initializeNftTokenAndDaoFixture);
            const tokenAddress = await token.getAddress();
            const proposal = await createSendErc20Proposal(
                dao,
                tokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100(),
                '5'
            );

            //when and then
            const proposalAddress = await proposal.getAddress();
            await expect(NFTDaoPool.resolveProposal(proposalAddress)).to.revertedWith('Proposal not ended');
        });

        it('should resolve proposal without token votes', async function () {
            //given
            const {token, dao, account, otherAccount, NFTDaoPool} = await loadFixture(initializeNftTokenAndDaoFixture);
            const tokenAddress = await token.getAddress();
            const proposal = await createSendErc20Proposal(
                dao,
                tokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100(),
                '5'
            );
            await waitForProposalToEnd(proposal);
            const proposalAddress = await proposal.getAddress();
            expect(await NFTDaoPool.approvedProposals(proposalAddress)).to.eq(true);

            //when
            await NFTDaoPool.resolveProposal(proposalAddress);

            //then
            expect((await NFTDaoPool.getProposalForVoters(proposalAddress)).length).to.eq(0);
            expect((await NFTDaoPool.getProposalAgainstVoters(proposalAddress)).length).to.eq(0);
            expect(await NFTDaoPool.approvedProposals(proposalAddress)).to.eq(false);
            expect(await NFTDaoPool.voterActiveProposals(account.address)).to.eq(0);
            expect(await NFTDaoPool.balanceOf(proposalAddress)).to.eq(0);
        });

        it('should resolve proposal with token vote for won side', async function () {
            //given
            const {token, dao, account, otherAccount, NFTDaoPool} = await loadFixture(initializeNftTokenAndDaoFixture);
            const tokenAddress = await token.getAddress();
            const nftDaoPoolAddress = await NFTDaoPool.getAddress();
            const proposal = await createSendErc20Proposal(
                dao,
                tokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100(),
                '5'
            );
            await mintNft(token as ERC721Development, account.address);
            await token.approve(nftDaoPoolAddress, 1);
            await NFTDaoPool.deposit(1);
            await proposal.voteWithToken(true);
            await waitForProposalToEnd(proposal);
            const proposalAddress = await proposal.getAddress();

            expect((await NFTDaoPool.getProposalForVoters(proposalAddress)).length).to.eq(1);
            expect((await NFTDaoPool.getProposalAgainstVoters(proposalAddress)).length).to.eq(0);
            expect(await NFTDaoPool.approvedProposals(proposalAddress)).to.eq(true);
            expect(await NFTDaoPool.voterActiveProposals(account.address)).to.eq(1);
            expect(await NFTDaoPool.balanceOf(account.address)).to.eq(1);

            //when
            await NFTDaoPool.resolveProposal(proposalAddress);

            //then
            expect((await NFTDaoPool.getProposalForVoters(proposalAddress)).length).to.eq(0);
            expect((await NFTDaoPool.getProposalAgainstVoters(proposalAddress)).length).to.eq(0);
            expect(await NFTDaoPool.approvedProposals(proposalAddress)).to.eq(false);
            expect(await NFTDaoPool.voterActiveProposals(account.address)).to.eq(0);
            expect(await NFTDaoPool.balanceOf(account.address)).to.eq(1);
        });

        it('should resolve proposal with token vote for lost side (voter loose everything)', async function () {
            //given
            const {token, dao, account, otherAccount, NFTDaoPool} = await loadFixture(initializeNftTokenAndDaoFixture);
            const tokenAddress = await token.getAddress();
            const proposal = await createSendErc20Proposal(
                dao,
                tokenAddress,
                generateRandomProposalId(),
                generateRandomMerkleRoot(),
                otherAccount.address,
                generateRandomIntNumberFrom1To100(),
                '5'
            );
            await mintNft(token as ERC721Development, account.address);
            const nftDaoPoolAddress = await NFTDaoPool.getAddress();
            await token.approve(nftDaoPoolAddress, 1);
            await NFTDaoPool.deposit(1);
            await proposal.voteWithToken(true);

            const tokenByOtherAccount = token.connect(otherAccount);
            await mintNft(tokenByOtherAccount as ERC721Development, otherAccount.address);
            await tokenByOtherAccount.approve(nftDaoPoolAddress, 2);
            const daoPoolByOtherAccount = NFTDaoPool.connect(otherAccount);
            await daoPoolByOtherAccount.deposit(2);
            const proposalByOtherAccount = proposal.connect(otherAccount);
            await proposalByOtherAccount.voteWithToken(false);

            await waitForProposalToEnd(proposal);
            const proposalAddress = await proposal.getAddress();
            expect((await NFTDaoPool.getProposalForVoters(proposalAddress)).length).to.eq(1);
            expect((await NFTDaoPool.getProposalAgainstVoters(proposalAddress)).length).to.eq(1);
            expect(await NFTDaoPool.approvedProposals(proposalAddress)).to.eq(true);
            expect(await NFTDaoPool.voterActiveProposals(account.address)).to.eq(1);
            expect(await NFTDaoPool.voterActiveProposals(otherAccount.address)).to.eq(1);
            expect(await NFTDaoPool.balanceOf(account.address)).to.eq(1);
            expect(await NFTDaoPool.balanceOf(otherAccount.address)).to.eq(1);
            const daoAddress = await dao.getAddress();
            const tokensBalanceOfDaoBeforeResolveProposal = await token.balanceOf(daoAddress);

            //when
            await NFTDaoPool.resolveProposal(proposalAddress);

            //then
            expect((await NFTDaoPool.getProposalForVoters(proposalAddress)).length).to.eq(0);
            expect((await NFTDaoPool.getProposalAgainstVoters(proposalAddress)).length).to.eq(0);
            expect(await NFTDaoPool.approvedProposals(proposalAddress)).to.eq(false);
            expect(await NFTDaoPool.voterActiveProposals(account.address)).to.eq(0);
            expect(await NFTDaoPool.voterActiveProposals(otherAccount.address)).to.eq(0);
            expect(await NFTDaoPool.balanceOf(account.address)).to.eq(1);
            expect(await NFTDaoPool.balanceOf(otherAccount.address)).to.eq(0);
            expect(await token.balanceOf(otherAccount.address)).to.eq(0);
            // dao receives lost user tokens
            const tokensBalanceOfDaoAfterResolveProposal = await token.balanceOf(daoAddress);
            expect(tokensBalanceOfDaoAfterResolveProposal - tokensBalanceOfDaoBeforeResolveProposal).to.eq(1);
        });
    });
});
