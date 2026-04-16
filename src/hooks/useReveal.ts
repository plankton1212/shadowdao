import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';
import { useCofhe } from './useCofhe';

function classifyDecryptError(err: any): { isPermit: boolean; message: string } {
  const msg = (err?.message || err?.shortMessage || '').toLowerCase();
  if (
    msg.includes('permit not found') ||
    msg.includes('active permit') ||
    msg.includes('permit expired') ||
    msg.includes('no active permit')
  ) {
    return {
      isPermit: true,
      message: msg.includes('expired')
        ? 'FHE permit expired — please re-sign to decrypt results.'
        : 'FHE permit required — please sign the EIP-712 permit to decrypt results.',
    };
  }
  return { isPermit: false, message: err?.shortMessage || err?.message || 'Failed to decrypt results' };
}

export interface RevealedResult {
  optionIndex: number;
  votes: number;
}

export function useReveal() {
  const [isRevealing, setIsRevealing] = useState(false);
  const [results, setResults] = useState<RevealedResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPermitError, setIsPermitError] = useState(false);
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
        setIsPermitError(false);

        if (!isInitialized) {
          await initialize();
        }

        const { FheTypes } = await import('@cofhe/sdk');

        // Create permit before decrypting — required by CoFHE SDK.
        // If the user rejects the EIP-712 signature this throws and is caught below.
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
            const classified = classifyDecryptError(optErr);
            console.warn(`[ShadowDAO] Failed to decrypt option ${i}:`, optErr);
            decryptedResults.push({ optionIndex: i, votes: 0 });
            decryptFailed = true;
            // If a permit error is detected on any option, surface it immediately
            // rather than silently padding zeros for every remaining option.
            if (classified.isPermit) {
              setIsPermitError(true);
              setError(classified.message);
              return null;
            }
          }
        }

        setResults(decryptedResults);
        if (decryptFailed) {
          setError('Some results could not be decrypted. Showing partial data.');
        }
        return decryptedResults;
      } catch (err: any) {
        console.error('Decryption failed:', err);
        const classified = classifyDecryptError(err);
        setIsPermitError(classified.isPermit);
        setError(classified.message);
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
    isPermitError,
  };
}
