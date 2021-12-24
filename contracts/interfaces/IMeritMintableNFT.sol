// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IMeritMintableNFT {
    function mint(uint256 _tokenId, address _receiver) external;
}
