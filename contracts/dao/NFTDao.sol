// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./Dao.sol";
import "../pool/NFTDaoPool.sol";

contract NFTDao is Dao {

    NFTDaoPool public daoPool;

    constructor(address _daoTokenAddress, uint256 _tokenCollateral, uint256 _challengePeriodSeconds, uint256 _nativeCollateral)
            Dao(_tokenCollateral, _challengePeriodSeconds, _nativeCollateral) {
        daoPool = new NFTDaoPool(_daoTokenAddress);
        emit DaoPoolCreated(address(daoPool));
    }

    function getDaoPool() override view internal returns (DaoPool) {
        return daoPool;
    }
}