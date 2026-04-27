import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';

export type ProposalStatus = 'VOTING' | 'ENDED' | 'REVEALED' | 'CANCELLED';

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
  spaceId: bigint;
  spaceGated: boolean;
}

function getStatus(deadline: Date, revealed: boolean, optionCount: number): ProposalStatus {
  if (optionCount === 0) return 'CANCELLED';
  if (revealed) return 'REVEALED';
  if (deadline.getTime() < Date.now()) return 'ENDED';
  return 'VOTING';
}

// Module-level cache — shared across all instances, survives component remounts
let proposalCache: { data: Proposal[]; ts: number } | null = null;
const PROPOSAL_TTL = 30_000; // 30 s

export function useProposals() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [proposals, setProposals] = useState<Proposal[]>(() => proposalCache?.data ?? []);
  const [loading, setLoading] = useState(!proposalCache);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async (force = false) => {
    if (!publicClient) return;
    if (!force && proposalCache && Date.now() - proposalCache.ts < PROPOSAL_TTL) {
      setProposals(proposalCache.data);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const count = (await publicClient.readContract({
        address: SHADOWVOTE_ADDRESS,
        abi: SHADOWVOTE_ABI,
        functionName: 'getProposalCount',
      } as any)) as bigint;

      // Batch reads 50 at a time to avoid overwhelming the RPC endpoint
      const BATCH = 50n;
      const results: any[] = [];
      for (let start = 0n; start < count; start += BATCH) {
        const end = start + BATCH < count ? start + BATCH : count;
        const batch = [];
        for (let i = start; i < end; i++) {
          batch.push(
            publicClient.readContract({
              address: SHADOWVOTE_ADDRESS,
              abi: SHADOWVOTE_ABI,
              functionName: 'getProposal',
              args: [i],
            } as any)
          );
        }
        results.push(...(await Promise.all(batch)));
      }

      const fetchedProposals: Proposal[] = results.map((result: any, index) => {
        const [creator, title, optionCount, deadline, quorum, voterCount, revealed, spaceId, spaceGated] = result;
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
          status: getStatus(deadlineDate, revealed, Number(optionCount)),
          spaceId: spaceId ?? 0n,
          spaceGated: spaceGated ?? false,
        };
      });

      const sorted = fetchedProposals.reverse();
      proposalCache = { data: sorted, ts: Date.now() };
      setProposals(sorted);
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

  /** Returns proposal IDs linked to a specific Space */
  const getProposalIdsBySpace = useCallback(
    async (spaceId: bigint): Promise<bigint[]> => {
      if (!publicClient) return [];
      try {
        return (await publicClient.readContract({
          address: SHADOWVOTE_ADDRESS,
          abi: SHADOWVOTE_ABI,
          functionName: 'getProposalsBySpace',
          args: [spaceId],
        } as any)) as bigint[];
      } catch {
        return [];
      }
    },
    [publicClient]
  );

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const refetch = useCallback(() => {
    proposalCache = null;
    return fetchProposals(true);
  }, [fetchProposals]);

  return {
    proposals,
    loading,
    error,
    refetch,
    checkHasVoted,
    getUserProposalIds,
    getUserVoteIds,
    getProposalIdsBySpace,
  };
}
