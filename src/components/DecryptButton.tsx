import { useState } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { decryptFileWithSeal } from '../lib/seal-encryption';
import { bcs } from '@mysten/sui/bcs';
import { Button } from './ui/button';
import type { OpenTruthCertificate } from '../types';

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
      // Fetch encrypted data from Walrus
      const response = await fetch(
        `https://aggregator.walrus-testnet.walrus.space/v1/${encryptedBlobId.replace('BLOB:', '')}`
      );
      const encryptedData = new Uint8Array(await response.arrayBuffer());

      // Decrypt using Seal
      const decryptedData = await decryptFileWithSeal({
        encryptedData,
        suiAddress: account.address,
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

      // Directly use decryptedData for Blob (no casting needed)
      const blob = new Blob([decryptedData.buffer as ArrayBuffer], { type: certificate.artifact.mimeType });
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
      alert('Failed to decrypt. Ensure you have access rights and key servers are available.');
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