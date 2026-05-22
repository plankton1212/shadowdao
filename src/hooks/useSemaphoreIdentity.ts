import { useState, useCallback } from 'react';
import { useWalletClient, usePublicClient, useAccount, useWriteContract, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { SHADOWSPACE_ADDRESS, SHADOWSPACE_ABI } from '../config/contract';

/**
 * Wave 5 — anonymous voting identity.
 *
 * A Semaphore identity is a key pair generated entirely client-side. We derive
 * it deterministically from a wallet signature over a fixed message, so the
 * same wallet always reproduces the same identity (recoverable on any device)
 * without the private key ever touching the chain or a server.
 */
const IDENTITY_SIGN_MESSAGE =
  'ShadowDAO — derive my anonymous voting identity.\n\n' +
  'Signing this creates a private Semaphore identity inside your browser. ' +
  'It is deterministic (signing again restores the same identity), costs no ' +
  'gas, and never leaves your device.';

/** Derive (and cache) a deterministic Semaphore identity from a wallet signature. */
export async function deriveSemaphoreIdentity(walletClient: any): Promise<any> {
  const { Identity } = await import('@semaphore-protocol/identity');
  const addr: string = String(walletClient.account?.address ?? '').toLowerCase();
  const cacheKey = `shadowdao.semaphore.identity.${addr}`;
  const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : null;
  if (cached) {
    try { return Identity.import(cached); } catch { /* corrupt cache — re-derive */ }
  }
  const signature: string = await walletClient.signMessage({ message: IDENTITY_SIGN_MESSAGE });
  const identity = new Identity(signature);
  try { localStorage.setItem(cacheKey, identity.export()); } catch { /* ignore quota */ }
  return identity;
}

export function useSemaphoreIdentity() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync } = useWriteContract();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** True if the connected address has already registered a ZK voting identity in the space. */
  const checkRegistered = useCallback(
    async (spaceId: bigint): Promise<boolean> => {
      if (!publicClient || !address) return false;
      try {
        return (await publicClient.readContract({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'hasVotingIdentity',
          args: [spaceId, address],
        } as any)) as boolean;
      } catch {
        return false;
      }
    },
    [publicClient, address]
  );

  /** Derive the identity and register its commitment in the space's Semaphore group. */
  const registerIdentity = useCallback(
    async (spaceId: bigint): Promise<boolean> => {
      try {
        setError(null);
        if (!walletClient || !publicClient) throw new Error('Connect your wallet first');
        if (chainId !== sepolia.id) throw new Error('Wrong network — switch to Ethereum Sepolia');
        setIsRegistering(true);

        const identity = await deriveSemaphoreIdentity(walletClient);
        const hash = await writeContractAsync({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'registerVotingIdentity',
          args: [spaceId, identity.commitment],
        } as any);
        await publicClient.waitForTransactionReceipt({ hash });

        setIsRegistering(false);
        return true;
      } catch (err: any) {
        console.error('Voting-identity registration failed:', err);
        setError(err.shortMessage || err.message || 'Identity registration failed');
        setIsRegistering(false);
        return false;
      }
    },
    [walletClient, publicClient, chainId, writeContractAsync]
  );

  return { registerIdentity, checkRegistered, isRegistering, error };
}
