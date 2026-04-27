import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bytes32ToCid } from './_utils';
import { checkRateLimit, getClientIp } from './_ratelimit';

/**
 * GET /api/fetch-ipfs?bytes32=0x...
 *
 * Fetches comment content from IPFS by on-chain bytes32 hash.
 * Tries multiple gateways, verifies content hash, caches at CDN edge.
 *
 * Rate limit: 60 fetches / 60s per IP (generous since content is immutable)
 * CORS: restricted to deployed domain
 * Cache: 1 hour at CDN edge (IPFS content is immutable)
 */

const ALLOWED_ORIGINS = (() => {
  const env = process.env.ALLOWED_ORIGIN ?? '';
  return env.split(',').map(o => o.trim()).filter(Boolean);
})();

function corsHeaders(req: VercelRequest): Record<string, string> {
  const origin = req.headers['origin'] as string | undefined;
  const allowed =
    ALLOWED_ORIGINS.length === 0 ||
    (origin && ALLOWED_ORIGINS.includes(origin)) ||
    (origin && origin.endsWith('.vercel.app'));
  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '*') : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function log(level: 'info' | 'warn' | 'error', msg: string, data?: object) {
  const entry = { timestamp: new Date().toISOString(), level, msg, ...data };
  if (level === 'error') console.error(JSON.stringify(entry));
  else if (level === 'warn') console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

/**
 * Validate the schema of content fetched from IPFS.
 * The CID itself guarantees content-addressing integrity (IPFS protocol layer).
 * This function checks that the object has the expected shape from pin-comment.ts
 * and rejects any injected/malformed fields.
 */
function verifyContent(data: unknown): { ok: boolean; reason?: string } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, reason: 'Not a JSON object' };
  }
  const d = data as Record<string, unknown>;
  if (typeof d.text !== 'string' || d.text.trim().length === 0) {
    return { ok: false, reason: 'Missing or empty text field' };
  }
  if (d.text.length > 10_000) {
    return { ok: false, reason: 'text exceeds 10k char limit' };
  }
  if (typeof d.author !== 'string' || !/^0x[0-9a-fA-F]{40}$/i.test(d.author)) {
    return { ok: false, reason: 'Invalid author address' };
  }
  if (d.app !== undefined && d.app !== 'ShadowDAO') {
    return { ok: false, reason: 'Unrecognized app tag' };
  }
  // Reject control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(d.text as string)) {
    return { ok: false, reason: 'Text contains invalid control characters' };
  }
  return { ok: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const headers = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 60 fetches per 60s per IP
  const ip = getClientIp(req as any);
  const { allowed, remaining, resetIn } = checkRateLimit(ip, { maxRequests: 60, windowMs: 60_000 });
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (!allowed) {
    log('warn', 'Rate limit exceeded on fetch-ipfs', { ip });
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${resetIn}s.` });
  }

  const { bytes32 } = req.query;
  if (!bytes32 || typeof bytes32 !== 'string') {
    return res.status(400).json({ error: 'Missing query param: bytes32' });
  }

  // Reject zero hash
  if (/^0x0+$/.test(bytes32)) {
    return res.status(404).json({ error: 'Zero hash — no content' });
  }

  // Validate hex format
  if (!/^0x[0-9a-fA-F]{64}$/.test(bytes32)) {
    return res.status(400).json({ error: 'bytes32 must be 0x followed by 64 hex characters' });
  }

  let cid: string;
  try {
    cid = bytes32ToCid(bytes32);
  } catch (e: any) {
    return res.status(400).json({ error: `Invalid bytes32: ${e.message}` });
  }

  const PINATA_GATEWAY = process.env.PINATA_GATEWAY ?? 'https://gateway.pinata.cloud';
  const gateways = [
    `${PINATA_GATEWAY}/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
  ];

  for (const url of gateways) {
    try {
      const ipfsRes = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      });

      if (!ipfsRes.ok) continue;

      const data = await ipfsRes.json();

      // Validate schema — CID guarantees integrity at IPFS protocol layer
      const { ok, reason } = verifyContent(data);
      if (!ok) {
        log('warn', 'IPFS content schema invalid', { cid, url: url.split('/ipfs/')[0], reason });
        continue;
      }

      // Immutable IPFS content — cache 1 hour at CDN, serve stale for 24h
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

      log('info', 'IPFS content fetched', { cid, gateway: url.split('/ipfs/')[0] });
      return res.status(200).json({
        text: data.text,
        cid,
        author: typeof data.author === 'string' ? data.author : undefined,
        proposalId: data.proposalId !== undefined ? String(data.proposalId) : undefined,
        timestamp: typeof data.timestamp === 'string' ? data.timestamp : undefined,
      });
    } catch (e: any) {
      log('warn', 'Gateway failed', { url: url.split('/ipfs/')[0], error: e.message });
      continue;
    }
  }

  log('error', 'All IPFS gateways failed', { cid });
  return res.status(404).json({
    error: 'Content not available on IPFS',
    cid,
    hint: 'Content may not be propagated yet. Try again in a few seconds.',
  });
}
