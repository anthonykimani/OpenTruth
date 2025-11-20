/// <reference types="vite/client" />
const WALRUS_PUBLISHER = import.meta.env.VITE_WALRUS_PUBLISHER_URL || "https://publisher.walrus-testnet.walrus.space";
const WALRUS_AGGREGATOR = import.meta.env.VITE_WALRUS_AGGREGATOR_URL || "https://aggregator.walrus-testnet.walrus.space";

export interface WalrusUploadResponse {
  blobId: string;
  uploadedAt: number;
}

/**
 * Parse Walrus response to extract blobId
 */
function parseBlobId(result: any): string {
  // Handle both newlyCreated and alreadyCertified responses
  const blobId = result.newlyCreated?.blobObject?.blobId || 
                 result.alreadyCertified?.blobId;
  
  if (!blobId) {
    console.error("Invalid Walrus response:", result);
    throw new Error("No blobId found in Walrus response");
  }
  
  return blobId;
}

/**
 * Upload data to Walrus
 */
export async function uploadToWalrus(
  data: Blob | File,
  options?: { epochs?: number }
): Promise<WalrusUploadResponse> {
  try {
    const contentType = data instanceof File ? data.type : "application/octet-stream";
    
    const url = new URL(`${WALRUS_PUBLISHER}/v1/store`);
    if (options?.epochs) {
      url.searchParams.append("epochs", options.epochs.toString());
    }
    
    const response = await fetch(url.toString(), {
      method: "PUT",
      body: data,
      headers: {
        "Content-Type": contentType,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Walrus upload failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    const blobId = parseBlobId(result);
    
    return {
      blobId: `BLOB:${blobId}`,
      uploadedAt: Date.now(),
    };
  } catch (error) {
    console.error("Walrus upload error:", error);
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Retrieve data from Walrus
 */
export async function readFromWalrus(blobId: string): Promise<Blob> {
  try {
    const cleanBlobId = blobId.replace(/^BLOB:/, "");
    const response = await fetch(`${WALRUS_AGGREGATOR}/v1/${cleanBlobId}`);
    
    if (response.status === 404) {
      throw new Error("Certificate not found on Walrus. It may have expired or been deleted.");
    }
    
    if (!response.ok) {
      throw new Error(`Walrus read failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error("Walrus read error:", error);
    throw error;
  }
}

/**
 * Upload certificate JSON to Walrus
 */
export async function uploadCertificate(
  certificate: any,
  options?: { epochs?: number }
): Promise<string> {
  const blob = new Blob([JSON.stringify(certificate, null, 2)], {
    type: "application/json",
  });
  
  const { blobId } = await uploadToWalrus(blob, options);
  return blobId;
}

/**
 * Retrieve certificate from Walrus
 */
export async function getCertificate(blobId: string): Promise<any> {
  const blob = await readFromWalrus(blobId);
  const text = await blob.text();
  
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("Invalid certificate JSON from Walrus");
  }
}

/**
 * Get Walrus Explorer URL
 */
export function getWalrusExplorerUrl(blobId: string): string {
  const cleanBlobId = blobId.replace(/^BLOB:/, "");
  return `https://walruscan.com/object/${cleanBlobId}`;
}