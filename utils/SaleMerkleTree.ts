import { ethers } from "ethers";
import { MerkleTree } from "./MerkleTree";

class SaleMerkleTree {
    merkleTree: MerkleTree

    constructor(addresses: string[]) {
        const hashes = addresses.map((address) => 
            this.hashAddress(address)
        )

        this.merkleTree = new MerkleTree(hashes);
    }

    hashAddress = (address: string) => {
        return ethers.utils.solidityKeccak256(
          ["address"],
          [
           address
          ]
        );
    }

    getProofByAddress = (address: string) => {
        const hash = this.hashAddress(address);
        return this.merkleTree.getProof(hash);
    }
}

export default SaleMerkleTree;