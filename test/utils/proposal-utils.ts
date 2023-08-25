import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { LOGGER } from './pino-logger-service';
import { expect } from 'chai';
import { DAO, Proposal } from '../../typechain-types';
import { ERC_20_DECIMALS } from '../test-constants';

export async function createSendErc20Proposal(
        dao: DAO,
        tokenAddress: string,
        proposalId: Uint8Array,
        merkleRootHex: string,
        tokenReceiverAddress: string,
        tokenTransferAmount: string,
        ethCollateral: string = "1"): Promise<Proposal> {
    const sendDaoTokensTx = encodeSendErc20TokensTx(dao, proposalId, tokenAddress, tokenReceiverAddress, tokenTransferAmount);
    return createSendErc20ProposalWithTokensTx(dao, proposalId, merkleRootHex, sendDaoTokensTx, ethCollateral);
}

export async function createSendErc20ProposalWithTokensTx(
        dao: DAO,
        proposalId: Uint8Array,
        merkleRootHex: string,
        sendDaoTokensTx: string,
        ethCollateral: string = "1"): Promise<Proposal> {
    const tx = await dao.createProposal(
        proposalId,
        merkleRootHex,
        [sendDaoTokensTx],
        {value: ethers.utils.parseEther(ethCollateral)});
    // @dev there was a problem with .on listener and it didn't work for multiple tests
    // @dev so i replaced it with this workaround of getting events from tx
    const result = await tx.wait();
    LOGGER.debug(`Created DAO proposal`);
    return (await ethers.getContractAt("Proposal", result.events[0].args.proposalAddress)) as Proposal;
}

export const encodeSendErc20TokensTx = (dao: DAO, proposalId: Uint8Array, tokenAddress: string, tokenReceiverAddress: string, tokenTransferAmount: string): string => {
    return dao.interface.encodeFunctionData("sendErc20", [
        proposalId,
        tokenAddress,
        tokenReceiverAddress,
        ethers.utils.parseUnits(tokenTransferAmount, ERC_20_DECIMALS),
    ]);
}

export const checkProposalIsPassed = async (proposal: Proposal, expectedResult: boolean): Promise<void> => {
    const isProposalPassed = await proposal.isPassed();
    expect(isProposalPassed, "Checking if proposal passed").to.equal(expectedResult);
}

export const checkProposalIsExecuted = async (proposal: Proposal, expectedResult: boolean): Promise<void> => {
    const isProposalExecuted = await proposal.executed();
    expect(isProposalExecuted, "Checking if proposal is executed").to.equal(expectedResult);
}

export const voteOnProposalWithCollateral = async (proposal: Proposal, vote: boolean, ethCollateralInt: number): Promise<void> => {
    LOGGER.debug(`Voting '${vote}' on proposal with collateral '${ethCollateralInt}'`);
    await proposal.vote(vote, {value: ethers.utils.parseEther(ethCollateralInt.toFixed(0))});
}

export const voteOnProposalWithTokenCollateral = async (proposal: Proposal, vote: boolean): Promise<void> => {
    LOGGER.debug(`Voting '${vote}' on proposal with ERC20 tokens collateral'`);
    await proposal.voteWithToken(vote);
}

export const expectProposalVoteResults = (vote: any, forVotes: number, againstVotes: number, forNativeCollateral: number, againstNativeCollateral: number) => {
    expect(vote.forVotes).to.eq(forVotes);
    expect(vote.againstVotes).to.eq(againstVotes);
    expect(vote.forNativeCollateral).to.eq(forNativeCollateral);
    expect(vote.againstNativeCollateral).to.eq(againstNativeCollateral);
}

