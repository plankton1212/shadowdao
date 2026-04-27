import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cidToBytes32 } from './_utils';

/**
 * POST /api/pin-comment
 *
 * Pins a DAO proposal comment to Pinata IPFS.
 * JWT stays server-side — never exposed to the browser.
 *
 * Body: { text: string, author: string, proposalId: string }
 * Returns: { cid: string, bytes32: string }
 *
 * Environment variable required (set in Vercel dashboard):
 *   PINATA_JWT=your_pinata_jwt_token
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const PINATA_JWT = process.env.PINATA_JWT;
  if (!PINATA_JWT) {
    return res.status(503).json({
      error: 'IPFS pinning not configured',
      hint: 'Add PINATA_JWT to Vercel Environment Variables',
    });
  }

  const { text, author, proposalId } = req.body ?? {};

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid: text' });
  }
  if (!author || typeof author !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid: author' });
  }
  if (!proposalId && proposalId !== 0) {
    return res.status(400).json({ error: 'Missing: proposalId' });
  }
  if (text.length > 10_000) {
    return res.status(400).json({ error: 'Comment too long (max 10 000 chars)' });
  }

  const payload = {
    pinataContent: {
      text: text.trim(),
      author,
      proposalId: String(proposalId),
      timestamp: new Date().toISOString(),
      app: 'ShadowDAO',
    },
    pinataMetadata: {
      name: `shadowdao-comment-${proposalId}-${Date.now()}`,
      keyvalues: {
        app: 'ShadowDAO',
        proposalId: String(proposalId),
        author,
      },
    },
    pinataOptions: { cidVersion: 0 }, // CIDv0 (Qm...) for bytes32 compatibility
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
      console.error('[pin-comment] Pinata error:', pinataRes.status, errText);
      return res.status(502).json({
        error: `Pinata error ${pinataRes.status}`,
        detail: errText,
      });
    }

    const data = await pinataRes.json();
    const cid = data.IpfsHash as string; // CIDv0: QmXXX...
    const bytes32 = cidToBytes32(cid);

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ cid, bytes32 });
  } catch (err: any) {
    console.error('[pin-comment] Unexpected error:', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
