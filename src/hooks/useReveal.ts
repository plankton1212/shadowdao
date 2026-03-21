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
  const { decrypt, getOrCreateSelfPermit, initialize, isInitialized } = useCofhe();

  const revealResults = useCallback(
    async (proposalId: bigint) => {
      try {
        setError(null);
        setIsRevealing(true);

        await writeContractAsync({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'revealResults',
          args: [proposalId],
        } as any);

        setIsRevealing(false);
      } catch (err: any) {
        console.error('Reveal failed:', err);
        setError(err.shortMessage || err.message || 'Reveal failed');
        setIsRevealing(false);
      }
    },
    [writeContractAsync]
  );

  const fetchDecryptedResults = useCallback(
    async (proposalId: bigint, optionCount: number) => {
      if (!publicClient) return;

      try {
        setError(null);

        if (!isInitialized) {
          await initialize();
        }

        // Import FheTypes from core
        const { FheTypes } = await import('@cofhe/sdk');

        await getOrCreateSelfPermit();

        const decryptedResults: RevealedResult[] = [];

        for (let i = 0; i < optionCount; i++) {
          const ctHash = (await publicClient.readContract({
            address: SHADOWVOTE_ADDRESS,
            abi: SHADOWVOTE_ABI,
            functionName: 'getEncryptedTally',
            args: [proposalId, i],
          } as any)) as bigint;

          // decryptForView returns an UnsealedItem with decryptedValue
          const unsealed = await decrypt(ctHash, FheTypes.Uint32);
          decryptedResults.push({
            optionIndex: i,
            votes: Number(unsealed.decryptedValue ?? unsealed),
          });
        }

        setResults(decryptedResults);
        return decryptedResults;
      } catch (err: any) {
        console.error('Decryption failed:', err);
        setError(err.shortMessage || err.message || 'Failed to decrypt results');
        return null;
      }
    },
    [publicClient, decrypt, getOrCreateSelfPermit, initialize, isInitialized]
  );

  return {
    revealResults,
    fetchDecryptedResults,
    isRevealing,
    results,
    error,
  };
}
