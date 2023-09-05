import { ethers, network } from 'hardhat';
import * as fs from 'fs';

async function main() {
    const currentNetwork = network.name;

    const erc20DaoFactory = await ethers.deployContract('ERC20DaoFactory', []);
    await erc20DaoFactory.deployed();
    const erc20DaoFactoryAddress = erc20DaoFactory.address;

    const nftDaoFactory = await ethers.deployContract('NFTDaoFactory', []);
    await nftDaoFactory.deployed();
    const nftDaoFactoryAddress = nftDaoFactory.address;

    if (!fs.existsSync('deployments')) {
        fs.mkdirSync('deployments');
    }
    fs.writeFileSync(
        `deployments/dao-factories-${currentNetwork}.json`,
        JSON.stringify({
            erc20DaoFactoryAddress: erc20DaoFactoryAddress,
            nftDaoFactoryAddress: nftDaoFactoryAddress,
        }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
