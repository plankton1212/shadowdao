import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createWalletClient, http, parseSignature, isAddress } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { checkRateLimit, getClientIp } from './_ratelimit';

/**
 * POST /api/relay-vote
 *
 * Gasless voting relay — submits a voteWithSignature() transaction on behalf of the voter.
 * The voter signs an EIP-712 typed message in the browser; the relayer pays gas.
 *
 * Rate limit: 5 requests / 60s per IP (relayer pays gas, must be strict)
 * CORS: restricted to deployed domain (ALLOWED_ORIGIN env var)
 *
 * Body:
 *   proposalId    string   — proposal ID (BigInt as string)
 *   encryptedVote object   — { ctHash, signature, securityZone, utype }
 *   nonce         string   — voter's current nonce from contract
 *   signature     string   — EIP-712 signature (hex, 65 bytes)
 *   voter         string   — voter's Ethereum address
 *
 * Returns: { hash: string, relayer: string }
 *
 * Environment variables (Vercel dashboard):
 *   RELAYER_PRIVATE_KEY  = 0x...  (account that pays gas — keep funded on Sepolia)
 *   SEPOLIA_RPC_URL      = https://...
 *   ALLOWED_ORIGIN       = https://shadowdao.vercel.app
 */

const SHADOWVOTEV2_ADDRESS = '0xD8037F77d1D5764f3639A6216a580Cd608fB7fAA' as const;

const RELAY_ABI = [
  {
    name: 'voteWithSignature',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: '_proposalId', type: 'uint256' as const },
      {
        name: '_encryptedOption',
        type: 'tuple' as const,
        components: [
          { name: 'ctHash', type: 'uint256' as const },
          { name: 'signature', type: 'bytes' as const },
          { name: 'securityZone', type: 'uint8' as const },
          { name: 'utype', type: 'uint8' as const },
        ],
      },
      { name: '_nonce', type: 'uint256' as const },
      { name: 'v', type: 'uint8' as const },
      { name: 'r', type: 'bytes32' as const },
      { name: 's', type: 'bytes32' as const },
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
    log('warn', 'Rate limit exceeded on relay-vote', { ip });
    return res.status(429).json({ error: `Rate limit exceeded. Try again in ${resetIn}s.` });
  }

  const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
  const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;

  if (!RELAYER_PRIVATE_KEY || !SEPOLIA_RPC_URL) {
    log('error', 'Relay not configured — missing RELAYER_PRIVATE_KEY or SEPOLIA_RPC_URL');
    return res.status(503).json({
      error: 'Gasless relay not configured',
      hint: 'Add RELAYER_PRIVATE_KEY and SEPOLIA_RPC_URL to Vercel Environment Variables',
    });
  }

  const { proposalId, encryptedVote, nonce, signature, voter } = req.body ?? {};

  if (!proposalId || typeof proposalId !== 'string' || !/^\d+$/.test(proposalId)) {
    return res.status(400).json({ error: 'Invalid: proposalId must be a non-negative integer string' });
  }
  if (!nonce || typeof nonce !== 'string' || !/^\d+$/.test(nonce)) {
    return res.status(400).json({ error: 'Invalid: nonce must be a non-negative integer string' });
  }
  if (!signature || typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
    return res.status(400).json({ error: 'Invalid: signature must be a 65-byte hex string (0x + 130 chars)' });
  }
  if (!voter || !isAddress(voter)) {
    return res.status(400).json({ error: 'Invalid: voter must be a valid Ethereum address' });
  }
  if (!encryptedVote || typeof encryptedVote !== 'object') {
    return res.status(400).json({ error: 'Missing: encryptedVote object' });
  }
  if (!encryptedVote.ctHash || typeof encryptedVote.ctHash !== 'string') {
    return res.status(400).json({ error: 'Missing: encryptedVote.ctHash' });
  }

  try {
    const account = privateKeyToAccount(RELAYER_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(SEPOLIA_RPC_URL),
    });

    // Split 65-byte EIP-712 signature into v, r, s components
    const { v, r, s } = parseSignature(signature as `0x${string}`);

    const hash = await walletClient.writeContract({
      address: SHADOWVOTEV2_ADDRESS,
      abi: RELAY_ABI,
      functionName: 'voteWithSignature',
      chain: sepolia,
      account,
      args: [
        BigInt(proposalId),
        {
          ctHash: BigInt(encryptedVote.ctHash),
          signature: (encryptedVote.signature ?? '0x') as `0x${string}`,
          securityZone: Number(encryptedVote.securityZone ?? 0),
          utype: Number(encryptedVote.utype ?? 0),
        },
        BigInt(nonce),
        Number(v),
        r,
        s,
      ],
    });

    log('info', 'Gasless vote relayed', { hash, proposalId, voter, relayer: account.address });
    return res.status(200).json({ hash, relayer: account.address });
  } catch (err: any) {
    const msg = err.shortMessage ?? err.message ?? 'Unknown relay error';
    log('error', 'Relay tx failed', { message: msg, voter, proposalId });
    return res.status(500).json({ error: msg });
  }
}
