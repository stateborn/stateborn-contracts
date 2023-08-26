// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IDaoPool {

    function balanceOf(address account) external view returns (uint256);
    function vote(address proposalAddress, bool voteSide) external;

}