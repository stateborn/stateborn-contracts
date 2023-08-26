import { ERC20DaoPool } from '../../typechain-types';
import { ethers } from 'ethers';
import { LOGGER } from './pino-logger-service';
import { ERC_20_DECIMALS } from '../test-constants';

export const depositTokensToPool = async (pool: ERC20DaoPool, amount: number) => {
    LOGGER.debug(`Depositing tokens ${amount} ERC20 tokens to DAO pool`);
    await pool.deposit(ethers.utils.parseUnits(amount.toFixed(0), ERC_20_DECIMALS));
}