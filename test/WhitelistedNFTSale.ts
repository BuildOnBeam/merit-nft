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

let NFT: MeritNFT;
let sale: WhitelistedNFTSale;

let DEFAULT_ADMIN_ROLE: string;
let MINTER_ROLE: string;
let MERKLE_ROOT_SETTER_ROLE: string;
let FUNDS_CLAIMER_ROLE: string;
let saleMerkleTree: SaleMerkleTree;
let saleStart: number;
let saleEnd: number;

const NAME = "NAME";
const SYMBOL = "SYMBOL";
const BASE_TOKEN_URI = "https://example.com/";

const SALE_CAP = 50;
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

        saleStart = block?.timestamp || 0;
        saleEnd = saleStart + 60 * 15;
        
        sale = await (new WhitelistedNFTSale__factory(deployer)).deploy(
            merkleRoot,
            saleStart,
            // @ts-ignore
            saleEnd,
            NFT.address,
            SALE_CAP,
            USER_CAP,
            PRICE,
            ID_OFFSET
        );

        MERKLE_ROOT_SETTER_ROLE = await sale.MERKLE_ROOT_SETTER_ROLE();
        FUNDS_CLAIMER_ROLE = await sale.FUNDS_CLAIMER_ROLE();

        await NFT.grantRole(MINTER_ROLE, sale.address);

        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    });  


    describe("constructor", async() => {
        it("_startTime > _endTime should revert", async() => {
            await expect(
                (new WhitelistedNFTSale__factory(deployer)).deploy(
                    constants.MaxUint256.toHexString(),
                    200,
                    100,
                    NFT.address,
                    SALE_CAP,
                    USER_CAP,
                    PRICE,
                    ID_OFFSET
                )
            ).to.be.revertedWith(`ConstructorParamError("_startTime > _endTime")`);
        });
        it("_endTime < block.timestamp should revert", async() => {
            await expect(
                (new WhitelistedNFTSale__factory(deployer)).deploy(
                    constants.MaxUint256.toHexString(),
                    100,
                    200,
                    NFT.address,
                    SALE_CAP,
                    USER_CAP,
                    PRICE,
                    ID_OFFSET
                )
            ).to.be.revertedWith(`ConstructorParamError("_endTime < block.timestamp")`);
        });
        it("_NFT == address(0) should revert", async() => {
            await expect(
                (new WhitelistedNFTSale__factory(deployer)).deploy(
                    constants.MaxUint256.toHexString(),
                    saleStart,
                    saleEnd,
                    constants.AddressZero,
                    SALE_CAP,
                    USER_CAP,
                    PRICE,
                    ID_OFFSET
                )
            ).to.be.revertedWith(`ConstructorParamError("_NFT == address(0)")`);
        });
        it("_saleCap == 0 should revert", async() => {
            await expect(
                (new WhitelistedNFTSale__factory(deployer)).deploy(
                    constants.MaxUint256.toHexString(),
                    saleStart,
                    saleEnd,
                    NFT.address,
                    0,
                    USER_CAP,
                    PRICE,
                    ID_OFFSET
                )
            ).to.be.revertedWith(`ConstructorParamError("_saleCap == 0")`);
        });
        it("_capPerUser == 0 should revert", async() => {
            await expect(
                (new WhitelistedNFTSale__factory(deployer)).deploy(
                    constants.MaxUint256.toHexString(),
                    saleStart,
                    saleEnd,
                    NFT.address,
                    SALE_CAP,
                    0,
                    PRICE,
                    ID_OFFSET
                )
            ).to.be.revertedWith(`ConstructorParamError("_capPerUser == 0")`);
        });
        it("_price == 0 should revert", async() => {
            await expect(
                (new WhitelistedNFTSale__factory(deployer)).deploy(
                    constants.MaxUint256.toHexString(),
                    saleStart,
                    saleEnd,
                    NFT.address,
                    SALE_CAP,
                    USER_CAP,
                    0,
                    ID_OFFSET
                )
            ).to.be.revertedWith(`ConstructorParamError("_price == 0")`);
        });
    });

    describe("buy", async() => {
        it("should work from whitelisted address", async() => {
            const proof = saleMerkleTree.getProofByAddress(signers[0].address);
            const payerETHBalanceBefore = await signers[0].getBalance("latest");
            const buyTX = await sale.connect(signers[0]).buy(USER_CAP, account1.address, proof, { value: parseEther("1")});
            const receipt = await buyTX.wait();

            const accountBalance = await NFT.balanceOf(account1.address);
            const payerETHBalanceAfter = await signers[0].getBalance("latest");
            const contractETHBalance = await signers[0].provider?.getBalance(sale.address, "latest");
            const expectedAmountPaid = PRICE.mul(USER_CAP);
            const userBought = await sale.userBought(signers[0].address);

            for(let i = 0; i < USER_CAP; i ++) {
                const nftOwner = await NFT.ownerOf(ID_OFFSET + i);
                expect(nftOwner).to.eq(account1.address);
            }

            expect(accountBalance).to.eq(USER_CAP, "Account balance != USER_CAP");
            expect(payerETHBalanceAfter).to.eq(
                payerETHBalanceBefore.sub(expectedAmountPaid).sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)),
                "Payer ETH balance incorrect"
            );
            expect(contractETHBalance).to.eq(PRICE.mul(USER_CAP));
            expect(userBought).to.eq(USER_CAP);
        });

        it("Minting more than user cap should mint up to the user cap", async() => {
            const amountToMint = USER_CAP + 1;
            const proof = saleMerkleTree.getProofByAddress(signers[0].address);
            const payerETHBalanceBefore = await signers[0].getBalance("latest");
            const buyTx = await sale.connect(signers[0]).buy(amountToMint, account1.address, proof, { value: PRICE.mul(USER_CAP)});
            const receipt = await buyTx.wait();

            const accountBalance = await NFT.balanceOf(account1.address);
            const payerETHBalanceAfter = await signers[0].getBalance("latest");
            const contractETHBalance = await signers[0].provider?.getBalance(sale.address, "latest");
            const expectedAmountPaid = PRICE.mul(USER_CAP);

            for(let i = 0; i < USER_CAP; i ++) {
                const nftOwner = await NFT.ownerOf(ID_OFFSET + i);
                expect(nftOwner).to.eq(account1.address);
            }

            expect(accountBalance).to.eq(USER_CAP, "Account balance != USER_CAP");
            expect(payerETHBalanceAfter).to.eq(
                payerETHBalanceBefore.sub(expectedAmountPaid).sub(receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)),
                "Payer ETH balance incorrect"
            );
            expect(contractETHBalance).to.eq(PRICE.mul(USER_CAP));
        });

        it("Minting from multiple addresses should work", async() => {
            const numberOfSigners = SALE_CAP / USER_CAP;
            for(let i = 0; i < numberOfSigners; i ++) {
                const signer = signers[i];
                if(!signer) {
                    throw new Error("Not enough signers.");
                }
                const proof = saleMerkleTree.getProofByAddress(signer.address);
                await sale.connect(signer).buy(USER_CAP, account1.address, proof, { value: parseEther("1")});
            }

            const accountBalance = await NFT.balanceOf(account1.address);
            expect(accountBalance).to.eq(SALE_CAP);
            const contractETHBalance = await signers[0].provider?.getBalance(sale.address);
            expect(contractETHBalance).to.eq(PRICE.mul(SALE_CAP));


            // mint one extra
            const signer = signers[numberOfSigners];
            const proof = saleMerkleTree.getProofByAddress(signer.address);
            await expect(sale.connect(signer).buy(1, account1.address, proof)).to.be.revertedWith("ZeroMintError()");
        });

        it("Buying before the sale has started should fail", async() => {
            const merkleRoot = saleMerkleTree.merkleTree.getRoot();
            const tempSale = await (new WhitelistedNFTSale__factory(deployer)).deploy(
                merkleRoot,
                saleStart + 3600,
                // @ts-ignore
                saleEnd + 3600,
                NFT.address,
                SALE_CAP,
                USER_CAP,
                PRICE,
                ID_OFFSET
            );

            const proof = saleMerkleTree.getProofByAddress(signers[0].address);
            await expect(tempSale.connect(signers[0]).buy(USER_CAP, account1.address, proof)).to.be.revertedWith("SaleNotStartedError()");
        });

        it("Buying after sale has ended should fail", async() => {
            await timeTraveler.setNextBlockTimestamp(saleEnd);

            const proof = saleMerkleTree.getProofByAddress(signers[0].address);
            await expect(sale.connect(signers[0]).buy(USER_CAP, account1.address, proof, {value: parseEther("1")})).to.be.revertedWith("SaleEndedError()");
        });

        it("Not sending sufficient ETH with the buy contract call should fail", async() => {
            const proof = saleMerkleTree.getProofByAddress(signers[0].address);
            await expect(sale.connect(signers[0]).buy(USER_CAP, account1.address, proof, {value: parseEther("0.05")})).to.be.revertedWith("InsufficientETHError()");
        });

        it("Submitting a false merkle proof should fail", async() => {
            const proof = saleMerkleTree.getProofByAddress(signers[1].address);
            await expect(sale.connect(signers[0]).buy(USER_CAP, account1.address, proof, {value: parseEther("1")})).to.be.revertedWith("MerkleProofVerificationError()");
        });

        it("Skip merkle root verification if its set to 0xffffff....fffff", async() => {
            await sale.grantRole(MERKLE_ROOT_SETTER_ROLE, deployer.address);

            await sale.setMerkleRoot(constants.MaxUint256.toHexString());
            
            const proof:any[] = [];
            await sale.connect(signers[0]).buy(5, account1.address, proof, { value: parseEther("1")});

            const accountBalance = await NFT.balanceOf(account1.address);
            const contractEthBalance = await account1.provider?.getBalance(sale.address);

            expect(accountBalance).to.eq(USER_CAP);
            expect(contractEthBalance).to.eq(PRICE.mul(USER_CAP));
        });

        it("Trying to buy more while already have bought up to cap should fail", async() => {
            const proof = saleMerkleTree.getProofByAddress(signers[0].address);
            await sale.connect(signers[0]).buy(USER_CAP, account1.address, proof, {value: parseEther("1")});
            await expect(sale.connect(signers[0]).buy(USER_CAP, account1.address, proof, {value: parseEther("1")})).to.be.revertedWith("ZeroMintError()");
        });
    });

    describe("setMerkleRoot", async() => {
        it("Setting the merkle root should work", async() => {
            await sale.grantRole(MERKLE_ROOT_SETTER_ROLE, deployer.address);

            const newMerkleRoot = constants.MaxUint256.toHexString();
            await sale.setMerkleRoot(newMerkleRoot);
            const merkleRootValue = await sale.merkleRoot();

            expect(merkleRootValue).to.eq(newMerkleRoot);
        });

        it("Setting the merkle root from an address which does not have the proper role should fail", async() => {
            const newMerkleRoot = constants.MaxUint256.toHexString();
            await expect(sale.setMerkleRoot(newMerkleRoot)).to.be.revertedWith("OnlyMerkleRootSetterError()");
        });
    });

    describe("claimFunds", async() => {
        const expectedETH = PRICE.mul(USER_CAP);
        beforeEach(async() => {
            const proof = saleMerkleTree.getProofByAddress(signers[0].address);
            await sale.connect(signers[0]).buy(USER_CAP, account1.address, proof, {value: parseEther("1")});
        });
    

        it("Claiming funds should work", async() => {
            await sale.grantRole(FUNDS_CLAIMER_ROLE, deployer.address);

            const accountBalanceBefore = await account1.getBalance();
            await sale.claimFunds(account1.address);
            const accountBalanceAfter = await account1.getBalance();
            
            expect(accountBalanceAfter).to.eq(accountBalanceBefore.add(expectedETH));
        });

        it("Claiming funds from an address which does not have the proper role should fail", async() => {
            await expect(sale.claimFunds(account1.address)).to.be.revertedWith("OnlyFundsClaimerError()");
        });
    });
});