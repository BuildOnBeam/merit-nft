import { utils } from "ethers";
import { task } from "hardhat/config";
import { MeritNFTDropFactory__factory, MeritNFT__factory, WhitelistedNFTSale__factory } from "../../src/types";
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

task("deploy-sale")
    .addParam("merkleRoot")
    .addParam("endTime")
    .addParam("nft")
    .addParam("saleCap")
    .addParam("capPerUser")
    .addParam("price")
    .addParam("idOffset")
    .addFlag("verify")
    .setAction(async(taskArgs, { ethers, run}) => {
        const signers = await ethers.getSigners();
        const saleFactory = new WhitelistedNFTSale__factory(signers[0]);
        const price = utils.parseEther(taskArgs.price);

        const sale = await saleFactory.deploy(
            taskArgs.merkleRoot,
            taskArgs.startTime,
            taskArgs.endTime,
            taskArgs.nft,
            taskArgs.saleCap,
            taskArgs.capPerUser,
            price,
            taskArgs.idOffSet
        );
        console.log(`Sale deployed at: ${sale.address}`);

        if(taskArgs.verify) {
            console.log("Verifying MeritNFTDropFactory__factory, can take some time")
            await sale.deployed();
            await sleep(VERIFY_DELAY);
            await run("verify:verify", {
                address: sale.address,
                constructorArguments: [
                    taskArgs.merkleRoot,
                    taskArgs.startTime,
                    taskArgs.endTime,
                    taskArgs.nft,
                    taskArgs.saleCap,
                    taskArgs.capPerUser,
                    price,
                    taskArgs.idOffSet
                ]
            });
        }
})

task("verify-nft")
    .addParam("nft")
    .setAction(async(taskArgs, { ethers, run}) => {
        const signers = await ethers.getSigners();

        console.log(`Verifiying NFT at: ${taskArgs.nft}`);

        const NFT = (new MeritNFT__factory(signers[0])).attach(taskArgs.nft);
        const name = await NFT.name();
        const symbol = await NFT.symbol();
        const baseTokenURI = await NFT.baseURI();

        await run("verify:verify", {
            address: taskArgs.nft,
            constructorArguments: [
                name,
                symbol,
                baseTokenURI
            ]
        });

});