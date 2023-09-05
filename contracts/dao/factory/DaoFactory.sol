// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../Dao.sol";

abstract contract DaoFactory {

    mapping(bytes => Dao) private daos;

    uint256 public defaultChallengePeriodSeconds = 7 days;
    uint256 public nativeCollateral = 1 ether;

    event DaoCreated(address daoAddress);

    function createDao(bytes memory daoId, address tokenAddress, uint256 tokenCollateral) public {
        require(address(daos[daoId]) == address(0), 'Dao already exists');
        daos[daoId] = initializeDao(tokenAddress, tokenCollateral);
        emit DaoCreated(address(daos[daoId]));
    }

    function initializeDao(address tokenAddress, uint256 tokenCollateral) public virtual returns (Dao);
}
