import type { OpenTruthCertificate } from "../types";

export interface StoredCertificate {
  id: string;
  certificate: OpenTruthCertificate;
  savedAt: number;
  tags?: string[];
  notes?: string;
}

const STORAGE_KEY = "opentruth_certificates_v1";
const STORAGE_WARNING_THRESHOLD = 0.8; // 80% of quota

/**
 * Get storage quota info
 */
export function getStorageInfo(): { used: number; quota: number; percentage: number } {
  try {
    const used = new Blob(Object.values(localStorage)).size;
    const quota = 5 * 1024 * 1024; // 5MB typical limit
    return {
      used,
      quota,
      percentage: used / quota,
    };
  } catch {
    return { used: 0, quota: 5 * 1024 * 1024, percentage: 0 };
  }
}

/**
 * Save certificate to localStorage
 */
export function saveCertificate(
  blobId: string,
  certificate: OpenTruthCertificate,
  metadata?: { tags?: string[]; notes?: string }
): boolean {
  try {
    const stored: StoredCertificate[] = getAllCertificates();
    
    // Check storage quota
    const storageInfo = getStorageInfo();
    if (storageInfo.percentage > STORAGE_WARNING_THRESHOLD) {
      console.warn("Storage quota warning:", Math.round(storageInfo.percentage * 100) + "% used");
    }
    
    // Check for duplicates
    if (stored.some((s) => s.id === blobId)) {
      console.warn("Certificate already exists in storage:", blobId);
      return true;
    }
    
    const newEntry: StoredCertificate = {
      id: blobId,
      certificate,
      savedAt: Date.now(),
      tags: metadata?.tags || [],
      notes: metadata?.notes,
    };
    
    stored.push(newEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error("Failed to save certificate:", error);
    
    // Check if it's a quota error
    if (error instanceof Error && 
        (error.name === "QuotaExceededError" || 
         error.message.includes("quota") ||
         error.message.includes("storage"))) {
      alert("⚠️ LocalStorage full! Please export and delete old certificates.");
    }
    
    return false;
  }
}

/**
 * Get all stored certificates
 */
export function getAllCertificates(): StoredCertificate[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load certificates:", error);
    return [];
  }
}

/**
 * Search certificates
 */
export function searchCertificates(
  query?: string,
  filters?: {
    artifactType?: string;
    hasModel?: boolean;
    hasDataset?: boolean;
    tags?: string[];
  }
): StoredCertificate[] {
  let certificates = getAllCertificates();
  
  // Text search
  if (query) {
    const q = query.toLowerCase();
    certificates = certificates.filter(
      (c) =>
        c.certificate.artifact.filename?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q)) ||
        c.notes?.toLowerCase().includes(q)
    );
  }
  
  // Type filter
  if (filters?.artifactType) {
    certificates = certificates.filter(
      (c) => c.certificate.artifact.type === filters.artifactType
    );
  }
  
  // Model filter
  if (filters?.hasModel !== undefined) {
    certificates = certificates.filter(
      (c) => !!c.certificate.model === filters.hasModel
    );
  }
  
  // Dataset filter
  if (filters?.hasDataset !== undefined) {
    certificates = certificates.filter(
      (c) => !!c.certificate.dataset === filters.hasDataset
    );
  }
  
  // Tag filter
  if (filters?.tags?.length) {
    certificates = certificates.filter((c) =>
      filters.tags!.some((t) => c.tags?.includes(t))
    );
  }
  
  return certificates.sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Delete certificate
 */
export function deleteCertificate(blobId: string): boolean {
  try {
    const stored = getAllCertificates().filter((s) => s.id !== blobId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch (error) {
    console.error("Failed to delete certificate:", error);
    return false;
  }
}

/**
 * Export all certificates to JSON
 */
export function exportCertificates(): string {
  const data = {
    version: "1.0",
    exportedAt: Date.now(),
    certificates: getAllCertificates(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import certificates from JSON
 */
export function importCertificates(jsonData: string, merge: boolean = true): number {
  try {
    const data = JSON.parse(jsonData);
    if (!data.certificates || !Array.isArray(data.certificates)) {
      throw new Error("Invalid import format");
    }
    
    const existing = merge ? getAllCertificates() : [];
    const existingIds = new Set(existing.map((e) => e.id));
    
    let imported = 0;
    for (const cert of data.certificates) {
      if (!existingIds.has(cert.id)) {
        existing.push(cert);
        imported++;
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return imported;
  } catch (error) {
    console.error("Failed to import certificates:", error);
    throw new Error("Invalid certificate backup file");
  }
}

/**
 * Clear all storage
 */
export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}