

import { getCertificateSummary } from '../lib/certificate';
import { Badge } from './ui/badge';
import type { OpenTruthCertificate } from '../types';

interface CertificateDisplayProps {
  certificate: OpenTruthCertificate;
}

export function CertificateDisplay({ certificate }: CertificateDisplayProps) {
  const summary = getCertificateSummary(certificate);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-gray-600">Type</p>
          <Badge variant="outline" className="mt-1">
            {summary.artifactType}
          </Badge>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600">File Name</p>
          <p className="text-sm mt-1">{summary.fileName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600">Size</p>
          <p className="text-sm mt-1">{summary.fileSize}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600">Author</p>
          <p className="text-sm font-mono mt-1">{summary.author}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-medium text-gray-600">Created</p>
          <p className="text-sm mt-1">{summary.timestamp}</p>
        </div>
      </div>

      {/* Artifact Hash */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">Artifact Hash</p>
        <p className="text-xs font-mono bg-gray-50 p-2 rounded break-all">
          {certificate.artifact.hash}
        </p>
      </div>

      {/* Model Info */}
      {certificate.model && (
        <div className="p-3 bg-purple-50 rounded-md">
          <p className="text-sm font-semibold text-purple-900 mb-2">AI Model Information</p>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-purple-800">Model Name</p>
              <p className="text-sm mt-0.5">{certificate.model.name}</p>
            </div>
            {certificate.model.version && (
              <div>
                <p className="text-xs font-medium text-purple-800">Version</p>
                <p className="text-sm mt-0.5">{certificate.model.version}</p>
              </div>
            )}
            {certificate.model.promptHash && (
              <div>
                <p className="text-xs font-medium text-purple-800">Prompt Hash</p>
                <p className="text-xs font-mono mt-0.5 break-all">{certificate.model.promptHash}</p>
              </div>
            )}
            {certificate.model.checkpointHash && (
              <div>
                <p className="text-xs font-medium text-purple-800">Checkpoint Hash</p>
                <p className="text-xs font-mono mt-0.5 break-all">{certificate.model.checkpointHash}</p>
              </div>
            )}
            {certificate.model.datasetMerkleRoot && (
              <div>
                <p className="text-xs font-medium text-purple-800">Dataset Merkle Root</p>
                <p className="text-xs font-mono mt-0.5 break-all">{certificate.model.datasetMerkleRoot}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dataset Info */}
      {certificate.dataset && (
        <div className="p-3 bg-green-50 rounded-md">
          <p className="text-sm font-semibold text-green-900 mb-2">Dataset Information</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs font-medium text-green-800">Files</p>
              <p className="mt-0.5">{certificate.dataset.fileCount}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-green-800">Total Size</p>
              <p className="mt-0.5">{(certificate.dataset.totalSize / 1024).toFixed(2)} KB</p>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs font-medium text-green-800">Merkle Root</p>
            <p className="text-xs font-mono mt-0.5 break-all">{certificate.dataset.merkleRoot}</p>
          </div>
          {certificate.dataset.fileHashes && (
            <details className="mt-2">
              <summary className="text-xs font-medium text-green-800 cursor-pointer hover:underline">
                View File Hashes ({certificate.dataset.fileHashes.length})
              </summary>
              <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                {certificate.dataset.fileHashes.slice(0, 20).map((hash, i) => (
                  <p key={i} className="text-xs font-mono text-green-700">
                    {i + 1}. {hash}
                  </p>
                ))}
                {certificate.dataset.fileHashes.length > 20 && (
                  <p className="text-xs text-green-700">
                    ... and {certificate.dataset.fileHashes.length - 20} more
                  </p>
                )}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Proofs */}
      <div className="p-3 bg-blue-50 rounded-md">
        <p className="text-sm font-semibold text-blue-900 mb-2">Cryptographic Proofs</p>
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-blue-800">Signature Scheme</p>
            <Badge variant="outline" className="mt-1">
              {certificate.proofs.signature.scheme}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-800">Signature</p>
            <p className="text-xs font-mono mt-0.5 break-all">{certificate.proofs.signature.signature}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-800">Public Key</p>
            <p className="text-xs font-mono mt-0.5 break-all">{certificate.proofs.signature.publicKey}</p>
          </div>
          {/* Encryption Section */}
          {certificate.encryption?.enabled && (
            <div className="p-3 bg-purple-50 rounded-md border border-purple-200">
              <p className="text-sm font-semibold text-purple-900 mb-2">
                🔐 Seal Encryption: Enabled
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">Package ID:</span>
                  <p className="font-mono break-all">{certificate.encryption.packageId}</p>
                </div>
                <div>
                  <span className="font-medium">Key ID:</span>
                  <p className="font-mono break-all">{certificate.encryption.keyId}</p>
                </div>
                <div>
                  <span className="font-medium">Threshold:</span> {certificate.encryption.threshold}/N
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Storage */}
      <div className="p-3 bg-gray-50 rounded-md">
        <p className="text-sm font-semibold text-gray-900 mb-2">Storage Information</p>
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-gray-700">Walrus Blob ID</p>
            <p className="text-xs font-mono mt-0.5 break-all">{certificate.storage.walrusBlobId}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-medium text-gray-700">Network</p>
              <Badge variant="outline" className="mt-1">
                {certificate.storage.network}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700">Uploaded</p>
              <p className="text-xs mt-1">
                {new Date(certificate.storage.uploadedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Raw JSON */}
      <details className="text-xs">
        <summary className="cursor-pointer font-medium text-gray-700 hover:underline">
          View Raw Certificate JSON
        </summary>
        <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
          {JSON.stringify(certificate, null, 2)}
        </pre>
      </details>
    </div>
  );
}
