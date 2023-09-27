// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../Dao.sol";

abstract contract DaoFactory {

    Dao[] private daos;

    uint256 public constant defaultChallengePeriodSeconds = 3 days;
    uint256 public constant nativeCollateral = 0.1 ether;
    uint256 public constant defaultExtendChallengePeriodSeconds = 1 days;

    event DaoCreated(address daoAddress);

    function createDao(address tokenAddress, uint256 tokenCollateral) public {
        Dao dao = initializeDao(tokenAddress, tokenCollateral, defaultExtendChallengePeriodSeconds);
        daos.push(dao);
        emit DaoCreated(address(dao));
    }

    function initializeDao(address tokenAddress, uint256 tokenCollateral, uint256 extendChallengePeriodSeconds) internal virtual returns (Dao);
}
