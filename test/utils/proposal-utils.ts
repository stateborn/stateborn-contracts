import { ethers } from 'hardhat';
import { LOGGER } from './pino-logger-service';
import { expect } from 'chai';
import { Dao, Proposal } from '../../typechain-types';
import { ERC_20_DECIMALS } from '../test-constants';

export async function createSendErc20Proposal(
  dao: Dao,
  tokenAddress: string,
  proposalId: Uint8Array,
  merkleRootHex: string,
  tokenReceiverAddress: string,
  tokenTransferAmount: string,
  ethCollateral: string = '1'
): Promise<Proposal> {
  const sendDaoTokensTx = encodeSendErc20TokensTx(dao, proposalId, tokenAddress, tokenReceiverAddress, tokenTransferAmount);
  return createProposalWithTokensTx(dao, proposalId, merkleRootHex, sendDaoTokensTx, ethCollateral);
}

export async function createSendNftProposal(
    dao: Dao,
    tokenAddress: string,
    proposalId: Uint8Array,
    merkleRootHex: string,
    tokenReceiverAddress: string,
    tokenId: number,
    ethCollateral: string = '1'
): Promise<Proposal> {
  const sendDaoTokensTx = encodeSendNftTokenTx(dao, proposalId, tokenAddress, tokenReceiverAddress, tokenId);
  return createProposalWithTokensTx(dao, proposalId, merkleRootHex, sendDaoTokensTx, ethCollateral);
}


export async function createProposalWithTokensTx(
  dao: Dao,
  proposalId: Uint8Array,
  merkleRootHex: string,
  sendDaoTokensTx: string,
  ethCollateralToSendToProposal: string = '1'
): Promise<Proposal> {
  const tx = await dao.createProposal(proposalId, merkleRootHex, [sendDaoTokensTx], {
    value: ethers.utils.parseEther(ethCollateralToSendToProposal),
  });
  // @dev there was a problem with .on listener and it didn't work for multiple tests
  // @dev so i replaced it with this workaround of getting events from tx
  const result = await tx.wait();
  LOGGER.debug(`Created DAO proposal`);
  return (await ethers.getContractAt('Proposal', result.events[0].args.proposalAddress)) as Proposal;
}


export const encodeSendErc20TokensTx = (
  dao: Dao,
  proposalId: Uint8Array,
  tokenAddress: string,
  tokenReceiverAddress: string,
  tokenTransferAmount: string
): string => {
  return dao.interface.encodeFunctionData('sendErc20', [
    proposalId,
    tokenAddress,
    tokenReceiverAddress,
    ethers.utils.parseUnits(tokenTransferAmount, ERC_20_DECIMALS),
  ]);
};

export const encodeSendNftTokenTx = (
    dao: Dao,
    proposalId: Uint8Array,
    tokenAddress: string,
    tokenReceiverAddress: string,
    tokenId: number
): string => {
  return dao.interface.encodeFunctionData('sendNft', [
    proposalId,
    tokenAddress,
    tokenReceiverAddress,
    tokenId,
  ]);
};


export const checkProposalIsPassed = async (proposal: Proposal, expectedResult: boolean): Promise<void> => {
  const isProposalPassed = await proposal.isPassed();
  expect(isProposalPassed, 'Checking if proposal passed').to.equal(expectedResult);
};

export const checkProposalIsExecuted = async (proposal: Proposal, expectedResult: boolean): Promise<void> => {
  const isProposalExecuted = await proposal.executed();
  expect(isProposalExecuted, 'Checking if proposal is executed').to.equal(expectedResult);
};

export const voteOnProposalWithCollateral = async (proposal: Proposal, vote: boolean, ethCollateralInt: number): Promise<void> => {
  LOGGER.debug(`Voting '${vote}' on proposal with collateral '${ethCollateralInt}'`);
  await proposal.vote(vote, {
    value: ethers.utils.parseEther(ethCollateralInt.toFixed(0)),
  });
};

export const voteOnProposalWithTokenCollateral = async (proposal: Proposal, vote: boolean): Promise<void> => {
  LOGGER.debug(`Voting '${vote}' on proposal with ERC20 tokens collateral'`);
  await proposal.voteWithToken(vote);
};

export const expectProposalVoteResults = (
  vote: any,
  nativeForVotes: number,
  nativeAgainstVotes: number,
  tokenForVotes: number,
  tokenAgainstVotes: number
) => {
  expect(vote.nativeForVotes).to.eq(nativeForVotes);
  expect(vote.nativeAgainstVotes).to.eq(nativeAgainstVotes);
  expect(vote.tokenForVotes).to.eq(tokenForVotes);
  expect(vote.tokenAgainstVotes).to.eq(tokenAgainstVotes);
};
