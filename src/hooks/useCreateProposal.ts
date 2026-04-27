import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { decodeEventLog } from 'viem';
import {
  SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI,
  SHADOWVOTEV2_ADDRESS, SHADOWVOTEV2_ABI,
} from '../config/contract';

export type DeployState = 'idle' | 'submitting' | 'confirming' | 'success' | 'error';

const V2_DEPLOYED = true; // contracts deployed on Sepolia

export function useCreateProposal() {
  const [deployState, setDeployState] = useState<DeployState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useV2, setUseV2] = useState(V2_DEPLOYED);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const createProposal = useCallback(
    async (
      title: string,
      optionCount: number,
      deadlineTimestamp: number,
      quorum: number,
      spaceId: bigint = 0n,
      spaceGated: boolean = false,
      // V2 extra params
      descriptionHash: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000',
      weighted: boolean = false,
    ) => {
      try {
        setError(null);
        setDeployState('submitting');

        let hash: `0x${string}`;

        if (useV2 && V2_DEPLOYED) {
          hash = await writeContractAsync({
            address: SHADOWVOTEV2_ADDRESS,
            abi: SHADOWVOTEV2_ABI,
            functionName: 'createProposal',
            args: [
              title,
              descriptionHash,
              optionCount,
              BigInt(deadlineTimestamp),
              BigInt(quorum),
              weighted,
              spaceId,
              spaceGated,
            ],
          } as any);
        } else {
          hash = await writeContractAsync({
            address: SHADOWVOTE_ADDRESS,
            abi: SHADOWVOTE_ABI,
            functionName: 'createProposal',
            args: [title, optionCount, BigInt(deadlineTimestamp), BigInt(quorum), spaceId, spaceGated],
          } as any);
        }

        setTxHash(hash);
        setDeployState('confirming');

        const receipt = await publicClient!.waitForTransactionReceipt({ hash });

        const abi = useV2 && V2_DEPLOYED ? SHADOWVOTEV2_ABI : SHADOWVOTE_ABI;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi,
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
    [writeContractAsync, publicClient, useV2]
  );

  const reset = useCallback(() => {
    setDeployState('idle');
    setTxHash(null);
    setProposalId(null);
    setError(null);
  }, []);

  return {
    createProposal,
    deployState,
    txHash,
    proposalId,
    error,
    reset,
    useV2,
    setUseV2,
    v2Available: V2_DEPLOYED,
  };
}
