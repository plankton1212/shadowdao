/**
 * IPFS client utilities — all calls go through Vercel serverless functions.
 *
 * Architecture:
 *   Browser → POST /api/pin-comment   → Vercel Function → Pinata API (JWT server-side)
 *   Browser → GET  /api/fetch-ipfs    → Vercel Function → IPFS gateways → cached at CDN
 *
 * The Pinata JWT never reaches the browser. It lives only in Vercel env variables.
 *
 * Setup (one-time, in Vercel dashboard):
 *   Settings → Environment Variables → Add:
 *     PINATA_JWT   = your_jwt_from_pinata_cloud
 *     PINATA_GATEWAY = https://gateway.pinata.cloud  (optional, default)
 */

export interface PinResult {
  cid: string;
  bytes32: `0x${string}`;
}

/**
 * Pin a comment to IPFS via the Vercel serverless function.
 * Returns the IPFS CID and bytes32 for on-chain storage.
 */
export async function pinCommentToIPFS(params: {
  text: string;
  author: string;
  proposalId: string;
}): Promise<PinResult> {
  const res = await fetch('/api/pin-comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (res.status === 503) {
      throw new Error(
        'IPFS pinning not configured on server.\n' +
        'Add PINATA_JWT to Vercel Environment Variables → Redeploy.'
      );
    }
    throw new Error(err.error ?? `Pin failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    cid: data.cid,
    bytes32: data.bytes32 as `0x${string}`,
  };
}

/**
 * Fetch comment text from IPFS via the Vercel serverless function.
 * The function tries multiple gateways and caches at the CDN edge.
 * Returns the comment text or null if unavailable.
 */
export async function fetchCommentFromIPFS(bytes32: string): Promise<string | null> {
  if (!bytes32 || bytes32 === '0x' + '0'.repeat(64)) return null;

  try {
    const res = await fetch(`/api/fetch-ipfs?bytes32=${encodeURIComponent(bytes32)}`, {
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return typeof data.text === 'string' ? data.text : null;
  } catch {
    return null;
  }
}

/**
 * Check if IPFS pinning is available on this deployment.
 * Returns true if the server is healthy (doesn't guarantee Pinata is configured).
 */
export async function checkIPFSBackend(): Promise<boolean> {
  try {
    const res = await fetch('/api/fetch-ipfs?bytes32=0x' + '0'.repeat(64));
    // 404 = backend running but hash not found (expected)
    // 503 = backend running but Pinata not configured (still counts as "up")
    // network error = Vercel Functions not deployed
    return res.status !== 0;
  } catch {
    return false;
  }
}

// Legacy inline CID conversion — kept for components that need bytes32→CID on client side
// (e.g. showing a clickable IPFS link without fetching content)
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let result = '';
  while (n > 0n) { result = BASE58[Number(n % 58n)] + result; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; result = '1' + result; }
  return result;
}

export function bytes32ToCid(bytes32: string): string {
  const hex = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
  if (hex.length !== 64) throw new Error('bytes32 must be 64 hex chars');
  const digest = new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  return encodeBase58(new Uint8Array([0x12, 0x20, ...digest]));
}

export function cidToIpfsUrl(bytes32: string): string {
  try {
    const cid = bytes32ToCid(bytes32);
    return `https://ipfs.io/ipfs/${cid}`;
  } catch {
    return '';
  }
}

// pinataConfigured is always true now (checked server-side)
// kept for backward compat with any component that imports it
export const pinataConfigured = true;
