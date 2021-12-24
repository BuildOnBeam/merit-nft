import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";
import { 
    MeritNFT,
    MeritNFT__factory,
    WhitelistedNFTSale,
    WhitelistedNFTSale__factory
} from "../src/types";
import TimeTraveler from "../utils/TimeTraveler";
import SaleMerkleTree from "../utils/SaleMerkleTree";

let deployer: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let signers: SignerWithAddress[];
let timeTraveler = new TimeTraveler(hre.network.provider);

let NFT: MeritNFT;
let sale: WhitelistedNFTSale;

let DEFAULT_ADMIN_ROLE: string;
let MINTER_ROLE: string;
let saleMerkleTree: SaleMerkleTree;

const NAME = "NAME";
const SYMBOL = "SYMBOL";
const BASE_TOKEN_URI = "https://example.com/";

const SALE_CAP = 100;
const USER_CAP = 5;
const PRICE = parseEther("0.05");
const ID_OFFSET = 200;

describe("WhiteListedNFTSale", function() {

    before(async() => {
        [
            deployer,
            account1,
            account2,
            ...signers
        ] = await ethers.getSigners();

        NFT = await (new MeritNFT__factory(deployer)).deploy(
            NAME,
            SYMBOL,
            BASE_TOKEN_URI
        );

        DEFAULT_ADMIN_ROLE = await NFT.DEFAULT_ADMIN_ROLE();
        MINTER_ROLE = await NFT.MINTER_ROLE();

        const block = await deployer.provider?.getBlock("latest");

        saleMerkleTree = new SaleMerkleTree(signers.map(signer => signer.address));

        const merkleRoot = saleMerkleTree.merkleTree.getRoot();
        
        sale = await (new WhitelistedNFTSale__factory(deployer)).deploy(
            merkleRoot,
            // @ts-ignore
            block?.timestamp,
            // @ts-ignore
            block?.timestamp + 60 * 15,
            NFT.address,
            SALE_CAP,
            USER_CAP,
            PRICE,
            ID_OFFSET
        );

        
        await NFT.grantRole(MINTER_ROLE, sale.address);

        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    });

    describe("buy", async() => {
        it("should work from whitelisted address", async() => {
            const proof = saleMerkleTree.getProofByAddress(signers[0].address);
            await sale.connect(signers[0]).buy(5, account1.address, proof, { value: parseEther("1")});
        });
    });
});