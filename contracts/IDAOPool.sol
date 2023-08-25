// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Proposal.sol";

interface IDAOPool {

    function balanceOf(address account) external view returns (uint256);
    function vote(address proposalAddress, bool voteSide) external;

}