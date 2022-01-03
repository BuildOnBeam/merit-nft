// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "./interfaces/IMeritMintableNFT.sol";
import "./MeritNFT.sol";

error MerkleSetterError();

contract MeritNFTDropFactory {

    struct MerkleTree {
        bytes32 root;
        string ipfsHash; //to be able to fetch the merkle tree without relying on a centralized UI
    }

    mapping(address => address) public NFTMerkleSetter;
    mapping(address => MerkleTree) public NFTMerkleTree;
    IMeritMintableNFT[] public NFTs;
    
    modifier onlyMerkleSetter(address _NFT) {
        if(NFTMerkleSetter[_NFT] != msg.sender) {
            revert MerkleSetterError();
        }
        _;
    }

    event NFTDeployed(address indexed NFT, address indexed deployer, bool indexed isImmutable);
    event MerkleTreeUpdated(address indexed NFT, bytes32 indexed root, string ipfsHash);
    event MerkleSetterUpdated(address indexed NFT, address indexed newSetter);
    event NFTClaimed(address indexed NFT, uint256 indexed tokenId, address indexed receiver);

    function deployNFT(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        bytes32 _merkleRoot,
        string memory _merkleIpfsHash,
        bool _immutable
    ) external returns(address) {
        // TODO consider using a transparant proxy to bring down gas cost

        MeritNFT NFT = new MeritNFT(
            _name,
            _symbol,
            _baseTokenURI
        );
        
        NFT.grantRole(NFT.MINTER_ROLE(), address(this));
        NFTMerkleTree[address(NFT)] = MerkleTree({
            root: _merkleRoot,
            ipfsHash: _merkleIpfsHash
        });

        // If non immutable, set the NFT admin and allow the merkle root to be updated
        if(!_immutable) {
            NFT.grantRole(NFT.DEFAULT_ADMIN_ROLE(), msg.sender);
            NFTMerkleSetter[address(NFT)] = msg.sender;
        }

        emit NFTDeployed(address(NFT), msg.sender, _immutable);

        return address(NFT);
    }

    function updateNFTMerkleTree(
        address _NFT,
        bytes32 _merkleRoot,
        string memory _merkleIpfsHash
    ) onlyMerkleSetter(_NFT) external {
        NFTMerkleTree[_NFT] = MerkleTree({
            root: _merkleRoot,
            ipfsHash: _merkleIpfsHash
        });

        emit MerkleTreeUpdated(_NFT, _merkleRoot, _merkleIpfsHash);
    }

    function setMerkleSetter(address _NFT, address _merkleSetter) onlyMerkleSetter(_NFT) external {
        NFTMerkleSetter[_NFT] = _merkleSetter;
        emit MerkleSetterUpdated(_NFT, _merkleSetter);
    }

    function claim(address _NFT, uint256 _tokenId, address _receiver, bytes32[] calldata _proof) external {
        bytes32 leaf = keccak256(abi.encodePacked(_tokenId, _receiver));
        // TODO custom error
        require(MerkleProof.verify(_proof, NFTMerkleTree[_NFT].root, leaf), "MerkleNFTDrop.claim: Proof invalid");
        // Mint NFT
        MeritNFT NFT = MeritNFT(_NFT);
        NFT.mint(_tokenId, _receiver);

        emit NFTClaimed(_NFT, _tokenId, _receiver);
    }

}