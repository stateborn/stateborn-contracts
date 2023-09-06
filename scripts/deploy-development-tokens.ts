import { ethers, network } from 'hardhat';
import * as fs from 'fs';

async function main() {
    const currentNetwork = network.name;

    const erc20Development = await ethers.deployContract('ERC20Development', [
        "My token","TOK", ethers.parseUnits("10000", 18),
    ]);
    await erc20Development.waitForDeployment();

    const erc721Development = await ethers.deployContract('ERC721Development', []);

    if (!fs.existsSync('deployments')) {
        fs.mkdirSync('deployments');
    }
    await erc721Development.waitForDeployment();
    fs.writeFileSync(
        `deployments/dev-tokens-${currentNetwork}.json`,
        JSON.stringify({
            erc20Address: await erc20Development.getAddress(),
            nftAddress: await erc721Development.getAddress(),
        }, null, 2));
    console.log('Done!');
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
