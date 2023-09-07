// import { ethers } from 'hardhat';
//
// async function main() {
//   const currentTimestampInSeconds = Math.round(Date.now() / 1000);
//   const unlockTime = currentTimestampInSeconds + 60;
//   const name = 'My token';
//   const symbol = 'TOKEN';
//   const decimals = 21;
//   const totalSupply = ethers.parseUnits('10000', decimals);
//   // metamask account
//   const transferToAddress = '0xF4A87e028d06c0aB13FF4630CA1f84b28a91Fa60';
//
//   //
//   // const erc20Development = await ethers.deployContract("ERC20Development", [name, symbol, decimals, totalSupply], {
//   //     _name: name,
//   //     _symbol: symbol,
//   //     _decimals: decimals,
//   //     _totalSupply: totalSupply,
//   // });
//   //
//   // await erc20Development.deployed();
//   //
//   // console.log(`Token deployed to ${erc20Development.address}`);
//   //
//   // await erc20Development.transfer(transferToAddress, ethers.utils.parseUnits("1000", decimals));
//   //
//   // console.log(`Transfered 10000 tokens to ${transferToAddress}`);
//   //
//   // const wallet = (await ethers.getSigners())[0];
//   // console.log('wallet address', wallet.address);
//   // await wallet.sendTransaction({
//   //     to: transferToAddress,
//   //     value: ethers.utils.parseEther("10"),
//   // })
//   // console.log(`Sent ${ethers.utils.parseEther("10")} ETH to ${transferToAddress}`);
//   //
//
//   const token = await ethers.deployContract('ERC721Development');
//   await token.deployed();
//
//   console.log(`NFT deployed to ${token.address}`);
//   const signer = (await ethers.getSigners())[0];
//   await token.createNFT(signer.address, 'https://arweave.net/gTzo012IdW-2nYxsWdX4y1jB4eC7ZljT4oBO9AFrJZ8\n');
//   console.log(`Created NFT for ${signer.address}`);
//   await token.createNFT(transferToAddress, 'https://arweave.net/gTzo012IdW-2nYxsWdX4y1jB4eC7ZljT4oBO9AFrJZ8\n');
//   console.log(`Created NFT for ${transferToAddress}`);
// }
//
// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
