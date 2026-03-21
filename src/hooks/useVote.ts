import { useState, useCallback } from 'react';
import { useWriteContract } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';
import { useCofhe } from './useCofhe';

export type VoteState = 'idle' | 'initializing' | 'encrypting' | 'submitting' | 'confirming' | 'success' | 'error';

export function useVote() {
  const [voteState, setVoteState] = useState<VoteState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { encrypt, initialize, isInitialized } = useCofhe();

  const castVote = useCallback(
    async (proposalId: bigint, optionIndex: number) => {
      try {
        setError(null);
        setVoteState('initializing');

        if (!isInitialized) {
          await initialize();
        }

        setVoteState('encrypting');

        // Import Encryptable from core
        const { Encryptable } = await import('@cofhe/sdk');

        // Encrypt the option index as uint32
        const encrypted = await encrypt([Encryptable.uint32(BigInt(optionIndex))]);
        const encryptedVote = encrypted[0];

        const encTuple = {
          ctHash: BigInt(encryptedVote.ctHash),
          securityZone: encryptedVote.securityZone ?? 0,
          utype: encryptedVote.utype ?? 4, // 4 = uint32
          signature: (encryptedVote.signature as `0x${string}`) ?? '0x',
        };

        setVoteState('submitting');
        const hash = await writeContractAsync({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'vote',
          args: [proposalId, encTuple],
        } as any);

        setTxHash(hash);
        setVoteState('confirming');
        setVoteState('success');
      } catch (err: any) {
        console.error('Vote failed:', err);
        const message = err.shortMessage || err.message || 'Vote failed';
        setError(message);
        setVoteState('error');
      }
    },
    [writeContractAsync, encrypt, initialize, isInitialized]
  );

  const reset = useCallback(() => {
    setVoteState('idle');
    setTxHash(null);
    setError(null);
  }, []);

  return {
    castVote,
    voteState,
    txHash,
    error,
    reset,
  };
}
