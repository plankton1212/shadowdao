import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cidToBytes32, isValidAddress } from './_utils';
import { checkRateLimit, getClientIp } from './_ratelimit';

/**
 * POST /api/pin-comment
 *
 * Pins a DAO proposal comment to Pinata IPFS.
 * JWT stays server-side — never exposed to the browser.
 *
 * Rate limit: 10 pins / 60s per IP
 * CORS: restricted to the deployed Vercel domain (ALLOWED_ORIGIN env var)
 *
 * Body: { text: string, author: string, proposalId: string }
 * Returns: { cid: string, bytes32: string }
 *
 * Environment variables (set in Vercel dashboard):
 *   PINATA_JWT       = your Pinata JWT
 *   ALLOWED_ORIGIN   = https://shadowdao.vercel.app  (your production domain)
 */

const ALLOWED_ORIGINS = (() => {
  const env = process.env.ALLOWED_ORIGIN ?? '';
  return env.split(',').map(o => o.trim()).filter(Boolean);
})();

function corsHeaders(req: VercelRequest): Record<string, string> {
  const origin = req.headers['origin'] as string | undefined;
  const allowed =
    ALLOWED_ORIGINS.length === 0 ||          // not configured → dev mode, allow all
    (origin && ALLOWED_ORIGINS.includes(origin)) ||
    (origin && origin.endsWith('.vercel.app')); // allow all vercel preview URLs

  return {
    'Access-Control-Allow-Origin': allowed ? (origin ?? '*') : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const headers = corsHeaders(req);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 10 pins per 60 seconds per IP
  const ip = getClientIp(req as any);
  const { allowed, remaining, resetIn } = checkRateLimit(ip, { maxRequests: 10, windowMs: 60_000 });
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(resetIn));

  if (!allowed) {
    log('warn', 'Rate limit exceeded', { ip });
    return res.status(429).json({
      error: `Rate limit exceeded. Try again in ${resetIn}s.`,
    });
  }

  const PINATA_JWT = process.env.PINATA_JWT;
  if (!PINATA_JWT) {
    log('error', 'PINATA_JWT not configured');
    return res.status(503).json({
      error: 'IPFS pinning not configured',
      hint: 'Add PINATA_JWT to Vercel Environment Variables',
    });
  }

  // Input validation
  const { text, author, proposalId } = req.body ?? {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or empty: text' });
  }
  if (text.length > 10_000) {
    return res.status(400).json({ error: 'Comment too long (max 10 000 chars)' });
  }
  if (!author || typeof author !== 'string' || !isValidAddress(author)) {
    return res.status(400).json({ error: 'Invalid author: must be a valid Ethereum address (0x...)' });
  }
  if (proposalId === undefined || proposalId === null) {
    return res.status(400).json({ error: 'Missing: proposalId' });
  }
  const pid = Number(proposalId);
  if (!Number.isInteger(pid) || pid < 0) {
    return res.status(400).json({ error: 'proposalId must be a non-negative integer' });
  }
  // Reject obviously invalid content (control characters, null bytes)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(text)) {
    return res.status(400).json({ error: 'Text contains invalid characters' });
  }

  const payload = {
    pinataContent: {
      text: text.trim(),
      author: author.toLowerCase(),
      proposalId: String(pid),
      timestamp: new Date().toISOString(),
      app: 'ShadowDAO',
    },
    pinataMetadata: {
      name: `shadowdao-comment-${pid}-${Date.now()}`,
      keyvalues: {
        app: 'ShadowDAO',
        proposalId: String(pid),
        author: author.toLowerCase(),
      },
    },
    pinataOptions: { cidVersion: 0 },
  };

  try {
    const pinataRes = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify(payload),
    });

    if (!pinataRes.ok) {
      const errText = await pinataRes.text();
      log('error', 'Pinata error', { status: pinataRes.status, body: errText.slice(0, 200) });
      return res.status(502).json({
        error: `Pinata error ${pinataRes.status}`,
        detail: errText.slice(0, 200),
      });
    }

    const data = await pinataRes.json();
    const cid = data.IpfsHash as string;
    const bytes32 = cidToBytes32(cid);

    log('info', 'Comment pinned', { cid, proposalId: pid, author });
    return res.status(200).json({ cid, bytes32 });
  } catch (err: any) {
    log('error', 'Unexpected error in pin-comment', { message: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
