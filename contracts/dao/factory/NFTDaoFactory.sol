// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./DaoFactory.sol";
import "../NFTDao.sol";

contract NFTDaoFactory is DaoFactory {

    function initializeDao(address tokenAddress, uint256 tokenCollateral) override public returns (Dao) {
        return new NFTDao(tokenAddress, tokenCollateral, defaultChallengePeriodSeconds, nativeCollateral);
    }
}
