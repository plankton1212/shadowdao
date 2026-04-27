import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';

export function useProposalAdmin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const cancelProposal = useCallback(
    async (proposalId: bigint) => {
      try {
        setError(null);
        setIsLoading(true);

        if (!publicClient) throw new Error('No RPC connection — refresh the page');

        const hash = await writeContractAsync({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'cancelProposal',
          args: [proposalId],
        } as any);

        await publicClient!.waitForTransactionReceipt({ hash });
        setIsLoading(false);
        return true;
      } catch (err: any) {
        setError(err.shortMessage || err.message || 'Cancel failed');
        setIsLoading(false);
        return false;
      }
    },
    [writeContractAsync, publicClient]
  );

  const extendDeadline = useCallback(
    async (proposalId: bigint, newDeadlineTimestamp: number) => {
      try {
        setError(null);

        if (!publicClient) throw new Error('No RPC connection — refresh the page');

        const nowSec = Math.floor(Date.now() / 1000);
        if (newDeadlineTimestamp <= nowSec) {
          setError('New deadline must be in the future');
          return false;
        }

        setIsLoading(true);

        const hash = await writeContractAsync({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'extendDeadline',
          args: [proposalId, BigInt(newDeadlineTimestamp)],
        } as any);

        await publicClient!.waitForTransactionReceipt({ hash });
        setIsLoading(false);
        return true;
      } catch (err: any) {
        setError(err.shortMessage || err.message || 'Extend failed');
        setIsLoading(false);
        return false;
      }
    },
    [writeContractAsync, publicClient]
  );

  return {
    cancelProposal,
    extendDeadline,
    isLoading,
    error,
  };
}
