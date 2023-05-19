// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface Governor {
function propose(address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas, string memory description) external returns (uint);
    function castVote(uint proposalId, bool support) external;
    function execute(uint proposalId) external;
    function getActions(uint proposalId) external view returns (address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas);
    function state(uint proposalId) external view returns (uint8);
    function proposalCount() external view returns (uint);
    function quorumVotes() external view returns (uint);
    function proposalThreshold() external view returns (uint);
    function votingDelay() external view returns (uint);
    function votingPeriod() external view returns (uint);
    function timelock() external view returns (address);
    function guardian() external view returns (address);
    function name() external view returns (string memory);
    function version() external view returns (string memory);
}