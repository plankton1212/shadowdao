import type { VercelRequest, VercelResponse } from '@vercel/node';
import { bytes32ToCid } from './_utils';

/**
 * GET /api/fetch-ipfs?bytes32=0x...
 *
 * Fetches IPFS comment content by on-chain bytes32 hash.
 * Tries Pinata gateway first, falls back to public IPFS gateways.
 * Response is cached at the CDN edge for 1 hour (content is immutable on IPFS).
 *
 * Returns: { text: string, cid: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bytes32 } = req.query;
  if (!bytes32 || typeof bytes32 !== 'string') {
    return res.status(400).json({ error: 'Missing query param: bytes32' });
  }

  // Zero hash = no content
  if (bytes32.replace('0x', '').replace(/0/g, '') === '') {
    return res.status(404).json({ error: 'Empty hash' });
  }

  let cid: string;
  try {
    cid = bytes32ToCid(bytes32);
  } catch (e: any) {
    return res.status(400).json({ error: `Invalid bytes32: ${e.message}` });
  }

  // Try multiple IPFS gateways in order (Pinata first for pinned content)
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
      if (typeof data?.text !== 'string') continue;

      // IPFS content is immutable — cache at edge for 1 hour, serve stale for 24h
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({
        text: data.text,
        cid,
        author: data.author,
        proposalId: data.proposalId,
        timestamp: data.timestamp,
      });
    } catch {
      continue;
    }
  }

  return res.status(404).json({
    error: 'Content not available on IPFS',
    cid,
    hint: 'Content may not be pinned yet or gateways are slow',
  });
}
