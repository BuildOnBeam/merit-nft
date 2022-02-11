import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { MeritNFT, MeritNFT__factory, View, View__factory } from "../src/types";
import TimeTraveler from "../utils/TimeTraveler";

let timeTraveler = new TimeTraveler(hre.network.provider);
let deployer: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let signers: SignerWithAddress[];
let NFT: MeritNFT;
let view: View;

describe("View", function() {
    before(async() => {
        [
            deployer,
            account1,
            account2,
            ...signers
        ] = await ethers.getSigners();

        NFT = await (new MeritNFT__factory(deployer)).deploy("TEST", "TEST", "TEST");
        view = await (new View__factory(deployer)).deploy();

        const MINTER_ROLE = await NFT.MINTER_ROLE();
        await NFT.grantRole(MINTER_ROLE, deployer.address);

        await NFT.mint(0, account1.address);
        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    });

    describe("getNFTsExist", async() => {
        it("should work", async() => {
            const result = await view.getNFTsExist(NFT.address, [0, 1]);
            expect(result).to.eql([true, false]);
        });
    });
});