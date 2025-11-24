import { useState } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { decryptFileWithSeal } from '../lib/seal-encryption';
import { bcs } from '@mysten/sui/bcs';
import { Button } from './ui/button';
import type { OpenTruthCertificate } from '../types';
import { KEY_SERVER_OBJECT_ID, SEAL_PACKAGE_ID, SUI_RPC_URL } from '../config/seal-config';
import { SuiClient } from '@mysten/sui/client';

export function DecryptButton({ 
  certificate, 
  encryptedBlobId 
}: { 
  certificate: OpenTruthCertificate;
  encryptedBlobId: string;
}) {
  const [loading, setLoading] = useState(false);
  const account = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();

  const canDecrypt = certificate.encryption?.enabled && 
    account?.address === certificate.author.suiAddress;

  if (!canDecrypt) return null;

  const handleDecrypt = async () => {
    setLoading(true);
    try {
      // Create SuiClient instance for localnet
      const suiClient = new SuiClient({ url: SUI_RPC_URL });
      
      // Use environment variable for Walrus aggregator URL
      const walrusAggregatorUrl = import.meta.env.VITE_WALRUS_AGGREGATOR_URL || 
        "https://aggregator.walrus-testnet.walrus.space";
      
      // Fetch encrypted data from Walrus
      const response = await fetch(
        `${walrusAggregatorUrl}/v1/${encryptedBlobId.replace('BLOB:', '')}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from Walrus: ${response.status}`);
      }
      
      const encryptedData = new Uint8Array(await response.arrayBuffer());

      // Decrypt using Seal
      const decryptedData = await decryptFileWithSeal({
        encryptedData,
        suiAddress: account.address,
        suiClient, // ✅ Added missing suiClient parameter
        signMessage: async (message: Uint8Array) => {
          const result = await signMessage({ message });
          return { signature: result.signature };
        },
        getTxBytes: async () => {
          // Create minimal auth transaction
          const txData = {
            V1: {
              kind: { ProgrammableTransaction: { inputs: [], commands: [] } },
              sender: account.address,
              gasData: {
                payment: [],
                owner: account.address,
                price: '1000',
                budget: '10000000',
              },
              expiration: { None: null },
            },
          };
          return bcs.TransactionData.serialize(txData).toBytes();
        }
      });

      // Create blob and trigger download
      const blob = new Blob([decryptedData.buffer as ArrayBuffer], { 
        type: certificate.artifact.mimeType 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = certificate.artifact.filename || 'decrypted-file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Decryption failed:', error);
      alert(`Failed to decrypt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleDecrypt} disabled={loading}>
      {loading ? 'Decrypting...' : '🔐 Decrypt File'}
    </Button>
  );
}