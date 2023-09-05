import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import { parseUnits } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';

async function main() {
    const currentNetwork = network.name;

    const erc20Development = await ethers.deployContract('ERC20Development', [
        "My token","TOK", parseUnits("10000", 21),
    ]);
    await erc20Development.deployed();

    const erc721Development = await ethers.deployContract('ERC721Development', []);

    if (!fs.existsSync('deployments')) {
        fs.mkdirSync('deployments');
    }
    await erc721Development.deployed();
    fs.writeFileSync(
        `deployments/dev-tokens-${currentNetwork}.json`,
        JSON.stringify({
            erc20Address: erc20Development.address,
            nftAddress: erc721Development.address,
        }, null, 2));
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
