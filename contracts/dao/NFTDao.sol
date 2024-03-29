// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import './Dao.sol';
import '../pool/NFTDaoPool.sol';

contract NFTDao is Dao {

    NFTDaoPool public immutable daoPool;

    constructor(
        address _daoTokenAddress,
        uint256 _tokenCollateral,
        uint256 _challengePeriodSeconds,
        uint256 _nativeCollateral,
        uint256 _extendChallengePeriodSeconds
    ) Dao(_tokenCollateral, _challengePeriodSeconds, _nativeCollateral, _extendChallengePeriodSeconds) {
        daoPool = new NFTDaoPool(_daoTokenAddress);
        emit DaoPoolCreated(address(daoPool));
    }

    function getDaoPool() internal view override returns (DaoPool) {
        return daoPool;
    }
}
