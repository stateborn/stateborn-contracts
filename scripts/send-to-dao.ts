import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { readFileSync } from 'fs';

async function main() {
  // TODO provide dao address
  const daoAddress = '0xB038947c5D187AAB3b7B48d20eCdb3d069263212';

  const abi = ['function transfer(address recipient, uint256 amount) external returns (bool)'];
  const nftAbi = ['function createNFT(address,string) external returns (uint256)'];

  let file;
  try {
    file = JSON.parse(readFileSync('deployments/dev-tokens-local.json', 'utf8'));
  } catch (e) {
    console.log('No local deployment done! Deploy tokens first!');
    return;
  }
  const contract = new Contract(file.erc20Address, abi, ethers.provider.getSigner());
  await contract.transfer(daoAddress, ethers.utils.parseUnits('100', 18));
  console.log(`Transferred 100 tokens to DAO: ${daoAddress}`);

  const nft = new Contract(file.nftAddress, nftAbi, ethers.provider.getSigner());
  const signer = (await ethers.getSigners())[0];
  await nft.createNFT(signer.address, 'https://arweave.net/gTzo012IdW-2nYxsWdX4y1jB4eC7ZljT4oBO9AFrJZ8\n');
  console.log(`Created NFT 0 for ${signer.address}`);
  await nft.createNFT(daoAddress, 'https://arweave.net/gTzo012IdW-2nYxsWdX4y1jB4eC7ZljT4oBO9AFrJZ8\n');
  console.log(`Created NFT 1 for DAO ${daoAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
