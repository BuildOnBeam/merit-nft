import { ethers } from "ethers";
import { MerkleTree } from "./MerkleTree";

class DropMerkleTree {
    merkleTree: MerkleTree

    constructor(addresses: string[], tokenIds: number[]) {
        const hashes = addresses.map((address, i) => 
            this.hashEntry(address, tokenIds[i])
        )

        this.merkleTree = new MerkleTree(hashes);
    }

    hashEntry(address: string, tokenId: number) {
        return ethers.utils.solidityKeccak256(
            ["uint256", "address"],
            [
                tokenId,
                address
            ]
        );
    }

    getProofByAddressAndTokenId = (address: string, tokenId: number) => {
        const hash = this.hashEntry(address, tokenId);
        return this.merkleTree.getProof(hash);
    }
}

export default DropMerkleTree;