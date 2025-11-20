/**
 * Seal Encryption Module for OpenTruth (Compatible with @mysten/seal@0.9.4)
 * @module seal-encryption
 */

import { 
  SealClient, 
  EncryptedObject, 
  SessionKey, 
  DemType,
  type KeyServerConfig 
} from '@mysten/seal';
import { bcs } from '@mysten/sui/bcs';
import { SuiClient } from '@mysten/sui/client';
import type { OpenTruthCertificate } from '../types';

// ============================================================================
// CONFIGURATION - CRITICAL: FILL THESE WITH REAL VALUES
// ============================================================================

/**
 * Seal Package ID from Mysten Documentation
 * !!! REPLACE THIS with the actual published package ID !!!
 * https://docs.mystenlabs.com/seal
 */
const SEAL_PACKAGE_ID = '0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682';

/**
 * Key Server Object IDs - MUST BE FILLED
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
 * Get key server configurations for SealClient
 * Returns array of { objectId, weight } configs
 */
export function getKeyServerConfigs(): KeyServerConfig[] {
  if (TESTNET_KEY_SERVER_IDS.length < DEFAULT_THRESHOLD) {
    throw new Error(
      `⛔ Seal Setup Error: You must configure at least ${DEFAULT_THRESHOLD} key server object IDs ` +
      `in TESTNET_KEY_SERVER_IDS. Get these from https://docs.mystenlabs.com/seal`
    );
  }
  return TESTNET_KEY_SERVER_IDS.map((objectId: string) => ({
    objectId,
    weight: 1,
  }));
}

// ============================================================================
// ENCRYPTION
// ============================================================================

export interface SealEncryptionResult {
  encryptedData: Uint8Array;
  packageId: string;
  keyId: string;
  threshold: number;
}

/**
 * Encrypt a file using Seal identity-based encryption
 */
export async function encryptFileWithSeal(
  file: File,
  ownerAddress: string,
  suiClient: SuiClient
): Promise<SealEncryptionResult> {
  try {
    if (!file?.size) throw new Error('Invalid file');
    if (!ownerAddress?.startsWith('0x')) throw new Error('Invalid owner address');

    const data = new Uint8Array(await file.arrayBuffer());
    const keyId = `${ownerAddress}::${Date.now()}`;

    const sealClient = new SealClient({
      suiClient: suiClient as any, // Type assertion for compatibility
      serverConfigs: getKeyServerConfigs(),
      verifyKeyServers: true,
    });

    const { encryptedObject } = await sealClient.encrypt({
      demType: DemType.AesGcm256,
      threshold: DEFAULT_THRESHOLD,
      packageId: SEAL_PACKAGE_ID,
      id: keyId,
      data,
      aad: new Uint8Array(),
    });

    return {
      encryptedData: encryptedObject,
      packageId: SEAL_PACKAGE_ID,
      keyId,
      threshold: DEFAULT_THRESHOLD,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Seal encryption failed: ${msg}`);
  }
}

// ============================================================================
// DECRYPTION
// ============================================================================

export interface SealDecryptionParams {
  encryptedData: Uint8Array;
  suiAddress: string;
  signMessage: (message: Uint8Array) => Promise<{ signature: string }>;
  getTxBytes: () => Promise<Uint8Array>;
  suiClient: SuiClient;
}

/**
 * Decrypt a file using Seal
 */
export async function decryptFileWithSeal(
  params: SealDecryptionParams
): Promise<Uint8Array> {
  const { encryptedData, suiAddress, signMessage, getTxBytes, suiClient } = params;

  try {
    if (!suiAddress?.startsWith('0x')) throw new Error('Invalid owner address');

    const encryptedObject = EncryptedObject.parse(encryptedData);

    const sealClient = new SealClient({
      suiClient: suiClient as any, // Type assertion for compatibility
      serverConfigs: getKeyServerConfigs(),
      verifyKeyServers: true,
    });

    // Use static factory method to create SessionKey
    const sessionKey = await SessionKey.create({
      address: suiAddress,
      packageId: SEAL_PACKAGE_ID,
      ttlMin: 30,
      suiClient: suiClient as any,
    });

    const { signature } = await signMessage(sessionKey.getPersonalMessage());
    await sessionKey.setPersonalMessageSignature(signature);

    const txBytes = await getTxBytes();

    await sealClient.fetchKeys({
      ids: [encryptedObject.id],
      txBytes,
      sessionKey,
      threshold: DEFAULT_THRESHOLD,
    });

    return await sealClient.decrypt({
      data: encryptedData,
      sessionKey,
      txBytes,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Seal decryption failed: ${msg}`);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Create a transaction proving ownership for decryption
 */
export async function createDecryptionTransaction(sender: string): Promise<Uint8Array> {
  if (!sender?.startsWith('0x')) throw new Error('Invalid sender address');

  const txData = {
    V1: {
      kind: { ProgrammableTransaction: { inputs: [], commands: [] } },
      sender,
      gasData: { payment: [], owner: sender, price: '1000', budget: '10000000' },
      expiration: { None: null },
    },
  };

  return bcs.TransactionData.serialize(txData).toBytes();
}

/**
 * Add encryption metadata to certificate
 */
export function addEncryptionToCertificate(
  cert: OpenTruthCertificate,
  encryptedBlobId: string,
  keyId: string,
  threshold: number = DEFAULT_THRESHOLD,
  packageId: string = SEAL_PACKAGE_ID
): OpenTruthCertificate {
  return {
    ...cert,
    encryption: {
      enabled: true,
      encryptedBlobId,
      packageId,
      keyId,
      threshold,
    },
  };
}