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
import { constants } from "ethers";

let deployer: SignerWithAddress;
let account1: SignerWithAddress;
let account2: SignerWithAddress;
let signers: SignerWithAddress[];
let timeTraveler = new TimeTraveler(hre.network.provider);

describe("MeritNFTDropFactory", function() {

    before(async() => {
        [
            deployer,
            account1,
            account2,
            ...signers
        ] = await ethers.getSigners();

        

        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    });

});