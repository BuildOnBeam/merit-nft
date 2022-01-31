import { task } from "hardhat/config";
import { MeritNFTDropFactory__factory } from "../../src/types";
import sleep from "../../utils/sleep";

const VERIFY_DELAY = 100000;

task("deploy-factory")
    .addFlag("verify")
    .setAction(async(taskArgs, { ethers, run }) => {
        const signers = await ethers.getSigners();
        const factoryFactory = new MeritNFTDropFactory__factory(signers[0]);
        
        const factory = await factoryFactory.deploy();
        console.log(`MeritNFTDropFactory deployed at ${factory.address}`);

        if(taskArgs.verify) {
            console.log("Verifying MeritNFTDropFactory__factory, can take some time")
            await factory.deployed();
            await sleep(VERIFY_DELAY);
            await run("verify:verify", {
                address: factory.address,
                constructorArguments: [
                    //none
                ]
            })
        }
});