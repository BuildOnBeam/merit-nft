import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";
import { 
    MeritNFT,
    MeritNFTDropFactory,
    MeritNFTDropFactory__factory,
    MeritNFT__factory,
    WhitelistedNFTSale,
    WhitelistedNFTSale__factory
} from "../src/types";
import TimeTraveler from "../utils/TimeTraveler";
import DropMerkleTree from "../utils/DropMerkleTree";
import { constants } from "ethers";
import { MerkleTree } from "../utils/MerkleTree";

let deployer: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let signers: SignerWithAddress[];
let timeTraveler = new TimeTraveler(hre.network.provider);
let factory: MeritNFTDropFactory;

const NAME = "NAME";
const SYMBOL = "SYMBOL";
const BASE_TOKEN_URI = "http://example.com/";
const MERKLE_ROOT = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const IPFS_HASH = "hash";
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";


describe("MeritNFTDropFactory", function() {

    before(async() => {
        [
            deployer,
            account1,
            account2,
            ...signers
        ] = await ethers.getSigners();

        factory = await (new MeritNFTDropFactory__factory(deployer)).deploy();

        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    });

    describe("deployNFT", async() => {
        it("Deploying an immutable NFT should work", async() => {
            // get address using callstatic
            const nftAddress = await factory.callStatic.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                true,
            );

            // actually deploy the contract
            const nftDeployTx = factory.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                true,
            );

            expect(nftDeployTx).to.emit(factory, "NFTDeployed").withArgs(nftAddress, deployer.address, true);

            await nftDeployTx;

            const NFT: MeritNFT = MeritNFT__factory.connect(nftAddress, deployer);

            const name = await NFT.name();
            const symbol = await NFT.symbol();
            const baseUri = await NFT.baseURI();

            expect(name).to.eq(NAME);
            expect(symbol).to.eq(SYMBOL);
            expect(baseUri).to.eq(BASE_TOKEN_URI);

            const minterRoleCount = await NFT.getRoleMemberCount(MINTER_ROLE);
            const defaultAdminRoleCount = await NFT.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
            const minter = await NFT.getRoleMember(MINTER_ROLE, 0);
            const defaultAdmin = await NFT.getRoleMember(DEFAULT_ADMIN_ROLE, 0);

            expect(minterRoleCount).to.eq(1);
            expect(defaultAdminRoleCount).to.eq(1);
            expect(minter).to.eq(factory.address);
            expect(defaultAdmin).to.eq(factory.address);

            const nftMerkleTree = await factory.NFTMerkleTree(nftAddress);
            expect(nftMerkleTree.root).to.eq(MERKLE_ROOT);
            expect(nftMerkleTree.ipfsHash).to.eq(IPFS_HASH);

            const merkleTreeSetter = await factory.NFTMerkleSetter(nftAddress);
            expect(merkleTreeSetter).to.eq(constants.AddressZero);
        });

        it("Deploying a mutable NFT should work", async() => {
            // get address using callstatic
            const nftAddress = await factory.callStatic.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                false,
            );

            // actually deploy the contract
            const nftDeployTx = factory.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                false,
            );

            expect(nftDeployTx).to.emit(factory, "NFTDeployed").withArgs(nftAddress, deployer.address, false);

            await nftDeployTx;

            const NFT: MeritNFT = MeritNFT__factory.connect(nftAddress, deployer);

            const name = await NFT.name();
            const symbol = await NFT.symbol();
            const baseUri = await NFT.baseURI();

            expect(name).to.eq(NAME);
            expect(symbol).to.eq(SYMBOL);
            expect(baseUri).to.eq(BASE_TOKEN_URI);

            const minterRoleCount = await NFT.getRoleMemberCount(MINTER_ROLE);
            const defaultAdminRoleCount = await NFT.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
            const minter = await NFT.getRoleMember(MINTER_ROLE, 0);
            const defaultAdmin = await NFT.getRoleMember(DEFAULT_ADMIN_ROLE, 0);
            const defaultAdmin2 = await NFT.getRoleMember(DEFAULT_ADMIN_ROLE, 1);

            expect(minterRoleCount).to.eq(1);
            expect(defaultAdminRoleCount).to.eq(2, "admin role count mismatch");
            expect(minter).to.eq(factory.address);
            expect(defaultAdmin).to.eq(factory.address);
            expect(defaultAdmin2).to.eq(deployer.address);

            const nftMerkleTree = await factory.NFTMerkleTree(nftAddress);
            expect(nftMerkleTree.root).to.eq(MERKLE_ROOT);
            expect(nftMerkleTree.ipfsHash).to.eq(IPFS_HASH);

            const merkleTreeSetter = await factory.NFTMerkleSetter(nftAddress);
            expect(merkleTreeSetter).to.eq(deployer.address);
        });

        // it("Deploying a mutable NFT should work", async())
    });

    describe("SetMerkleTree", async() => {
        it("Setting the merkle tree of an immutable should fail", async() => {
            // get address using callstatic
            const nftAddress = await factory.callStatic.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                true,
            );

            // actually deploy the nft
            const nftDeployTx = factory.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                true,
            );

            await nftDeployTx;

            expect(factory.updateNFTMerkleTree(nftAddress, MERKLE_ROOT, IPFS_HASH)).to.be.revertedWith("MerkleSetterError()");
        });

        it("Setting the merkle tree of a mutable nft should work", async() => {
             // get address using callstatic
             const nftAddress = await factory.callStatic.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                false,
            );

            // actually deploy the nft
            const nftDeployTx = factory.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                false,
            );

            await nftDeployTx;

            const newRoot = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0"
            const newHash = "kekekekek";

            await factory.updateNFTMerkleTree(nftAddress, newRoot, newHash);
            const nftMerkleTree = await factory.NFTMerkleTree(nftAddress);
            
            expect(nftMerkleTree.root).to.eq(newRoot);
            expect(nftMerkleTree.ipfsHash).to.eq(newHash);
        });
        
    });

    describe("setMerkleSetter", async() => {
        it("Setting the merkle setter of an immutable should fail", async() => {
            // get address using callstatic
            const nftAddress = await factory.callStatic.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                true,
            );

            // actually deploy the nft
            const nftDeployTx = factory.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                true,
            );

            await nftDeployTx;

            expect(factory.setMerkleSetter(nftAddress, account1.address)).to.be.revertedWith("MerkleSetterError()");
        });

        it("Setting the merkle tree of a mutable nft should work", async() => {
             // get address using callstatic
             const nftAddress = await factory.callStatic.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                false,
            );

            // actually deploy the nft
            const nftDeployTx = factory.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                MERKLE_ROOT,
                IPFS_HASH,
                false,
            );

            await nftDeployTx;

            await factory.setMerkleSetter(nftAddress, account1.address);
            const merkleSetter = await factory.NFTMerkleSetter(nftAddress);

            expect(merkleSetter).to.eq(account1.address);

            // double check we cannot set it from a diffrent address
            expect(factory.setMerkleSetter(nftAddress, account1.address)).to.be.revertedWith("MerkleSetterError()");
        });
    });

    describe("claim", async() => {
        let NFT: MeritNFT;
        let addresses: string[];
        let tokenIds: number[];
        let merkleTree: DropMerkleTree;

        this.beforeEach(async () => {
            addresses = signers.map((value) => (value.address));
            tokenIds = signers.map((value, index) => (index));
            merkleTree = new DropMerkleTree(addresses, tokenIds);

             // get address using callstatic
             const nftAddress = await factory.callStatic.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                merkleTree.merkleTree.getRoot(),
                IPFS_HASH,
                false,
            );

            // actually deploy the nft
            const nftDeployTx = factory.deployNFT(
                NAME,
                SYMBOL,
                BASE_TOKEN_URI,
                merkleTree.merkleTree.getRoot(),
                IPFS_HASH,
                false,
            );

            NFT = MeritNFT__factory.connect(nftAddress, deployer);
        });

        it("Claim should work", async() => {
            const proof = merkleTree.getProofByAddressAndTokenId(signers[0].address, 0);
            await factory.claim(NFT.address, 0, signers[0].address, proof);

            const owner = await NFT.ownerOf(0);
            expect(owner).to.eq(signers[0].address);
        });

        it("Claiming twice should fail", async() => {
            const proof = merkleTree.getProofByAddressAndTokenId(signers[0].address, 0);
            await factory.claim(NFT.address, 0, signers[0].address, proof);

            await expect(factory.claim(NFT.address, 0, signers[0].address, proof)).to.be.revertedWith("ERC721: token already minted");
        });

        it("Claiming with an invalid proof should fail", async() => {
            const proof = merkleTree.getProofByAddressAndTokenId(signers[1].address, 1);
            await expect(factory.claim(NFT.address, 0, signers[0].address, proof)).to.be.revertedWith("MerkleProofError()");
        });

    });

});