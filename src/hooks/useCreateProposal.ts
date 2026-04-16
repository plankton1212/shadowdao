import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { decodeEventLog } from 'viem';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';

export type DeployState = 'idle' | 'submitting' | 'confirming' | 'success' | 'error';

export function useCreateProposal() {
  const [deployState, setDeployState] = useState<DeployState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const createProposal = useCallback(
    async (
      title: string,
      optionCount: number,
      deadlineTimestamp: number,
      quorum: number,
      spaceId: bigint = 0n,
      spaceGated: boolean = false
    ) => {
      try {
        setError(null);
        setDeployState('submitting');

        const hash = await writeContractAsync({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'createProposal',
          args: [title, optionCount, BigInt(deadlineTimestamp), BigInt(quorum), spaceId, spaceGated],
        } as any);

        setTxHash(hash);
        setDeployState('confirming');

        const receipt = await publicClient!.waitForTransactionReceipt({ hash });

        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: SHADOWVOTE_ABI,
              data: log.data,
              topics: (log as any).topics,
            }) as any;
            if (decoded.eventName === 'ProposalCreated') {
              setProposalId(decoded.args.proposalId);
              break;
            }
          } catch {}
        }

        setDeployState('success');
      } catch (err: any) {
        console.error('Create proposal failed:', err);
        setError(err.shortMessage || err.message || 'Failed to create proposal');
        setDeployState('error');
      }
    },
    [writeContractAsync, publicClient]
  );

  const reset = useCallback(() => {
    setDeployState('idle');
    setTxHash(null);
    setProposalId(null);
    setError(null);
  }, []);

  return { createProposal, deployState, txHash, proposalId, error, reset };
}
