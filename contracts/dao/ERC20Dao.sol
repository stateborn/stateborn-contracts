// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import './Dao.sol';
import '../pool/ERC20DaoPool.sol';

contract ERC20Dao is Dao {

    ERC20DaoPool public immutable daoPool;

    constructor(
        address _daoTokenAddress,
        uint256 _tokenCollateral,
        uint256 _challengePeriodSeconds,
        uint256 _nativeCollateral,
        uint256 _extendChallengePeriodSeconds
    ) Dao(_tokenCollateral, _challengePeriodSeconds, _nativeCollateral, _extendChallengePeriodSeconds) {
        daoPool = new ERC20DaoPool(_daoTokenAddress);
        emit DaoPoolCreated(address(daoPool));
    }

    function getDaoPool() internal view override returns (DaoPool) {
        return daoPool;
    }
}
