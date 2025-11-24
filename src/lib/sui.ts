import { useSignPersonalMessage } from "@mysten/dapp-kit";
import { verifyPersonalMessage } from "@mysten/sui.js/verify";
import type { OpenTruthCertificate } from "../types";

/**
 * Serialize certificate for signing (deterministic)
 */
export function serializeForSigning(cert: any): string {
  // Remove proofs and storage before signing (they're added after)
  const { proofs, storage, ...certToSign } = cert;
  
  // Sort keys for deterministic JSON
  return JSON.stringify(certToSign, Object.keys(certToSign).sort());
}

/**
 * Sign certificate with Sui wallet
 */
export async function signCertificate(
  certificate: any,
  signMessage: ReturnType<typeof useSignPersonalMessage>["mutateAsync"]
): Promise<{ signature: string; publicKey: string }> {
  const message = serializeForSigning(certificate);
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);
  
  // Sign with wallet
  const { signature } = await signMessage({ message: messageBytes });
  
  // Note: Public key should come from the account object
  // For now, we'll extract it from the signature response if available
  return {
    signature,
    publicKey: "0x", // Will be filled by caller with account.publicKey
  };
}

/**
 * Verify certificate signature using Sui SDK
 */
export async function verifyCertificateSignature(
  certificate: OpenTruthCertificate,
  signature: string,
  _publicKey: string
): Promise<boolean> {
  try {
    // Remove proofs and storage before verifying (same as signing)
    const { proofs, storage, ...certToVerify } = certificate;
    const message = serializeForSigning(certToVerify);
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    
    // Verify using Sui's verify function
    const isValid = await verifyPersonalMessage(messageBytes, signature);
    
    // Check that the signature address matches the certificate author
    const signatureAddress = isValid.toSuiAddress();
    return signatureAddress === certificate.author.suiAddress;
  } catch (error) {
    console.error("Signature verification failed:", error);
    return false;
  }
}

/**
 * Format Sui address for display (0x1234...cdef)
 */
export function formatSuiAddress(address: string, length: number = 6): string {
  if (!address.startsWith("0x")) return address;
  if (address.length <= 2 + length * 2) return address;
  
  return `${address.slice(0, 2 + length)}...${address.slice(-length)}`;
}

/**
 * Validate Sui address format
 */
export function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}