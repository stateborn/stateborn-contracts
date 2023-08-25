// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./Proposal.sol";
import "./ERC20DAOPool.sol";

contract ERC20DAO is DAO {

    ERC20DAOPool public daoPool;

    constructor(address _daoTokenAddress, uint256 _tokenCollateral, uint256 _challengePeriodSeconds, uint256 _nativeCollateral)
            DAO(_tokenCollateral, _challengePeriodSeconds, _nativeCollateral) {
        daoPool = new ERC20DAOPool(_daoTokenAddress);
        emit DaoPoolCreated(address(daoPool));
    }

    function getDaoPool() override internal returns (ERC20DAOPool) {
        return daoPool;
    }
}