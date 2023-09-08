import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { network } from "hardhat";

const deployErc20DaoFactory: DeployFunction = async (
    hre: HardhatRuntimeEnvironment
) => {
    const { deploy } = hre.deployments;
    const { deployer } = await hre.getNamedAccounts();
    console.log('deployer', deployer);
    const chainId = network.config.chainId!;

    await deploy("ERC20DaoFactory", {
        from: deployer,
        log: true,
        args: [],
        waitConfirmations: chainId == 31337 ? 1 : 6,
    });
};

export default deployErc20DaoFactory;
deployErc20DaoFactory.tags = ["all", "ERC20DaoFactory"];