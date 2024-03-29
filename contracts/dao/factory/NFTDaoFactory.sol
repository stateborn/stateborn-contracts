// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./DaoFactory.sol";
import "../NFTDao.sol";

contract NFTDaoFactory is DaoFactory {

    function initializeDao(address tokenAddress, uint256 tokenCollateral, uint256 extendChallengePeriodSeconds) override internal returns (Dao) {
        return new NFTDao(tokenAddress, tokenCollateral, defaultChallengePeriodSeconds, nativeCollateral, extendChallengePeriodSeconds);
    }
}
