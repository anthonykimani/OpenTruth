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
import { 
  SEAL_PACKAGE_ID, 
  KEY_SERVER_OBJECT_ID, 
  SUI_RPC_URL 
} from '../config/seal-config';
import { SuiClient } from '@mysten/sui/client';
import type { OpenTruthCertificate } from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Threshold for localnet key server
 * Using 1 for single key server on localnet
 */
const DEFAULT_THRESHOLD = 1;

/**
 * Key server configuration for localnet
 */
function getKeyServerConfig(): KeyServerConfig {
  return {
    objectId: KEY_SERVER_OBJECT_ID,
    weight: 1,
  };
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
    
    // ✅ FIXED: Generate a valid 32-byte hex key ID from timestamp
    const timestamp = Date.now();
    const keyIdBuffer = new Uint8Array(32);
    // Fill first 8 bytes with timestamp (Big-endian)
    new DataView(keyIdBuffer.buffer).setBigUint64(0, BigInt(timestamp), false);
    // Convert to hex string
    const keyId = '0x' + Array.from(keyIdBuffer).map(b => b.toString(16).padStart(2, '0')).join('');

    const sealClient = new SealClient({
      suiClient: suiClient as any, // Type assertion for compatibility
      serverConfigs: [getKeyServerConfig()],
      verifyKeyServers: false,
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
      serverConfigs: [getKeyServerConfig()],
      verifyKeyServers: false, // Localnet only
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