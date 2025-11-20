/**
 * Cryptographic utilities for OpenTruth
 * Uses Web Crypto API for SHA-256 hashing (zero dependencies)
 */

/**
 * Compute SHA-256 hash of a file
 *
 * @param file - The file to hash
 * @returns Promise resolving to hash string with "sha256:" prefix
 *
 * @example
 * ```typescript
 * const file = new File(["hello"], "test.txt");
 * const hash = await hashFile(file);
 * // Returns: "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
 * ```
 */
export async function hashFile(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `sha256:${hashHex}`;
  } catch (error) {
    console.error('Error hashing file:', error);
    throw new Error(`Failed to hash file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compute SHA-256 hash of a string
 *
 * @param input - The string to hash
 * @returns Promise resolving to hash string with "sha256:" prefix
 *
 * @example
 * ```typescript
 * const hash = await hashString("hello world");
 * // Returns: "sha256:b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
 * ```
 */
export async function hashString(input: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `sha256:${hashHex}`;
  } catch (error) {
    console.error('Error hashing string:', error);
    throw new Error(`Failed to hash string: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Hash multiple files and return array of hashes
 * Processes files in parallel for performance
 *
 * @param files - Array of files to hash
 * @returns Promise resolving to array of hash strings
 *
 * @example
 * ```typescript
 * const files = [file1, file2, file3];
 * const hashes = await hashFiles(files);
 * // Returns: ["sha256:abc...", "sha256:def...", "sha256:ghi..."]
 * ```
 */
export async function hashFiles(files: File[]): Promise<string[]> {
  try {
    return await Promise.all(files.map(f => hashFile(f)));
  } catch (error) {
    console.error('Error hashing multiple files:', error);
    throw new Error(`Failed to hash files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compute SHA-256 hash of raw bytes
 * Useful for hashing binary data or buffers
 *
 * @param data - The data to hash (ArrayBuffer, Uint8Array, etc.)
 * @returns Promise resolving to hash string with "sha256:" prefix
 *
 * @example
 * ```typescript
 * const buffer = new Uint8Array([1, 2, 3, 4]);
 * const hash = await hashBytes(buffer);
 * ```
 */
export async function hashBytes(data: ArrayBuffer | Uint8Array): Promise<string> {
  try {
    const buffer = data instanceof Uint8Array ? data.buffer as ArrayBuffer : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `sha256:${hashHex}`;
  } catch (error) {
    console.error('Error hashing bytes:', error);
    throw new Error(`Failed to hash bytes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify that a file matches a given hash
 *
 * @param file - The file to verify
 * @param expectedHash - The expected hash (with or without "sha256:" prefix)
 * @returns Promise resolving to true if hashes match, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = await verifyFileHash(file, "sha256:abc123...");
 * if (isValid) {
 *   console.log("File integrity verified!");
 * }
 * ```
 */
export async function verifyFileHash(file: File, expectedHash: string): Promise<boolean> {
  try {
    const actualHash = await hashFile(file);
    const normalizedExpected = expectedHash.startsWith('sha256:')
      ? expectedHash
      : `sha256:${expectedHash}`;
    return actualHash === normalizedExpected;
  } catch (error) {
    console.error('Error verifying file hash:', error);
    return false;
  }
}

/**
 * Strip the "sha256:" prefix from a hash string
 *
 * @param hash - Hash string with or without prefix
 * @returns Hash string without prefix
 *
 * @example
 * ```typescript
 * const clean = stripHashPrefix("sha256:abc123");
 * // Returns: "abc123"
 * ```
 */
export function stripHashPrefix(hash: string): string {
  return hash.replace(/^sha256:/, '');
}

/**
 * Add the "sha256:" prefix to a hash string if not present
 *
 * @param hash - Hash string with or without prefix
 * @returns Hash string with prefix
 *
 * @example
 * ```typescript
 * const prefixed = addHashPrefix("abc123");
 * // Returns: "sha256:abc123"
 * ```
 */
export function addHashPrefix(hash: string): string {
  return hash.startsWith('sha256:') ? hash : `sha256:${hash}`;
}
