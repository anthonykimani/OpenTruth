/**
 * Training Checkpoint Provenance with Seal Encryption
 * @module training-seal
 */

import { SealClient, EncryptedObject, SessionKey, DemType } from '@mysten/seal';
import { bcs } from '@mysten/sui/bcs';
import { SuiClient } from '@mysten/sui/client';
import type { TrainingCheckpoint } from '../types';
import { hashString } from './crypto';

// ============================================================================
// CONFIGURATION - FILL WITH REAL VALUES
// ============================================================================

/**
 * Seal Package ID from Mysten Docs
 * !!! REPLACE THIS with actual published package ID !!!
 * https://docs.mystenlabs.com/seal
 */
const SEAL_PACKAGE_ID = '0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682';

/**
 * Key Server Object IDs - MUST BE CONFIGURED
 * Get these from Mysten Seal docs. Need minimum 2 for threshold=2.
 */
const TESTNET_KEY_SERVER_IDS: string[] = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', // mysten-testnet-1
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', // mysten-testnet-2
];

const DEFAULT_THRESHOLD = 2;

// ============================================================================
// KEY SERVER MANAGEMENT
// ============================================================================

/**
 * Get key server configurations for SealClient initialization
 */
export function getKeyServerConfigs(): Array<{ objectId: string; weight: number }> {
  if (TESTNET_KEY_SERVER_IDS.length < DEFAULT_THRESHOLD) {
    throw new Error(
      `⛔ Seal Setup Error: Configure at least ${DEFAULT_THRESHOLD} key server object IDs ` +
      `in TESTNET_KEY_SERVER_IDS array. Get these from https://docs.mystenlabs.com/seal`
    );
  }
  return TESTNET_KEY_SERVER_IDS.map((objectId: string) => ({
    objectId,
    weight: 1,
  }));
}

// ============================================================================
// CHECKPOINT ENCRYPTION
// ============================================================================

export interface CheckpointEncryptionResult {
  encryptedData: Uint8Array;
  metadata: {
    enabled: true;
    keyId: string;
    threshold: number;
  };
}

/**
 * Encrypt a training checkpoint using Seal identity-based encryption
 * @param checkpoint - Training checkpoint to encrypt
 * @param ownerAddress - Sui address of the model owner (encryption identity)
 * @param client - SuiClient instance
 * @returns Encrypted data and decryption metadata
 */
export async function encryptCheckpoint(
  checkpoint: TrainingCheckpoint,
  _ownerAddress: string,
  client: SuiClient
): Promise<CheckpointEncryptionResult> {
  try {
    const keyId = `${checkpoint.datasetMerkleRoot}::${checkpoint.epoch}::${Date.now()}`;
    const checkpointBytes = new TextEncoder().encode(JSON.stringify(checkpoint));

    // Initialize SealClient
    const sealClient = new SealClient({
      suiClient: client as any, // Type assertion for compatibility
      serverConfigs: getKeyServerConfigs(),
      verifyKeyServers: true,
    });

    // Encrypt using SealClient
    const { encryptedObject } = await sealClient.encrypt({
      demType: DemType.AesGcm256,
      threshold: DEFAULT_THRESHOLD,
      packageId: SEAL_PACKAGE_ID,
      id: keyId,
      data: checkpointBytes,
      aad: new Uint8Array(),
    });

    return {
      encryptedData: encryptedObject,
      metadata: {
        enabled: true,
        keyId,
        threshold: DEFAULT_THRESHOLD,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown encryption error';
    throw new Error(`Checkpoint encryption failed: ${msg}`);
  }
}

// ============================================================================
// CHECKPOINT DECRYPTION
// ============================================================================

export interface CheckpointDecryptionParams {
  encryptedData: Uint8Array;
  keyId: string;
  ownerAddress: string;
  signMessage: (message: Uint8Array) => Promise<{ signature: string }>;
  client: SuiClient;
}

/**
 * Decrypt a training checkpoint (owner only)
 */
export async function decryptCheckpoint(
  params: CheckpointDecryptionParams
): Promise<TrainingCheckpoint> {
  const { encryptedData, keyId, ownerAddress, signMessage, client } = params;

  try {
   EncryptedObject.parse(encryptedData);

    // Initialize SealClient
    const sealClient = new SealClient({
      suiClient: client as any,
      serverConfigs: getKeyServerConfigs(),
      verifyKeyServers: true,
    });

    // Create session key using static factory method
    const sessionKey = await SessionKey.create({
      address: ownerAddress,
      packageId: SEAL_PACKAGE_ID,
      ttlMin: 30,
      suiClient: client as any,
    });

    const { signature } = await signMessage(sessionKey.getPersonalMessage());
    await sessionKey.setPersonalMessageSignature(signature);

    const txBytes = await createAuthTx(ownerAddress);

    // Fetch decryption keys
    await sealClient.fetchKeys({
      ids: [keyId],
      txBytes,
      sessionKey,
      threshold: DEFAULT_THRESHOLD,
    });

    // Decrypt
    const decrypted = await sealClient.decrypt({
      data: encryptedData,
      sessionKey,
      txBytes,
    });

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown decryption error';
    throw new Error(`Checkpoint decryption failed: ${msg}`);
  }
}

// ============================================================================
// CHECKPOINT PROVENANCE UTILITIES
// ============================================================================

/**
 * Create a training checkpoint with cryptographic hash
 */
export async function createCheckpoint(
  params: Omit<TrainingCheckpoint, 'checkpointHash'>
): Promise<TrainingCheckpoint> {
  const checkpointHash = await hashString(JSON.stringify(params));
  return { ...params, checkpointHash };
}

/**
 * Verify checkpoint references specific dataset
 */
export function verifyCheckpointDataset(
  checkpoint: TrainingCheckpoint,
  expectedMerkleRoot: string
): boolean {
  return checkpoint.datasetMerkleRoot === expectedMerkleRoot;
}

/**
 * Validate checkpoint integrity (hash matches data)
 */
export async function validateCheckpointIntegrity(
  checkpoint: TrainingCheckpoint
): Promise<boolean> {
  try {
    const { checkpointHash, ...data } = checkpoint;
    const recomputedHash = await hashString(JSON.stringify(data));
    return recomputedHash === checkpointHash;
  } catch {
    return false;
  }
}

// ============================================================================
// AUTHORIZATION TRANSACTION
// ============================================================================

async function createAuthTx(sender: string): Promise<Uint8Array> {
  const txData = {
    V1: {
      kind: { ProgrammableTransaction: { inputs: [], commands: [] } },
      sender,
      gasData: {
        payment: [],
        owner: sender,
        price: '1000',
        budget: '10000000',
      },
      expiration: { None: null },
    },
  };
  return bcs.TransactionData.serialize(txData).toBytes();
}