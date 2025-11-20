import { useState } from "react";
import { useCurrentAccount, useSignPersonalMessage, useSuiClient } from "@mysten/dapp-kit";
import type { OpenTruthCertificate } from "../types";
import { completeCertificate, generateCertificate } from "../lib/certificate";
import { signCertificate } from "../lib/sui";
import { getWalrusExplorerUrl, uploadCertificate, uploadToWalrus } from "../lib/walrus";
import { saveCertificate } from "../lib/storage";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { CertificateDisplay } from "./CertificateDisplay";
import { Alert } from "./ui/alert";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { addEncryptionToCertificate, encryptFileWithSeal } from "@/lib/seal-encryption";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelVersion, setModelVersion] = useState("");
  const [prompt, setPrompt] = useState("");
  const [checkpointHash, setCheckpointHash] = useState("");
  const [datasetMerkleRoot, setDatasetMerkleRoot] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    certificate: OpenTruthCertificate;
    certificateBlobId: string;
    fileBlobId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const client = useSuiClient();

  const account = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file || !account) {
      setError("Please select a file and connect your wallet");
      return;
    }

    try {
      setLoading(true);
      setProgress("Hashing file...");

      // 1. Generate certificate with plaintext metadata
      const baseCert = await generateCertificate({
        file,
        suiAddress: account.address,
        modelInfo: modelName ? {
          name: modelName,
          version: modelVersion || undefined,
          prompt,
          checkpointHash: checkpointHash || undefined,
          datasetMerkleRoot: datasetMerkleRoot || undefined,
        } : undefined,
      });

      setProgress("Encrypting file with Seal...");

      // 2. Encrypt the file bytes
      const {
        encryptedData,
        packageId,
        keyId,
        threshold,
      } = await encryptFileWithSeal(file, account.address, client);

      setProgress("Uploading encrypted file...");

      // 3. Upload encrypted file to Walrus
      const encryptedBlob = new Blob([encryptedData.buffer as ArrayBuffer]);
      const fileUpload = await uploadToWalrus(encryptedBlob);

      setProgress("Signing certificate...");

      // 4. Sign certificate (plaintext metadata remains public)
      const { signature, publicKey } = await signCertificate(baseCert, signMessage);

      setProgress("Uploading certificate...");

      // 5. Complete certificate with encryption metadata
      const completeCert = completeCertificate(
        baseCert,
        {
          signature: {
            scheme: "ED25519" as const,
            signature,
            publicKey,
          },
        },
        {
          walrusBlobId: fileUpload.blobId, // Encrypted file
          network: "testnet",
          uploadedAt: fileUpload.uploadedAt,
        }
      );

      // 6. Add encryption info
      const finalCert = addEncryptionToCertificate(
        completeCert,
        fileUpload.blobId,
        keyId,
        threshold,
        packageId
      );

      // 7. Upload certificate to Walrus (public for verification)
      const certBlobId = await uploadCertificate(finalCert);

      setResult({
        certificate: finalCert,
        certificateBlobId: certBlobId,
        fileBlobId: fileUpload.blobId,
      });

    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setFile(null);
    setModelName("");
    setModelVersion("");
    setPrompt("");
    setCheckpointHash("");
    setDatasetMerkleRoot("");
  };

  if (result) {
    return (
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-green-700">✅ Certificate Generated Successfully!</h3>
          <Button onClick={handleReset} variant="outline" size="sm">
            Upload Another
          </Button>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-green-50 rounded-md border border-green-200">
            <p className="text-sm font-medium text-gray-700">Certificate Blob ID:</p>
            <p className="text-xs font-mono mt-1 break-all font-semibold">{result.certificateBlobId}</p>
            <a
              href={getWalrusExplorerUrl(result.certificateBlobId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline mt-2 inline-block"
            >
              View on Walrus Explorer →
            </a>
          </div>

          <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm font-medium text-gray-700">File Blob ID:</p>
            <p className="text-xs font-mono mt-1 break-all">{result.fileBlobId}</p>
          </div>

          {/* Encryption Status */}
          {result.certificate.encryption?.enabled && (
            <div className="p-3 bg-purple-50 rounded-md border border-purple-200">
              <p className="text-sm font-medium text-purple-900">🔐 Seal Encryption: Enabled</p>
              <p className="text-xs text-purple-700 mt-1">
                File content is encrypted. Only the owner can decrypt.
              </p>
            </div>
          )}
        </div>

        <CertificateDisplay certificate={result.certificate} />
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Generate Certificate</h2>
        <p className="text-sm text-gray-600">
          Upload a file and generate a cryptographically signed provenance certificate.
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

      <div className="space-y-4">
        {/* File Input */}
        <div className="space-y-2">
          <Label htmlFor="file">File *</Label>
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            disabled={loading}
            accept="image/*,video/*,audio/*,.pdf,.txt,.json"
          />
          {file && (
            <p className="text-xs text-gray-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Model Information (Optional) */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">Model Information (Optional)</h3>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name</Label>
              <Input
                id="modelName"
                type="text"
                placeholder="e.g., DALL-E 3, Stable Diffusion XL"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelVersion">Model Version</Label>
              <Input
                id="modelVersion"
                type="text"
                placeholder="e.g., 1.0, v2.1"
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Generation Prompt</Label>
              <Input
                id="prompt"
                type="text"
                placeholder="e.g., A walrus wearing sunglasses"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkpointHash">Checkpoint Hash</Label>
              <Input
                id="checkpointHash"
                type="text"
                placeholder="sha256:..."
                value={checkpointHash}
                onChange={(e) => setCheckpointHash(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="datasetMerkleRoot">Dataset Merkle Root</Label>
              <Input
                id="datasetMerkleRoot"
                type="text"
                placeholder="0xabc123..."
                value={datasetMerkleRoot}
                onChange={(e) => setDatasetMerkleRoot(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={handleUpload}
          disabled={!file || !account || loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚙️</span>
              <span>{progress || "Processing..."}</span>
            </span>
          ) : (
            "Generate Certificate"
          )}
        </Button>

        {loading && (
          <p className="text-xs text-center text-gray-600 animate-pulse">
            This may take a few seconds...
          </p>
        )}
      </div>

      {!account && (
        <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
          <p className="text-sm font-medium text-yellow-900">Note</p>
          <p className="text-xs text-yellow-700 mt-1">
            A Sui wallet is required to cryptographically sign your certificate.
          </p>
        </div>
      )}
    </Card>
  );
}
