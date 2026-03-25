import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';
import { useCofhe } from './useCofhe';

export type VoteState = 'idle' | 'initializing' | 'encrypting' | 'submitting' | 'confirming' | 'success' | 'error';

export function useVote() {
  const [voteState, setVoteState] = useState<VoteState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { encrypt, initialize, isInitialized } = useCofhe();

  const castVote = useCallback(
    async (proposalId: bigint, optionIndex: number) => {
      try {
        setError(null);

        if (optionIndex < 0 || !Number.isInteger(optionIndex)) {
          throw new Error('Invalid option selected');
        }

        setVoteState('initializing');

        if (!isInitialized) {
          await initialize();
        }

        setVoteState('encrypting');

        const { Encryptable } = await import('@cofhe/sdk');

        const encrypted = await encrypt([Encryptable.uint32(BigInt(optionIndex))]);
        const encryptedVote = encrypted[0];

        const encTuple = {
          ctHash: BigInt(encryptedVote.ctHash || encryptedVote.data?.ctHash || 0),
          securityZone: encryptedVote.securityZone ?? encryptedVote.data?.securityZone ?? 0,
          utype: encryptedVote.utype ?? encryptedVote.data?.utype ?? 4,
          signature: (encryptedVote.signature ?? encryptedVote.data?.signature ?? '0x') as `0x${string}`,
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

        await publicClient!.waitForTransactionReceipt({ hash });
        setVoteState('success');
      } catch (err: any) {
        console.error('Vote failed:', err);
        const message = err.shortMessage || err.message || 'Vote failed';
        setError(message);
        setVoteState('error');
      }
    },
    [writeContractAsync, publicClient, encrypt, initialize, isInitialized]
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
