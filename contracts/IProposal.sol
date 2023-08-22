// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IProposal {

    function getProposalId() external view returns (bytes memory);
    function isPassed() external view returns (bool);

}