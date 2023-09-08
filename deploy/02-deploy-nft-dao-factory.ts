// TypeScript
import { DeployFunction, DeployResult } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { network } from "hardhat";
import fs from 'fs';

const deployNftDaoFactory: DeployFunction = async (
    hre: HardhatRuntimeEnvironment
) => {
    const { deploy } = hre.deployments;
    const { deployer } = await hre.getNamedAccounts();
    const chainId = network.config.chainId!;
    const currentNetwork = network.name;

    const deployerResult = await deploy("NFTDaoFactory", {
        from: deployer,
        log: true,
        args: [],
        waitConfirmations: chainId == 31337 ? 1 : 6,
    });
    if (!fs.existsSync('deployments')) {
        fs.mkdirSync('deployments');
    }
    fs.writeFileSync(
        `deployments/nft-dao-factory-${currentNetwork}.json`,
        JSON.stringify({
            address: deployerResult.address,
        }, null, 2));
    console.log('Done!');
};

export default deployNftDaoFactory;
deployNftDaoFactory.tags = ["all", "NFTDaoFactory"];