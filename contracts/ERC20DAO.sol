pragma solidity ^0.8.18;

import "./IProposal.sol";
import "./Proposal.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./ERC20DAOPool.sol";

contract ERC20DAO is DAO {

    ERC20DAOPool private daoPool;

    // DAO token address
    address private tokenAddress;

    constructor(address _daoTokenAddress, uint256 _tokenCollateral, uint256 _challengePeriod, uint256 _nativeCollateral)
            DAO(_tokenCollateral, _challengePeriod, _nativeCollateral) {
        daoPool = new ERC20DAOPool(_daoTokenAddress, address(this), 30 days);
    }

    function validateTokenCollateral(address userAddress, uint256 requiredCollateral) override public returns (uint256) {
        IERC20 token = IERC20(tokenAddress);
        return daoPool.balanceOf(msg.sender) / requiredCollateral;
    }

    function voteWithDaoToken(address proposalAddress, bool vote) override public {
        return daoPool.vote(proposalAddress, vote);
    }

}