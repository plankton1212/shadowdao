/**
 * Shared utilities for Vercel API functions.
 * Underscore prefix = not exposed as an API route by Vercel.
 */

const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let result = '';
  while (n > 0n) {
    result = BASE58_CHARS[Number(n % 58n)] + result;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    result = '1' + result;
  }
  return result;
}

function decodeBase58(str: string): Uint8Array {
  let n = 0n;
  for (const ch of str) {
    const idx = BASE58_CHARS.indexOf(ch);
    if (idx < 0) throw new Error(`Invalid base58 character: ${ch}`);
    n = n * 58n + BigInt(idx);
  }
  const bytes: number[] = [];
  while (n > 0n) { bytes.unshift(Number(n & 0xffn)); n >>= 8n; }
  let leading = 0;
  for (const ch of str) { if (ch === '1') leading++; else break; }
  return new Uint8Array([...Array(leading).fill(0), ...bytes]);
}

/**
 * Convert IPFS CIDv0 (Qm...) to bytes32 (the 32-byte SHA-256 digest).
 * CIDv0 = base58(0x12 + 0x20 + sha256_bytes) — 34 bytes total.
 */
export function cidToBytes32(cid: string): string {
  const decoded = decodeBase58(cid);
  if (decoded.length !== 34 || decoded[0] !== 0x12 || decoded[1] !== 0x20) {
    throw new Error('Not a valid CIDv0 — must start with Qm...');
  }
  const digest = decoded.slice(2);
  return '0x' + Array.from(digest).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Reconstruct CIDv0 from a bytes32 (the 32-byte SHA-256 digest).
 */
export function bytes32ToCid(bytes32: string): string {
  const hex = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
  if (hex.length !== 64) throw new Error('bytes32 must be 64 hex characters');
  const digest = new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const multihash = new Uint8Array([0x12, 0x20, ...digest]);
  return encodeBase58(multihash);
}

/** Validate Ethereum address format */
export function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}
