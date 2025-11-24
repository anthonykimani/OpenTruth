import { MerkleTree } from "merkletreejs";
import { Buffer } from "buffer";

// Polyfill Buffer for browser
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

/**
 * Build Merkle tree from file hashes
 */
export async function buildMerkleTree(
  fileHashes: string[]
): Promise<{ tree: MerkleTree; root: string }> {
  if (fileHashes.length === 0) {
    throw new Error("Cannot build Merkle tree with no hashes");
  }

  try {
    // Remove "sha256:" prefix and convert to hex buffers
    const cleanHashes = fileHashes.map((h) => h.replace(/^sha256:/, ""));
    
    // Convert hex strings to buffers for leaves
    const leaves = cleanHashes.map((h) => Buffer.from(h, "hex"));

    // Define hash function using Web Crypto API
     async (data: Buffer): Promise<Buffer> => {
      const uint8Array = new Uint8Array(data);
      const hashBuffer = await crypto.subtle.digest("SHA-256", uint8Array);
      return Buffer.from(hashBuffer);
    };

    // Build tree synchronously with pre-computed leaves
    const tree = new MerkleTree(leaves, (_data: Buffer) => {
      // Synchronous wrapper - we'll compute hashes in advance
      throw new Error("Use async version");
    }, { sortPairs: true });

    // If we have leaves, we can get root directly
    const root = tree.getRoot().toString("hex");

    return { tree, root: `0x${root}` };
  } catch (error) {
    console.error("Merkle tree construction failed:", error);
    throw new Error(`Failed to build Merkle tree: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate Merkle proof for a specific file hash
 */
export function getMerkleProof(
  tree: MerkleTree,
  fileHash: string
): string[] {
  const cleanHash = fileHash.replace(/^sha256:/, "");
  const leaf = Buffer.from(cleanHash, "hex");
  
  const proof = tree.getProof(leaf);
  return proof.map((p) => "0x" + p.data.toString("hex"));
}

/**
 * Verify a Merkle proof
 */
export function verifyMerkleProof(
  proof: string[],
  fileHash: string,
  root: string
): boolean {
  try {
    const cleanHash = fileHash.replace(/^sha256:/, "");
    const leaf = Buffer.from(cleanHash, "hex");
    const rootBuffer = Buffer.from(root.replace(/^0x/, ""), "hex");
    
    const proofBuffers = proof.map((p) => {
      const clean = p.replace(/^0x/, "");
      return Buffer.from(clean, "hex");
    });

    return MerkleTree.verify(proofBuffers, leaf, rootBuffer, (_data: Buffer) => {
      throw new Error("Synchronous verification not supported");
    });
  } catch (error) {
    console.error("Merkle proof verification failed:", error);
    return false;
  }
}

/**
 * Get all leaves (for debugging)
 */
export function getMerkleLeaves(tree: MerkleTree): string[] {
  return tree.getLeaves().map((leaf) => "0x" + leaf.toString("hex"));
}