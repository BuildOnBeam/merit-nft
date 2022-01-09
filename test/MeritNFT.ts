import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import TimeTraveler from "../utils/TimeTraveler";

import {
    MeritNFT,
    MeritNFT__factory
} from "../src/types";

let deployer: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let signers: SignerWithAddress[];
let NFT: MeritNFT;

const NAME = "NAME";
const SYMBOL = "SYMBOL";
const BASE_TOKEN_URI = "https://example.com/";

let timeTraveler = new TimeTraveler(hre.network.provider);

let DEFAULT_ADMIN_ROLE: string;
let MINTER_ROLE: string;

describe("MeritNFT", function() {

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

        console.log("DEFAULT_ADMIN_ROLE", DEFAULT_ADMIN_ROLE);
        console.log("MINTER_ROLE", MINTER_ROLE);

        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    });

    describe("Deployment", async() => {
        it("Correctly setup params", async() => {
            const name = await NFT.name();
            const symbol = await NFT.symbol();
            const defaultAdminCount = await NFT.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
            const defaultAdmin = await NFT.getRoleMember(DEFAULT_ADMIN_ROLE, 0);

            await NFT.grantRole(MINTER_ROLE, deployer.address);
            await NFT.mint(0, account1.address);

            const tokenUri = await NFT.tokenURI(0);

            expect(name).to.eq(NAME, "Name incorrect");
            expect(symbol).to.eq(SYMBOL, "Symbol incorrect");
            expect(defaultAdminCount).to.eq(1, "Default admin cound incorrect");
            expect(defaultAdmin).to.eq(deployer.address, "Default admin incorrect");
            expect(tokenUri).to.eq(`${BASE_TOKEN_URI}0`, "TokenURI incorrect");
        });
    });

    describe("Mint", async() => {
        it("Minting should work", async() => {
            await NFT.grantRole(MINTER_ROLE, deployer.address);
            await NFT.mint(0, account1.address);

            const balance = await NFT.balanceOf(account1.address);
            const ownerOf = await NFT.ownerOf(0);

            expect(balance).to.eq(1, "Balance incorrect");
            expect(ownerOf).to.eq(account1.address, "Owner incorrect");
        });

        it("Minting the same ID twice should fail", async() => {
            await NFT.grantRole(MINTER_ROLE, deployer.address);
            await NFT.mint(0, account1.address);

            await expect(NFT.mint(0, account1.address)).to.be.revertedWith("ERC721: token already minted");
        });

        it("Minting from an address which does not have the minter role should fail", async() => {
            await expect(NFT.mint(0, account1.address)).to.be.revertedWith(
                "OnlyMinterError()"
            );
        });
    });

});