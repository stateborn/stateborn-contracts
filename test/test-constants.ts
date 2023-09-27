import { ethers } from 'ethers';

export const ERC_20_DECIMALS = 18;

// How long should challenge period be
export const CHALLENGE_PERIOD_SECONDS = 15;

// How many seconds extend challenge period if votes in last hour
// This is set to 0 for testing purposes because of short challenge period time
export const EXTEND_CHALLENGE_PERIOD_SECONDS = 0;
export const NATIVE_COLLATERAL = ethers.parseEther('1');
export const TOKEN_COLLATERAL = ethers.parseUnits('100', ERC_20_DECIMALS);
export const TOKEN_NFT_COLLATERAL = 1;
