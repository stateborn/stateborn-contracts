import 'hardhat-gas-reporter';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
require('@openzeppelin/hardhat-upgrades');
const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/.env' });
const { COINMARKETCAP_API_KEY } = process.env;
require('solidity-coverage');
require("hardhat-contract-sizer");

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.18',
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 50,
      },
    },
  },
  networks: {
    local: {
      url: 'http://127.0.0.1:7545/',
      allowUnlimitedContractSize: true,
      chainId: 1337,
    },
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    gasPrice: 21,
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: 'MATIC',
  },
  // typechain: {
  //   outDir: 'src/types',
  //   target: 'ethers-v6',
  //   alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
  //   externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
  //   dontOverrideCompile: false // defaults to false
  // },
};

export default config;
