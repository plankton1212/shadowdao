import { useState, useCallback } from 'react';
import { useWriteContract } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';

export type DeployState = 'idle' | 'submitting' | 'confirming' | 'success' | 'error';

export function useCreateProposal() {
  const [deployState, setDeployState] = useState<DeployState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();

  const createProposal = useCallback(
    async (title: string, optionCount: number, deadlineTimestamp: number, quorum: number) => {
      try {
        setError(null);
        setDeployState('submitting');

        const hash = await writeContractAsync({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'createProposal',
          args: [title, optionCount, BigInt(deadlineTimestamp), BigInt(quorum)],
        } as any);

        setTxHash(hash);
        setDeployState('confirming');

        // Transaction submitted — UI can track confirmation
        setDeployState('success');
      } catch (err: any) {
        console.error('Create proposal failed:', err);
        setError(err.shortMessage || err.message || 'Failed to create proposal');
        setDeployState('error');
      }
    },
    [writeContractAsync]
  );

  const reset = useCallback(() => {
    setDeployState('idle');
    setTxHash(null);
    setError(null);
  }, []);

  return {
    createProposal,
    deployState,
    txHash,
    error,
    reset,
  };
}
