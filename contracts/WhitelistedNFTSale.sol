// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "./interfaces/IMeritMintableNFT.sol";

contract WhitelistedNFTSale is AccessControlEnumerable {
    using Math for uint256;

    bytes32 public constant MERKLE_ROOT_SETTER_ROLE = keccak256("MERKLE_ROOT_SETTER_ROLE");
    bytes32 public constant FUNDS_CLAIMER_ROLE = keccak256("FUNDS_CLAIMER_ROLE");

    uint256 public immutable startTime;
    uint256 public immutable endTime;

    IMeritMintableNFT public immutable NFT;

    uint256 public immutable saleCap;
    uint256 public immutable idOffset; // ID to start minting at

    uint256 public immutable capPerUser;
    uint256 public immutable price;

    uint256 public totalSold;
    mapping(address => uint256) public userBought;
    bytes32 public merkleRoot; //set to bytes32(type(uint256).max) to remove whitelist

    modifier onlyMerkleRootSetter {
        require(hasRole(MERKLE_ROOT_SETTER_ROLE, msg.sender), "ERROR");
        _;
    }

    modifier onlyFundsClaimer {
        require(hasRole(FUNDS_CLAIMER_ROLE, msg.sender), "ERROR");
        _;
    }

    constructor(
        bytes32 _merkleRoot,
        uint256 _startTime,
        uint256 _endTime,
        address _NFT,
        uint256 _saleCap,
        uint256 _capPerUser,
        uint256 _price,
        uint256 _idOffset
        
    ) {
        merkleRoot = _merkleRoot;
        startTime = _startTime;
        endTime = _endTime;
        NFT = IMeritMintableNFT(_NFT);
        saleCap = _saleCap;
        capPerUser = _capPerUser;
        price = _price;
        idOffset = _idOffset;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    function setMerkleRoot(bytes32 _merkleRoot) external onlyMerkleRootSetter {
        merkleRoot = _merkleRoot;
    }

    function claimFunds(address _receiver) external onlyFundsClaimer() {
        payable(_receiver).transfer(address(this).balance);
    }

    function buy(uint256 _amount, address _receiver, bytes32[] calldata _proof) external payable {
        require(startTime < block.timestamp, "SALE_NOT_STARTED");
        require(endTime > block.timestamp, "SALE_ENDED");

        // mint max what's left or max mint per user
        uint256 amount = _amount.min(saleCap - totalSold).min(capPerUser);

        require(amount > 0, "CANNOT_MINT_ZERO");
        
        // TODO custom errors
        uint256 totalEthRequired = amount * price;
        require(msg.value >= totalEthRequired, "PRICE_TOO_LOW");
 
        // If merkle root is 0xfffff...ffffff whitelist check is skipped
        if(merkleRoot != bytes32(type(uint256).max)) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender)); // we only check if an address is in the merkle tree;
            require(MerkleProof.verify(_proof, merkleRoot, leaf), "MerkleNFTDrop.claim: Proof invalid");
        }        

        // reading totalSold once to save on storage writes
        uint256 nextId = totalSold + idOffset;
        // Updating totalSold before doing possible external calls
        totalSold += amount;

        // External calls at the end of the function
        // mint NFTS
        for(uint256 i = 0; i < amount; i ++) {
            NFT.mint(nextId, _receiver);
            nextId ++;
        }

        // return excess ETH
        if(msg.value > totalEthRequired) {
            payable(msg.sender).transfer(msg.value - totalEthRequired);
        }
    }

}