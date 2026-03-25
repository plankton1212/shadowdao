import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';
import { useCofhe } from './useCofhe';

export interface RevealedResult {
  optionIndex: number;
  votes: number;
}

export function useReveal() {
  const [isRevealing, setIsRevealing] = useState(false);
  const [results, setResults] = useState<RevealedResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { decrypt, initialize, isInitialized, getOrCreateSelfPermit } = useCofhe();

  const revealResults = useCallback(
    async (proposalId: bigint) => {
      try {
        setError(null);
        setIsRevealing(true);

        const hash = await writeContractAsync({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'revealResults',
          args: [proposalId],
        } as any);

        await publicClient!.waitForTransactionReceipt({ hash });
        setIsRevealing(false);
      } catch (err: any) {
        console.error('Reveal failed:', err);
        setError(err.shortMessage || err.message || 'Reveal failed');
        setIsRevealing(false);
      }
    },
    [writeContractAsync, publicClient]
  );

  const fetchDecryptedResults = useCallback(
    async (proposalId: bigint, optionCount: number) => {
      if (!publicClient) return;

      try {
        setError(null);

        if (!isInitialized) {
          await initialize();
        }

        const { FheTypes } = await import('@cofhe/sdk');

        // Create permit before decrypting — required by CoFHE SDK
        await getOrCreateSelfPermit();

        const decryptedResults: RevealedResult[] = [];
        let decryptFailed = false;

        for (let i = 0; i < optionCount; i++) {
          try {
            const ctHash = (await publicClient.readContract({
              address: SHADOWVOTE_ADDRESS,
              abi: SHADOWVOTE_ABI,
              functionName: 'getEncryptedTally',
              args: [proposalId, i],
            } as any)) as bigint;

            const unsealed = await decrypt(ctHash, FheTypes.Uint32);
            decryptedResults.push({
              optionIndex: i,
              votes: Number(unsealed.decryptedValue ?? unsealed ?? 0),
            });
          } catch (optErr) {
            console.warn(`[ShadowDAO] Failed to decrypt option ${i}:`, optErr);
            decryptedResults.push({ optionIndex: i, votes: 0 });
            decryptFailed = true;
          }
        }

        setResults(decryptedResults);
        if (decryptFailed) {
          setError('Some results could not be decrypted. Showing partial data.');
        }
        return decryptedResults;
      } catch (err: any) {
        console.error('Decryption failed:', err);
        setError(err.shortMessage || err.message || 'Failed to decrypt results');
        return null;
      }
    },
    [publicClient, decrypt, initialize, isInitialized, getOrCreateSelfPermit]
  );

  return {
    revealResults,
    fetchDecryptedResults,
    isRevealing,
    results,
    error,
  };
}
