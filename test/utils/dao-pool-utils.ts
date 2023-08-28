import { ERC20DaoPool, ERC721, IERC20, NFTDaoPool } from '../../typechain-types';
import { ethers } from 'hardhat';
import { LOGGER } from './pino-logger-service';
import { ERC_20_DECIMALS } from '../test-constants';

export const depositTokensToPool = async (pool: ERC20DaoPool, amount: number) => {
  LOGGER.debug(`Depositing tokens ${amount} ERC20 tokens to DAO pool`);
  await pool.deposit(ethers.utils.parseUnits(amount.toFixed(0), ERC_20_DECIMALS));
};

export const createErc20DaoPool = async (token: IERC20): Promise<ERC20DaoPool> => {
  return (await ethers.deployContract('ERC20DaoPool', [token.address])) as ERC20DaoPool;
};

export const createNftDaoPool = async (token: ERC721): Promise<NFTDaoPool> => {
  return (await ethers.deployContract('NFTDaoPool', [token.address])) as NFTDaoPool;
};
