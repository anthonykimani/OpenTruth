import { hashFile, hashString } from "./crypto";
import type { OpenTruthCertificate } from "../types";

export interface GenerateCertificateParams {
  file: File;
  suiAddress: string;
  modelInfo?: {
    name: string;
    version?: string;
    prompt?: string;
    checkpointHash?: string;
    datasetMerkleRoot?: string;
  };
  datasetInfo?: {
    fileCount: number;
    totalSize: number;
    merkleRoot: string;
    fileHashes: string[];
  };
}

/**
 * Generate base certificate (without proofs and storage)
 */
export async function generateCertificate(
  params: GenerateCertificateParams
): Promise<Omit<OpenTruthCertificate, "proofs" | "storage">> {
  const { file, suiAddress, modelInfo, datasetInfo } = params;
  
  // Hash the file
  const fileHash = await hashFile(file);
  
  // Build base certificate
  const certificate: Omit<OpenTruthCertificate, "proofs" | "storage"> = {
    version: "1.0",
    type: "opentruth.certificate",
    timestamp: Date.now(),
    author: {
      suiAddress,
    },
    artifact: {
      type: inferFileType(file.type),
      hash: fileHash,
      size: file.size,
      mimeType: file.type,
      filename: file.name,
    },
  };
  
  // Add model info if provided
  if (modelInfo?.name) {
    const promptHash = modelInfo.prompt 
      ? await hashString(modelInfo.prompt)
      : undefined;
      
    certificate.model = {
      name: modelInfo.name,
      version: modelInfo.version,
      promptHash,
      checkpointHash: modelInfo.checkpointHash,
      datasetMerkleRoot: modelInfo.datasetMerkleRoot,
    };
  }
  
  // Add dataset info if provided
  if (datasetInfo) {
    certificate.dataset = datasetInfo;
  }
  
  return certificate;
}

/**
 * Generate certificate for dataset (multiple files)
 */
export async function generateDatasetCertificate(
  files: File[],
  fileHashes: string[],
  merkleRoot: string,
  suiAddress: string
): Promise<Omit<OpenTruthCertificate, "proofs" | "storage">> {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  
  // Create a dummy file for the dataset certificate
  const datasetFile = new File(
    [JSON.stringify({ merkleRoot, fileCount: files.length })],
    "dataset.json",
    { type: "application/json" }
  );
  
  const baseCert = await generateCertificate({
    file: datasetFile,
    suiAddress,
  });
  
  // Override with dataset-specific info
  baseCert.dataset = {
    fileCount: files.length,
    totalSize,
    merkleRoot,
    fileHashes,
  };
  
  return baseCert;
}

/**
 * Complete certificate with proofs and storage
 */
export function completeCertificate(
  baseCert: Omit<OpenTruthCertificate, "proofs" | "storage">,
  proofs: OpenTruthCertificate["proofs"],
  storage: OpenTruthCertificate["storage"]
): OpenTruthCertificate {
  return {
    ...baseCert,
    proofs,
    storage,
  };
}

/**
 * Validate certificate structure
 */
export function validateCertificate(cert: any): cert is OpenTruthCertificate {
  const requiredFields = ["version", "type", "timestamp", "author", "artifact", "proofs", "storage"];
  const hasRequired = requiredFields.every((field) => field in cert);
  
  if (!hasRequired) return false;
  
  // Validate artifact
  if (!cert.artifact?.hash?.startsWith("sha256:")) return false;
  if (!Number.isInteger(cert.artifact?.size)) return false;
  
  // Validate proofs
  if (!["ED25519", "SECP256K1"].includes(cert.proofs?.signature?.scheme)) return false;
  
  return true;
}

/**
 * Verify file matches certificate
 */
export async function verifyFileMatchesCertificate(
  file: File,
  cert: OpenTruthCertificate
): Promise<boolean> {
  const fileHash = await hashFile(file);
  return fileHash === cert.artifact.hash;
}

/**
 * Get certificate summary for display
 */
export function getCertificateSummary(cert: OpenTruthCertificate) {
  return {
    artifactType: cert.artifact.type,
    fileName: cert.artifact.filename || "Unknown",
    fileSize: `${(cert.artifact.size / 1024).toFixed(2)} KB`,
    author: cert.author.suiAddress,
    timestamp: new Date(cert.timestamp).toLocaleString(),
    hasModel: !!cert.model,
    hasDataset: !!cert.dataset,
    hasEncryption: cert.encryption?.enabled || false,
  };
}

function inferFileType(mimeType: string): "image" | "video" | "audio" | "document" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}