// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./DaoFactory.sol";
import "../ERC20Dao.sol";

contract ERC20DaoFactory is DaoFactory {

    function initializeDao(address tokenAddress, uint256 tokenCollateral) override internal returns (Dao) {
        return new ERC20Dao(tokenAddress, tokenCollateral, defaultChallengePeriodSeconds, nativeCollateral);
    }
}
