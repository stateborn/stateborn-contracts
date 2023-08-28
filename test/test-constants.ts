import { ethers } from 'ethers';

export const ERC_20_DECIMALS = 18;
export const CHALLENGE_PERIOD_SECONDS = 15;
export const NATIVE_COLLATERAL = ethers.utils.parseEther('1');
export const TOKEN_COLLATERAL = ethers.utils.parseUnits('100', ERC_20_DECIMALS);
export const TOKEN_NFT_COLLATERAL = 1;
