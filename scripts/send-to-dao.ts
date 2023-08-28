import { ethers } from 'hardhat';
import { Contract } from 'ethers';

async function main() {
  //TODO provide dao address
  const daoAddress = '0xa8aFC8e510393213ea6c181c37bf273718e7C353';
  const a = ['function transfer(address recipient, uint256 amount) external returns (bool)'];
  //token address
  //TODO provide token address
  const contract = new Contract('0x9931e9395c7700F1b017Fd9CfC0D56c250000727', a, ethers.provider.getSigner());

  await contract.transfer(daoAddress, ethers.utils.parseUnits('100', 21));

  console.log(`Transfer 100 tokens to DAO: ${daoAddress}`);

  const token = await ethers.deployContract('ERC721Development');
  await token.deployed();

  console.log(`NFT deployed to ${token.address}`);
  const signer = (await ethers.getSigners())[0];
  await token.createNFT(signer.address, 'https://arweave.net/gTzo012IdW-2nYxsWdX4y1jB4eC7ZljT4oBO9AFrJZ8\n');
  console.log(`Created NFT for ${signer.address}`);
  await token.createNFT(daoAddress, 'https://arweave.net/gTzo012IdW-2nYxsWdX4y1jB4eC7ZljT4oBO9AFrJZ8\n');
  console.log(`Created NFT for ${daoAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
