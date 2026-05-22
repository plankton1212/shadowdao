import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { checkRateLimit, getClientIp } from './_ratelimit';

/**
 * POST /api/relay-anon-vote  —  Wave 5 anonymous gasless voting relay.
 *
 * Submits voteAnonymous() on behalf of the voter. Eligibility is carried
 * entirely by the Semaphore zero-knowledge proof, so the voter's wallet
 * address NEVER touches the chain — not as a signer, not as msg.sender.
 * The relayer account is msg.sender and pays gas. This is the transport
 * layer that makes the vote fully anonymous end-to-end.
 *
 * Body:
 *   proposalId    string  — proposal ID (decimal string)
 *   encryptedVote object  — { ctHash, securityZone, utype, signature }
 *   proof         object  — Semaphore proof: { merkleTreeDepth, merkleTreeRoot,
 *                           nullifier, message, scope, points[8] } (decimal strings)
 *
 * Returns: { hash, relayer }
 *
 * Environment variables (Vercel dashboard):
 *   RELAYER_PRIVATE_KEY  = 0x...  (account that pays gas — keep funded on Sepolia)
 *   SEPOLIA_RPC_URL      = https://...
 *   ALLOWED_ORIGIN       = https://shadowdao.vercel.app
 *   SHADOWVOTEV2_ADDRESS = 0x...  (optional — defaults to the bundled address)
 */

const DEFAULT_SHADOWVOTEV2 = '0xA45AD263C91c365b3F8170ebba8FCda7944fBaDa';

const RELAY_ABI = [
  {
    name: 'voteAnonymous',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      {
        name: '_encryptedOption',
        type: 'tuple' as const,
        components: [
          { name: 'ctHash', type: 'uint256' as const },
          { name: 'securityZone', type: 'uint8' as const },
          { name: 'utype', type: 'uint8' as const },
          { name: 'signature', type: 'bytes' as const },
        ],
      },
      {
        name: '_proof',
        type: 'tuple' as const,
        components: [
          { name: 'merkleTreeDepth', type: 'uint256' as const },
          { name: 'merkleTreeRoot', type: 'uint256' as const },
          { name: 'nullifier', type: 'uint256' as const },
          { name: 'message', type: 'uint256' as const },
          { name: 'scope', type: 'uint256' as const },
          { name: 'points', type: 'uint256[8]' as const },
        ],
      },
    ],
    outputs: [],
  },
] as const;

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

/** Validate a decimal-string field and return it, or null if invalid. */
function decStr(v: unknown): string | null {
  return typeof v === 'string' && /^\d+$/.test(v) ? v : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const headers = corsHeaders(req);

  if (req.method === 'OPTIONS') {
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Strict rate limit — relayer pays gas per request
  const ip = getClientIp(req as any);
  const { allowed, remaining, resetIn } = checkRateLimit(ip, { maxRequests: 5, windowMs: 60_000 });
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(resetIn));
  if (!allowed) {
    log('warn', 'Rate limit exceeded on relay-anon-vote', { ip });
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${resetIn}s.` });
  }

  const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
  const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
  if (!RELAYER_PRIVATE_KEY || !SEPOLIA_RPC_URL) {
    log('error', 'Anon relay not configured — missing RELAYER_PRIVATE_KEY or SEPOLIA_RPC_URL');
    return res.status(503).json({
      error: 'Anonymous gasless relay not configured',
      hint: 'Add RELAYER_PRIVATE_KEY and SEPOLIA_RPC_URL to Vercel Environment Variables',
    });
  }

  const { proposalId, encryptedVote, proof } = req.body ?? {};

  const pid = decStr(proposalId);
  if (!pid) {
    return res.status(400).json({ error: 'Invalid: proposalId must be a non-negative integer string' });
  }
  if (!encryptedVote || typeof encryptedVote !== 'object' || typeof encryptedVote.ctHash !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid: encryptedVote { ctHash, ... }' });
  }
  if (!proof || typeof proof !== 'object') {
    return res.status(400).json({ error: 'Missing: Semaphore proof object' });
  }
  const proofFields = ['merkleTreeDepth', 'merkleTreeRoot', 'nullifier', 'message', 'scope'] as const;
  for (const f of proofFields) {
    if (decStr(proof[f]) === null) {
      return res.status(400).json({ error: `Invalid: proof.${f} must be a non-negative integer string` });
    }
  }
  if (!Array.isArray(proof.points) || proof.points.length !== 8 || proof.points.some((p: unknown) => decStr(p) === null)) {
    return res.status(400).json({ error: 'Invalid: proof.points must be 8 non-negative integer strings' });
  }

  try {
    const account = privateKeyToAccount(RELAYER_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(SEPOLIA_RPC_URL),
    });

    const shadowVoteV2 = (process.env.SHADOWVOTEV2_ADDRESS ?? DEFAULT_SHADOWVOTEV2) as `0x${string}`;

    const hash = await walletClient.writeContract({
      address: shadowVoteV2,
      abi: RELAY_ABI,
      functionName: 'voteAnonymous',
      chain: sepolia,
      account,
      args: [
        BigInt(pid),
        {
          ctHash: BigInt(encryptedVote.ctHash),
          securityZone: Number(encryptedVote.securityZone ?? 0),
          utype: Number(encryptedVote.utype ?? 0),
          signature: (encryptedVote.signature ?? '0x') as `0x${string}`,
        },
        {
          merkleTreeDepth: BigInt(proof.merkleTreeDepth),
          merkleTreeRoot: BigInt(proof.merkleTreeRoot),
          nullifier: BigInt(proof.nullifier),
          message: BigInt(proof.message),
          scope: BigInt(proof.scope),
          points: proof.points.map((p: string) => BigInt(p)) as [
            bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
          ],
        },
      ],
    });

    // Deliberately log NO voter identity — there is none. Only the nullifier,
    // which is unlinkable to any address.
    log('info', 'Anonymous vote relayed', { hash, proposalId: pid, relayer: account.address });
    return res.status(200).json({ hash, relayer: account.address });
  } catch (err: any) {
    const msg = err.shortMessage ?? err.message ?? 'Unknown relay error';
    log('error', 'Anon relay tx failed', { message: msg, proposalId: pid });
    return res.status(500).json({ error: msg });
  }
}
