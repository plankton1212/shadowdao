import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';

export type ProposalStatus = 'VOTING' | 'ENDED' | 'REVEALED';

export interface Proposal {
  id: bigint;
  creator: string;
  title: string;
  optionCount: number;
  deadline: Date;
  quorum: bigint;
  voterCount: bigint;
  revealed: boolean;
  status: ProposalStatus;
}

function getStatus(deadline: Date, revealed: boolean): ProposalStatus {
  if (revealed) return 'REVEALED';
  if (deadline.getTime() < Date.now()) return 'ENDED';
  return 'VOTING';
}

export function useProposals() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!publicClient) return;

    try {
      setLoading(true);
      setError(null);

      const count = (await publicClient.readContract({
        address: SHADOWVOTE_ADDRESS,
        abi: SHADOWVOTE_ABI,
        functionName: 'getProposalCount',
      } as any)) as bigint;

      const proposalPromises = [];
      for (let i = 0n; i < count; i++) {
        proposalPromises.push(
          publicClient.readContract({
            address: SHADOWVOTE_ADDRESS,
            abi: SHADOWVOTE_ABI,
            functionName: 'getProposal',
            args: [i],
          } as any)
        );
      }

      const results = await Promise.all(proposalPromises);

      const fetchedProposals: Proposal[] = results.map((result: any, index) => {
        const [creator, title, optionCount, deadline, quorum, voterCount, revealed] = result;
        const deadlineDate = new Date(Number(deadline) * 1000);
        return {
          id: BigInt(index),
          creator,
          title,
          optionCount: Number(optionCount),
          deadline: deadlineDate,
          quorum,
          voterCount,
          revealed,
          status: getStatus(deadlineDate, revealed),
        };
      });

      setProposals(fetchedProposals.reverse());
    } catch (err: any) {
      console.error('Failed to fetch proposals:', err);
      setError(err.message || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  const checkHasVoted = useCallback(
    async (proposalId: bigint): Promise<boolean> => {
      if (!publicClient || !address) return false;
      try {
        return (await publicClient.readContract({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'hasUserVoted',
          args: [proposalId, address],
        } as any)) as boolean;
      } catch {
        return false;
      }
    },
    [publicClient, address]
  );

  const getUserProposalIds = useCallback(async (): Promise<bigint[]> => {
    if (!publicClient || !address) return [];
    try {
      return (await publicClient.readContract({
        address: SHADOWVOTE_ADDRESS,
        abi: SHADOWVOTE_ABI,
        functionName: 'getUserProposals',
        args: [address],
      } as any)) as bigint[];
    } catch {
      return [];
    }
  }, [publicClient, address]);

  const getUserVoteIds = useCallback(async (): Promise<bigint[]> => {
    if (!publicClient || !address) return [];
    try {
      return (await publicClient.readContract({
        address: SHADOWVOTE_ADDRESS,
        abi: SHADOWVOTE_ABI,
        functionName: 'getUserVotes',
        args: [address],
      } as any)) as bigint[];
    } catch {
      return [];
    }
  }, [publicClient, address]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return {
    proposals,
    loading,
    error,
    refetch: fetchProposals,
    checkHasVoted,
    getUserProposalIds,
    getUserVoteIds,
  };
}
