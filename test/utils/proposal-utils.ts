import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { LOGGER } from './pino-logger-service';
import { expect } from 'chai';

export async function createSendErc20Proposal(
        dao: Contract,
        tokenAddress: string,
        proposalId: Uint8Array,
        merkleRoot: string,
        tokenReceiverAddress: string,
        tokenTransferAmount: string,
        tokenDecimals: number = 18): Promise<Contract> {
    const sendDaoTokensTx = dao.interface.encodeFunctionData('sendErc20(bytes,address,address,uint256)', [
        proposalId,
        tokenAddress,
        tokenReceiverAddress,
        ethers.utils.parseUnits(tokenTransferAmount, tokenDecimals),
    ]);
    const tx = await dao.createProposal(
        proposalId,
        merkleRoot,
        [dao.address],
        [],
        [sendDaoTokensTx],
        {value: ethers.utils.parseEther("1")});
    // @dev there was a problem with .on listener and it didn't work for multiple tests
    // @dev so i replaced it with this workaround of getting events from tx
    const result = await tx.wait();
    LOGGER.debug(`Created DAO proposal`);
    return await ethers.getContractAt("Proposal", result.events[0].args.proposalAddress);
}

export const checkProposalIsPassed = async (proposal: Contract, expectedResult: boolean): Promise<void> => {
    const isProposalPassed = await proposal.isPassed();
    expect(isProposalPassed, "Checking if proposal passed").to.equal(expectedResult);
}

export const checkProposalIsEnded = async (proposal: Contract, expectedResult: boolean): Promise<void> => {
    const isProposalEnded = await proposal.isEnded();
    expect(isProposalEnded, "Checking if proposal ended").to.equal(expectedResult);
}

export const checkProposalIsExecuted = async (proposal: Contract, expectedResult: boolean): Promise<void> => {
    const isProposalExecuted = await proposal.isExecuted();
    expect(isProposalExecuted, "Checking if proposal is executed").to.equal(expectedResult);
}

export const voteOnProposalWithCollateral = async (proposal: Contract, vote: boolean, ethCollateralInt: number): Promise<void> => {
    LOGGER.debug(`Voting '${vote}' on proposal with collateral '${ethCollateralInt}'`);
    await proposal.vote(vote, {value: ethers.utils.parseEther(ethCollateralInt.toFixed(0))});
}