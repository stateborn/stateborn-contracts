import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { readFileSync } from 'fs';

async function main() {
  // TODO EDIT dao address
  const daoAddress = '0xC88Bc7C6e67cc1a2Ae9a39f2fB97509902D6672E';
  const abi = ['function transfer(address recipient, uint256 amount) external returns (bool)'];
  const nftAbi = ['function createNFT(address,string) external returns (uint256)'];

  let file;
  try {
    file = JSON.parse(readFileSync('deployments/dev-tokens-local.json', 'utf8'));
  } catch (e) {
    console.log('No local deployment done! Deploy tokens first!');
    return;
  }
  const signer = await ethers.provider.getSigner();
  const contract = new Contract(file.erc20Address, abi, signer);
  await contract.transfer(daoAddress, ethers.parseUnits('100', 18));
  console.log(`Transferred 100 tokens to DAO: ${daoAddress}`);

  const nft = new Contract(file.nftAddress, nftAbi, signer);
  await nft.createNFT(signer.address, 'https://arweave.net/gTzo012IdW-2nYxsWdX4y1jB4eC7ZljT4oBO9AFrJZ8\n');
  console.log(`Created NFT 0 for ${signer.address}`);
  await nft.createNFT(daoAddress, 'https://arweave.net/gTzo012IdW-2nYxsWdX4y1jB4eC7ZljT4oBO9AFrJZ8\n');
  console.log(`Created NFT 1 for DAO ${daoAddress}`);
  console.log('Done!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
