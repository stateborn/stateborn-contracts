import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { LOGGER } from './pino-logger-service';
import { ERC20Dao, ERC20DaoPool, IERC20, Proposal } from '../../typechain-types';
import { CHALLENGE_PERIOD_SECONDS, ERC_20_DECIMALS, NATIVE_COLLATERAL, TOKEN_COLLATERAL } from '../test-constants';
import { depositTokensToPool } from './dao-pool-utils';

export async function deployErc20Token(): Promise<IERC20> {
    // DEPLOY TOKEN
    const name = faker.hacker.noun();
    const symbol = faker.hacker.abbreviation();
    const totalSupply = ethers.utils.parseUnits("10000", ERC_20_DECIMALS);
    const token = await ethers.deployContract("ERC20Development", [name, symbol, totalSupply], {
        // @ts-ignore
        _name: name,
        _symbol: symbol,
        _totalSupply: totalSupply,
    });
    await token.deployed();
    LOGGER.debug(`ERC20 token deployed to ${token.address}`);
    return token as IERC20;
}

export async function deployDao(tokenAddress: string, challengePeriodSeconds: number, nativeCollateral: BigNumber, tokenCollateral: BigNumber): Promise<{ dao: ERC20Dao, ERC20DaoPool: ERC20DaoPool}> {
    const dao = (await ethers.deployContract('ERC20Dao', [
        tokenAddress,
        TOKEN_COLLATERAL,
        challengePeriodSeconds,
        NATIVE_COLLATERAL])) as ERC20Dao;
    dao.on('DaoPoolCreated' , (poolAddress: string) => {
        LOGGER.debug(`DAO pool created at ${poolAddress}`);
    });
    await dao.deployed();
    // @dev there was a problem with .on listener and it didn't work for multiple tests
    LOGGER.debug(`Created DAO proposal`);
    const result = await dao.deployTransaction.wait();
    // @ts-ignore
    const ERC20DaoPool =  (await ethers.getContractAt("ERC20DaoPool", result.events[1].args.daoPoolAddress)) as ERC20DAOPool;
    LOGGER.debug(`DAO deployed to ${dao.address}`);
    return { dao, ERC20DaoPool};
}

export async function transferERC20TokensToAddress(token: IERC20, receiver: string, tokenAmount: number): Promise<void> {
    await token.transfer(receiver, ethers.utils.parseUnits(tokenAmount.toFixed(0), ERC_20_DECIMALS));
    const balanceOfDao = await token.balanceOf(receiver);
    expect(balanceOfDao).to.be.eq(ethers.utils.parseUnits(tokenAmount.toFixed(0), ERC_20_DECIMALS));
    LOGGER.debug(`Sent ${tokenAmount} tokens to ${receiver}`);
}

export async function approveErc20(token: IERC20, addressToApprove: string, tokenAmount: number): Promise<void> {
    await token.approve(addressToApprove, ethers.utils.parseUnits(tokenAmount.toFixed(0), ERC_20_DECIMALS));
    LOGGER.debug(`Approved ${addressToApprove} to spend ${tokenAmount} tokens of ${token.address}`);
}

export const generateRandomMerkleRoot = (): string => {
    return faker.string.hexadecimal({length: 64}).toLowerCase();
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

export const waitForProposalToEnd = async (proposal: Proposal) => {
    while (!await proposal.isEnded()) {
        LOGGER.debug('Waiting for proposal to end');
        await sleep(1000);
    }
}

// challenge period is 5 seconds
// native collateral is 1 ETH
/// DAO gets 1000 ERC20 governance tokens
export async function initializeErc20TokenAndDao() {
    const token = await deployErc20Token();
    const {dao, ERC20DaoPool } = await deployDao(token.address, CHALLENGE_PERIOD_SECONDS, NATIVE_COLLATERAL, TOKEN_COLLATERAL);
    await transferERC20TokensToAddress(token, dao.address, 1000);
    const [account, otherAccount] = await ethers.getSigners();
    return {token, dao, account, otherAccount, ERC20DaoPool};
}

export async function initializeErc20TokenAndDaoAndOtherAccountWith500DaoTokens() {
    const { dao, token, account,  otherAccount, ERC20DaoPool }  = await initializeErc20TokenAndDao();

    await transferERC20TokensToAddress(token, otherAccount.address, 1000);

    const tokenByOtherAccount = token.connect(otherAccount);
    await approveErc20(tokenByOtherAccount, ERC20DaoPool.address, 500);

    const daoPoolByOtherAccount = ERC20DaoPool.connect(otherAccount);
    //500 tokens should be 5 votes because of 100 tokens per vote
    await depositTokensToPool(daoPoolByOtherAccount, 500);
    return {token, dao, account, otherAccount, ERC20DaoPool};
}

export const expectBalanceDiffIsGte = (balanceBefore: BigNumber, balanceAfter: BigNumber, expectedDiff: number): void => {
    expect(Number(Number(ethers.utils.formatEther(balanceAfter.sub(balanceBefore).toString())).toFixed(2))).to.be.gte(expectedDiff);
}

// only tx cost included to balance diff
export const expectBalanceNotChanged = (balanceBefore: BigNumber, balanceAfter: BigNumber): void => {
    expect(Number(Number(ethers.utils.formatEther(balanceAfter.sub(balanceBefore).toString())).toFixed(2))).to.be.lt(0.1);
}

export const expectTokenBalanceToEq = async (token: IERC20, address: string, expectedBalance: number, tokenDecimals: number = 18): Promise<void> => {
    const balance = await token.balanceOf(address);
    expect(balance).to.be.eq(ethers.utils.parseUnits((expectedBalance).toString(), tokenDecimals));
}