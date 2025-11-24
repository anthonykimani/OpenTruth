/**
 * TypeScript type definitions for OpenTruth
 */

/**
 * Main certificate structure for OpenTruth
 */
export interface OpenTruthCertificate {
  version: '1.0';
  type: 'opentruth.certificate';
  timestamp: number;

  author: {
    suiAddress: string;
    publicKey?: string;
  };

  artifact: {
    type: 'image' | 'video' | 'audio' | 'document';
    hash: string; // SHA-256 hash of the *original* file (for verification)
    size: number; // Size of original file
    mimeType: string;
    filename?: string;
  };

  model?: {
    name: string;
    version?: string;
    promptHash?: string;
    checkpointHash?: string;
    datasetMerkleRoot?: string;
  };

  dataset?: {
    fileCount: number;
    totalSize: number;
    merkleRoot: string;
    fileHashes: string[];
  };

  proofs: {
    signature: {
      scheme: 'ED25519' | 'SECP256K1';
      signature: string;
      publicKey: string;
    };
  };

  /**
   * Seal encryption metadata (optional)
   * When present, the file stored on Walrus is encrypted
   * Only authorized users (owner/allowlist) can decrypt via Seal key servers
   */
  encryption?: {
    enabled: boolean;
    encryptedBlobId?: string; // Walrus blob ID of the encrypted file
    packageId?: string; // Seal package ID used for encryption
    keyId?: string; // Identity used for encryption
    threshold?: number; // t-out-of-N key server threshold (e.g., 2)
    policy?: {
      type: 'userOwned' | 'allowlist';
      owner: string; // Sui address that owns the decryption rights
      allowlist?: string[]; // Additional addresses that can decrypt
    };
  };

  storage: {
    walrusBlobId: string; // Points to either encrypted OR plaintext file
    network: 'testnet' | 'mainnet' | 'localnet';
    uploadedAt: number;
  };
}

/**
 * Training checkpoint with dataset reference
 */
export interface TrainingCheckpoint {
  epoch: number;
  accuracy: number;
  loss: number;
  datasetMerkleRoot: string;
  checkpointHash: string;
  timestamp: number;
  modelName?: string;
  modelVersion?: string;
  hyperparameters?: {
    learningRate?: number;
    batchSize?: number;
    optimizer?: string;
    [key: string]: any;
  };
}

/**
 * Walrus upload response
 */
export interface WalrusUploadResponse {
  blobId: string;
  uploadedAt: number;
}

/**
 * Stored certificate in localStorage
 */
export interface StoredCertificate {
  id: string; // Walrus blob ID of the certificate
  certificate: OpenTruthCertificate;
  savedAt: number;
  tags?: string[];
  notes?: string;
}