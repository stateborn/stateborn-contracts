import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

require('@openzeppelin/hardhat-upgrades');

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.18",
        settings: {
            viaIR: true,
            optimizer: {
                enabled: true,
                details: {
                    yulDetails: {
                        optimizerSteps: "u",
                    },
                },
            },
        },
    },
    networks: {
        local: {
            url: 'http://127.0.0.1:7545/',
            allowUnlimitedContractSize: true,
            chainId: 1337,
        }
    }
};

export default config;
