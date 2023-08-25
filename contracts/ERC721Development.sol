// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC721Development is ERC721 {

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    string private baseUri;

    constructor() ERC721("DevelopmentNFT", "DNFT") {}

    function createNFT(address recipient, string memory baseUri) external returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _mint(recipient, newTokenId);
        return newTokenId;
    }

    function _baseURI() internal view override(ERC721) returns (string memory) {
        return baseUri;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireMinted(tokenId);

        return 'ipfs://bafybeigs2gea5bauuru4cnec4y5qbitx3a5f73fqx3oo3hwdjtmnis2iny/7610.json';
    }
}