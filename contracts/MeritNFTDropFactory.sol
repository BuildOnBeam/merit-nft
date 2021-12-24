// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "./interfaces/IMeritMintableNFT.sol";
import "./MeritNFT.sol";

error MerkleSetterError();

contract MeritNFTDropFactory {

    mapping(address => address) public NFTMerkleSetter;
    mapping(address => bytes32) public NFTMerkleRoot;
    IMeritMintableNFT[] public NFTs;
    
    modifier onlyMerkleSetter(address _NFT) {
        if(NFTMerkleSetter[_NFT] != msg.sender) {
            revert MerkleSetterError();
        }
        _;
    }

    function deployNFT(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        bytes32 _merkleRoot,
        bool _immutable
    ) external {
        // TODO consider using a transparant proxy to bring down gas cost

        MeritNFT NFT = new MeritNFT(
            _name,
            _symbol,
            _baseTokenURI
        );
        
        NFT.grantRole(NFT.MINTER_ROLE(), address(this));
        NFTMerkleRoot[address(NFT)] = _merkleRoot;

        // If non immutable, set the NFT admin and allow the merkle root to be updated
        if(!_immutable) {
            NFT.grantRole(NFT.DEFAULT_ADMIN_ROLE(), msg.sender);
            NFTMerkleSetter[address(NFT)] = msg.sender;
        }

    }

    function updateNFTMerkleRoot(address _NFT, bytes32 _merkleRoot) onlyMerkleSetter(_NFT) external {
        NFTMerkleRoot[_NFT] = _merkleRoot;
    }

    function setMerkleSetter(address _NFT, address _merkleSetter) onlyMerkleSetter(_NFT) external {
        NFTMerkleSetter[_NFT] = _merkleSetter;
    }

    function claim(address _NFT, uint256 _tokenId, address _receiver, bytes32[] calldata _proof) external {
        bytes32 leaf = keccak256(abi.encodePacked(_tokenId, _receiver));
        // TODO custom error
        require(MerkleProof.verify(_proof, NFTMerkleRoot[_NFT], leaf), "MerkleNFTDrop.claim: Proof invalid");
        // Mint NFT
        MeritNFT NFT = MeritNFT(_NFT);
        NFT.mint(_tokenId, _receiver);
    }

}