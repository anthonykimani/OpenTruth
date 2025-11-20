import { useState } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import type { OpenTruthCertificate } from '../types';

import { hashFiles } from '../lib/crypto';
import { buildMerkleTree } from '../lib/merkle';
import { completeCertificate, generateDatasetCertificate } from '../lib/certificate';
import { signCertificate } from '../lib/sui';
import { getWalrusExplorerUrl, uploadCertificate } from '../lib/walrus';
import { saveCertificate } from '../lib/storage';
import { Card } from './ui/card';
import { Alert } from './ui/alert';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';

export function DatasetUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [merkleRoot, setMerkleRoot] = useState<string>('');
  const [fileHashes, setFileHashes] = useState<string[]>([]);
  const [certificate, setCertificate] = useState<OpenTruthCertificate | null>(null);
  const [certBlobId, setCertBlobId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const account = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setError(null);
    setMerkleRoot('');
    setFileHashes([]);
    setCertificate(null);
    setCertBlobId('');
  };

  const handleGenerateMerkleRoot = async () => {
    if (files.length === 0) {
      setError('Please select files first');
      return;
    }

    try {
      setLoading(true);
      setProgress('Hashing files...');

      const hashes = await hashFiles(files);
      setFileHashes(hashes);

      setProgress('Building Merkle tree...');
      const { root } = await buildMerkleTree(hashes);
      setMerkleRoot(root);

      setProgress('Complete!');
      setError(null);

    } catch (err) {
      console.error('Merkle tree generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate Merkle root');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleGenerateCertificate = async () => {
    if (!merkleRoot || !account) {
      setError('Please generate Merkle root and connect wallet first');
      return;
    }

    try {
      setLoading(true);
      setProgress('Generating dataset certificate...');

      const baseCert = await generateDatasetCertificate(
        files,
        fileHashes,
        merkleRoot,
        account.address
      );

      setProgress('Signing certificate...');
      const { signature, publicKey } = await signCertificate(baseCert, signMessage);

      setProgress('Completing certificate...');
      const completeCert = completeCertificate(
        baseCert,
        {
          signature: {
            scheme: 'ED25519' as const,
            signature,
            publicKey,
          },
        },
        {
          walrusBlobId: '',
 // Will be set after upload
          network: 'testnet',
          uploadedAt: Date.now(),
        }
      );

      setProgress('Uploading certificate...');
      const blobId = await uploadCertificate(completeCert);
      setCertBlobId(blobId);

      completeCert.storage.walrusBlobId = blobId;
      setCertificate(completeCert);

      setProgress('Saving to storage...');
      saveCertificate(blobId, completeCert, {
        tags: ['dataset'],
        notes: `Dataset with ${files.length} files`,
      });

      setProgress('Complete!');
      setError(null);

    } catch (err) {
      console.error('Certificate generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate certificate');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setMerkleRoot('');
    setFileHashes([]);
    setCertificate(null);
    setCertBlobId('');
    setError(null);
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dataset Provenance</h2>
        <p className="text-sm text-gray-600">
          Create cryptographic proof of dataset composition using Merkle trees.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <p className="text-sm font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      {!account && (
        <Alert>
          <p className="text-sm font-medium">Wallet Required</p>
          <p className="text-sm">Please connect your Sui wallet to continue.</p>
        </Alert>
      )}

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="files">Upload Dataset Files *</Label>
        <Input
          id="files"
          type="file"
          multiple
          onChange={handleFilesChange}
          disabled={loading}
          accept="image/*,.txt,.json,.csv"
        />
        {files.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium">
              {files.length} file{files.length > 1 ? 's' : ''} selected ({(totalSize / 1024).toFixed(2)} KB total)
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {files.slice(0, 10).map((file, i) => (
                <p key={i} className="text-xs text-gray-600">
                  {i + 1}. {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              ))}
              {files.length > 10 && (
                <p className="text-xs text-gray-600">
                  ... and {files.length - 10} more files
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generate Merkle Root */}
      <div className="flex gap-3">
        <Button
          onClick={handleGenerateMerkleRoot}
          disabled={files.length === 0 || loading}
          variant="outline"
          className="flex-1"
        >
          {loading && !merkleRoot ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚙️</span>
              {progress}
            </span>
          ) : merkleRoot ? (
            '✓ Merkle Root Generated'
          ) : (
            'Generate Merkle Root'
          )}
        </Button>

        {merkleRoot && (
          <Button
            onClick={handleReset}
            variant="ghost"
            size="sm"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Merkle Root Display */}
      {merkleRoot && (
        <div className="p-4 bg-green-50 rounded-md space-y-3">
          <div>
            <p className="text-sm font-semibold text-green-900">Merkle Root:</p>
            <p className="text-xs font-mono mt-1 break-all text-green-800">{merkleRoot}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="font-medium">Files:</span> {files.length}
            </div>
            <div>
              <span className="font-medium">Total Size:</span> {(totalSize / 1024).toFixed(2)} KB
            </div>
          </div>

          {/* File Hashes */}
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-green-900 hover:underline">
              View File Hashes ({fileHashes.length})
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {fileHashes.map((hash, i) => (
                <p key={i} className="font-mono text-green-800">
                  {i + 1}. {hash}
                </p>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Generate Certificate */}
      {merkleRoot && !certificate && (
        <Button
          onClick={handleGenerateCertificate}
          disabled={!account || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚙️</span>
              {progress}
            </span>
          ) : (
            'Generate Dataset Certificate'
          )}
        </Button>
      )}

      {/* Certificate Success */}
      {certificate && certBlobId && (
        <div className="p-4 bg-blue-50 rounded-md space-y-3">
          <p className="font-semibold text-blue-900">✓ Dataset Certificate Generated!</p>

          <div>
            <p className="text-sm font-medium">Certificate Blob ID:</p>
            <p className="text-xs font-mono mt-1 break-all">{certBlobId}</p>
            <a
              href={getWalrusExplorerUrl(certBlobId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-1 inline-block"
            >
              View on Walrus Explorer →
            </a>
          </div>
        </div>
      )}

      {/* Info */}
      {!merkleRoot && (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm font-medium text-gray-900 mb-2">How Dataset Provenance Works</p>
          <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
            <li>Each file in the dataset is hashed with SHA-256</li>
            <li>A Merkle tree is built from these hashes</li>
            <li>The Merkle root uniquely identifies the dataset</li>
            <li>You can prove any file belongs to the dataset using a Merkle proof</li>
            <li>Model checkpoints can reference this root for full provenance</li>
          </ul>
        </div>
      )}
    </Card>
  );
}