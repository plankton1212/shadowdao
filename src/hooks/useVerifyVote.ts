import { useState, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';
import { useCofhe } from './useCofhe';

export function useVerifyVote() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { decrypt, isInitialized, initialize, getOrCreateSelfPermit } = useCofhe();
  const [verifiedOption, setVerifiedOption] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyMyVote = useCallback(
    async (proposalId: bigint) => {
      if (!publicClient || !address) return;

      try {
        setError(null);
        setIsVerifying(true);

        if (!isInitialized) await initialize();

        const { FheTypes } = await import('@cofhe/sdk');

        await getOrCreateSelfPermit();

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
        const msg = err.shortMessage || err.message || 'Verification failed';
        if (msg.includes('Not voted')) {
          setError('You have not voted on this proposal yet');
        } else {
          console.warn('Vote verification failed:', msg);
          setError(msg);
        }
        setIsVerifying(false);
      }
    },
    [publicClient, address, decrypt, isInitialized, initialize, getOrCreateSelfPermit]
  );

  const reset = useCallback(() => {
    setVerifiedOption(null);
    setError(null);
  }, []);

  return { verifyMyVote, verifiedOption, isVerifying, error, reset };
}
