// import { ethers } from 'hardhat';
//
// async function main() {
//   const currentTimestampInSeconds = Math.round(Date.now() / 1000);
//   const unlockTime = currentTimestampInSeconds + 60;
//
//   const lockedAmount = ethers.utils.parseEther('0.001');
//
//   const MultisigFactory = await ethers.getContractFactory('GnosisSafe');
//   const multisig = await MultisigFactory.deploy();
//   await multisig.deployed();
//   console.log(`Multisig deployed to ${multisig.address}`);
//
//   const encoded = ethers.utils.defaultAbiCoder.encode(
//     ['address[]', 'uint256', 'address', 'bytes', 'address', 'address', 'uint256', 'address'],
//     [
//       ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'],
//       1,
//       ethers.constants.AddressZero,
//       '0x',
//       ethers.constants.AddressZero,
//       ethers.constants.AddressZero,
//       0,
//       ethers.constants.AddressZero,
//     ]
//   );
//   const MultisigProxyFactory = await ethers.getContractFactory('GnosisSafeProxyFactory');
//   const multisigProxy = await MultisigProxyFactory.deploy();
//   await multisigProxy.deployed();
//   //
//   console.log(`Multisig factory deployed to ${multisigProxy.address}`);
//   const listener = multisigProxy.on('ProxyCreation', (proxy, owner) => {
//     console.log(`Proxy created at ${proxy} by ${owner}`);
//     listener.removeAllListeners();
//   });
//   const res = await multisigProxy.createProxy(multisig.address, encoded);
// }
//
// // We recommend this pattern to be able to use async/await everywhere
// // and properly handle errors.
// main().catch((error) => {
//   console.error(error);
//   process.exitCode = 1;
// });
