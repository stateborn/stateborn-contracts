// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../Dao.sol";

abstract contract DaoFactory {

    Dao[] private daos;

    uint256 public defaultChallengePeriodSeconds = 60;
    uint256 public nativeCollateral = 1 ether;

    event DaoCreated(address daoAddress);

    function createDao(address tokenAddress, uint256 tokenCollateral) public {
        Dao dao = initializeDao(tokenAddress, tokenCollateral);
        daos.push(dao);
        emit DaoCreated(address(dao));
    }

    function initializeDao(address tokenAddress, uint256 tokenCollateral) internal virtual returns (Dao);
}
