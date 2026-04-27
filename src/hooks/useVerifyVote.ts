import { useState, useCallback, useRef } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';
import { useCofhe } from './useCofhe';

function classifyVerifyError(err: any): { isPermit: boolean; message: string } {
  const raw = err?.message || err?.shortMessage || '';
  const msg = raw.toLowerCase();
  if (msg.includes('not voted')) return { isPermit: false, message: 'You have not voted on this proposal yet' };
  if (
    msg.includes('permit not found') ||
    msg.includes('active permit') ||
    msg.includes('permit expired') ||
    msg.includes('no active permit')
  ) {
    return {
      isPermit: true,
      message: msg.includes('expired')
        ? 'FHE permit expired — please re-sign to verify your vote.'
        : 'FHE permit required — please sign the EIP-712 permit to verify your vote.',
    };
  }
  return { isPermit: false, message: raw || 'Verification failed' };
}

export function useVerifyVote() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { decrypt, isInitialized, initialize, getOrCreateSelfPermit } = useCofhe();
  const [verifiedOption, setVerifiedOption] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPermitError, setIsPermitError] = useState(false);
  const isSigningRef = useRef(false);

  const verifyMyVote = useCallback(
    async (proposalId: bigint) => {
      if (!publicClient || !address) return;

      try {
        setError(null);
        setIsPermitError(false);
        setIsVerifying(true);

        if (!isInitialized) await initialize();

        const { FheTypes } = await import('@cofhe/sdk');

        // getOrCreateSelfPermit creates the EIP-712 permit if one doesn't exist.
        // Guard prevents multiple parallel signature dialogs on rapid clicks.
        if (isSigningRef.current) throw new Error('Signature already in progress — please wait');
        isSigningRef.current = true;
        try {
          await getOrCreateSelfPermit();
        } finally {
          isSigningRef.current = false;
        }

        const ctHash = (await publicClient.readContract({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'getMyVote',
          args: [proposalId],
        } as any)) as bigint;

        const unsealed = await decrypt(ctHash, FheTypes.Uint32);
        setVerifiedOption(Number(unsealed.decryptedValue ?? unsealed ?? 0));
        setIsVerifying(false);
      } catch (err: any) {
        const classified = classifyVerifyError(err);
        console.warn('Vote verification failed:', err);
        setIsPermitError(classified.isPermit);
        setError(classified.message);
        setIsVerifying(false);
      }
    },
    [publicClient, address, decrypt, isInitialized, initialize, getOrCreateSelfPermit]
  );

  const reset = useCallback(() => {
    setVerifiedOption(null);
    setError(null);
    setIsPermitError(false);
  }, []);

  return { verifyMyVote, verifiedOption, isVerifying, error, isPermitError, reset };
}
