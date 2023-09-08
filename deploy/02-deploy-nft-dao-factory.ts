import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { network } from "hardhat";

const deployNftDaoFactory: DeployFunction = async (
    hre: HardhatRuntimeEnvironment
) => {
    const { deploy } = hre.deployments;
    const { deployer } = await hre.getNamedAccounts();
    const chainId = network.config.chainId!;

    await deploy("NFTDaoFactory", {
        from: deployer,
        log: true,
        args: [],
        waitConfirmations: chainId == 31337 ? 1 : 6,
    });
};

export default deployNftDaoFactory;
deployNftDaoFactory.tags = ["all", "NFTDaoFactory"];