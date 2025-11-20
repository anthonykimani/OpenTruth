import { useState } from "react";
import { getCertificate, getWalrusExplorerUrl } from "../lib/walrus";
import { validateCertificate, verifyFileMatchesCertificate } from "../lib/certificate";
import { verifyCertificateSignature } from "../lib/sui";
import { Card } from "./ui/card";
import { Alert } from "./ui/alert";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { CertificateDisplay } from "./CertificateDisplay";

interface VerificationResult {
  valid: boolean;
  certificate?: any;
  checks: {
    structureValid: boolean;
    hashMatch: boolean;
    signatureValid: boolean;
  };
  error?: string;
}

export function VerifyForm() {
  const [file, setFile] = useState<File | null>(null);
  const [certBlobId, setCertBlobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [progress, setProgress] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setResult(null);
  };

  const handleVerify = async () => {
    if (!file || !certBlobId.trim()) {
      setResult({
        valid: false,
        checks: {
          structureValid: false,
          hashMatch: false,
          signatureValid: false,
        },
        error: "Please provide both a file and certificate blob ID",
      });
      return;
    }

    try {
      setLoading(true);
      setProgress("Fetching certificate from Walrus...");

      // 1. Fetch certificate from Walrus
      const certificate = await getCertificate(certBlobId.trim());

      setProgress("Validating certificate structure...");

      // 2. Validate certificate structure
      const structureValid = validateCertificate(certificate);

      if (!structureValid) {
        setResult({
          valid: false,
          certificate,
          checks: {
            structureValid: false,
            hashMatch: false,
            signatureValid: false,
          },
          error: "Invalid certificate structure. Missing required fields.",
        });
        return;
      }

      setProgress("Hashing file for comparison...");

      // 3. Verify file hash matches certificate
      const hashMatch = await verifyFileMatchesCertificate(file, certificate);

      setProgress("Verifying cryptographic signature...");

      // 4. Verify signature
      const signatureValid = await verifyCertificateSignature(
        certificate,
        certificate.proofs.signature.signature,
        certificate.proofs.signature.publicKey
      );

      setProgress("Complete!");

      const allValid = structureValid && hashMatch && signatureValid;

      setResult({
        valid: allValid,
        certificate,
        checks: {
          structureValid,
          hashMatch,
          signatureValid,
        },
      });
    } catch (err) {
      console.error("Verification failed:", err);
      setResult({
        valid: false,
        checks: {
          structureValid: false,
          hashMatch: false,
          signatureValid: false,
        },
        error: err instanceof Error ? err.message : "Verification failed",
      });
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleReset = () => {
    setResult(null);
    setFile(null);
    setCertBlobId("");
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Verify Artifact</h2>
        <p className="text-sm text-gray-600">
          Verify that a file matches its certificate and hasn't been tampered with.
        </p>
      </div>

      {/* Verification Result */}
      {result && (
        <Alert variant={result.valid ? "default" : "destructive"} className="border-2">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{result.valid ? "✅" : "❌"}</span>
              <div>
                <p className="font-semibold text-lg">
                  {result.valid ? "Verification Passed!" : "Verification Failed"}
                </p>
                {result.error && (
                  <p className="text-sm mt-1 text-gray-600">{result.error}</p>
                )}
              </div>
            </div>

            {/* Detailed Checks */}
            <div className="space-y-2 pl-10">
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">
                  {result.checks.structureValid ? "✓" : "✗"}
                </span>
                <span className="text-sm">
                  Certificate structure: {" "}
                  <span className={result.checks.structureValid ? "text-green-700" : "text-red-700"}>
                    {result.checks.structureValid ? "Valid" : "Invalid"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">
                  {result.checks.hashMatch ? "✓" : "✗"}
                </span>
                <span className="text-sm">
                  File hash: {" "}
                  <span className={result.checks.hashMatch ? "text-green-700" : "text-red-700"}>
                    {result.checks.hashMatch ? "Matches certificate" : "Mismatch detected!"}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">
                  {result.checks.signatureValid ? "✓" : "✗"}
                </span>
                <span className="text-sm">
                  Signature: {" "}
                  <span className={result.checks.signatureValid ? "text-green-700" : "text-red-700"}>
                    {result.checks.signatureValid ? "Valid" : "Invalid"}
                  </span>
                </span>
              </div>
            </div>

            {result.valid && (
              <div className="pt-3 border-t bg-green-50 p-3 rounded">
                <p className="text-sm font-medium text-green-900">
                  ✅ This file is authentic and matches its certificate.
                </p>
                <p className="text-xs text-green-700 mt-1">
                  The cryptographic hash and signature are both valid. The certificate is stored immutably on Walrus.
                </p>
              </div>
            )}

            {!result.valid && !result.error && (
              <div className="pt-3 border-t bg-red-50 p-3 rounded">
                <p className="text-sm font-medium text-red-900">
                  ⚠️ Warning: This file may have been tampered with or the certificate is invalid.
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Do not trust this file. The hash does not match the certificate or the signature is invalid.
                </p>
              </div>
            )}
          </div>
        </Alert>
      )}

      {/* Input Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="certBlobId">Certificate Blob ID *</Label>
          <Input
            id="certBlobId"
            type="text"
            placeholder="BLOB:0xabc123..."
            value={certBlobId}
            onChange={(e) => setCertBlobId(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-gray-600">
            This is the blob ID returned when the certificate was generated. It starts with "BLOB:".
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file">File to Verify *</Label>
          <Input
            id="file"
            type="file"
            onChange={handleFileChange}
            disabled={loading}
          />
          {file && (
            <p className="text-xs text-gray-600">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleVerify}
          disabled={!file || !certBlobId.trim() || loading}
          className="flex-1"
          size="lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⚙️</span>
              <span>{progress || "Verifying..."}</span>
            </span>
          ) : (
            "Verify"
          )}
        </Button>

        {result && (
          <Button onClick={handleReset} variant="outline" size="lg">
            Reset
          </Button>
        )}
      </div>

      {/* Certificate Display */}
      {result?.certificate && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-3">Certificate Details</h3>
          <CertificateDisplay certificate={result.certificate} />

          <div className="mt-4">
            <a
              href={getWalrusExplorerUrl(certBlobId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              View on Walrus Explorer →
            </a>
          </div>
        </div>
      )}

      {/* Tips */}
      {!result && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-2">How Verification Works</p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>The file is hashed using SHA-256 (client-side)</li>
            <li>The hash is compared with the certificate's stored hash</li>
            <li>The certificate's cryptographic signature is verified</li>
            <li>All checks must pass for successful verification</li>
          </ul>
        </div>
      )}
    </Card>
  );
}