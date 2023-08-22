import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { LOGGER } from './pino-logger-service';
import { checkProposalIsEnded } from './proposal-utils';

export async function deployErc20Token(tokenDecimals: number = 18): Promise<Contract> {
    // DEPLOY TOKEN
    const name = 'My token';
    const symbol = 'TOKEN';
    const totalSupply = ethers.utils.parseUnits("10000", tokenDecimals);
    const token = await ethers.deployContract("ERC20Development", [name, symbol, totalSupply], {
        // @ts-ignore
        _name: name,
        _symbol: symbol,
        _totalSupply: totalSupply,
    });
    await token.deployed();
    LOGGER.debug(`ERC20 token deployed to ${token.address}`);
    return token;
}

export async function deployDao(tokenAddress: string, challengePeriodSeconds: number, nativeCollateral: number, tokenDecimals: number = 18): Promise<Contract> {
    const daoFactory = await ethers.getContractFactory("ERC20DAO");
    const dao = await daoFactory.deploy(tokenAddress, ethers.utils.parseUnits("100", tokenDecimals), challengePeriodSeconds, ethers.utils.parseEther(nativeCollateral.toString()))
    await dao.deployed();
    LOGGER.debug(`DAO deployed to ${dao.address}`);
    return dao;
}

export async function transferERC20TokensToDao(token: Contract, daoAddress: string, tokenAmount: string, tokenDecimals: number = 18): Promise<void> {
    await token.transfer(daoAddress, ethers.utils.parseUnits(tokenAmount, tokenDecimals));
    const balanceOfDao = await token.balanceOf(daoAddress);
    expect(balanceOfDao).to.be.eq(ethers.utils.parseUnits(tokenAmount, tokenDecimals));
    LOGGER.debug(`Sent ${tokenAmount} tokens to DAO`);
}

export const generateRandomMerkleRoot = (): string => {
    return '0xca97c27a9ea0eb2d7d0ec30023e2def3607b7e0a86b3c8188c21f798a9332bff';
}

export const generateRandomProposalId = (): Uint8Array => {
    return ethers.utils.toUtf8Bytes(faker.string.uuid());
}

export const generateRandomIntNumberFrom1To100 = (): string => {
    return faker.number.int({min: 1, max: 100}).toFixed(0);
}

export const sleep = (ms: number) => {
    LOGGER.debug(`Sleeping for ${ms} ms`)
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const waitForProposalToEnd = async (proposal: Contract) => {
    while (await proposal.isEnded() === false) {
        LOGGER.debug('Waiting for proposal to end');
        await sleep(1000);
    }
}

// challenge period is 5 seconds
// native collateral is 1 ETH
/// DAO gets 1000 ERC20 governance tokens
export async function initializeErc20TokenAndDao() {
    const token = await deployErc20Token();
    const dao = await deployDao(token.address, 5, 1);
    await transferERC20TokensToDao(token, dao.address, "1000");
    const [owner, otherAccount] = await ethers.getSigners();
    return {token, dao, owner, otherAccount};
}
