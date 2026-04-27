import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { SHADOWSPACE_ADDRESS, SHADOWSPACE_ABI, CATEGORY_LABELS } from '../config/contract';

export interface Space {
  id: bigint;
  creator: string;
  name: string;
  description: string;
  category: number;
  categoryLabel: string;
  isPublic: boolean;
  defaultQuorum: bigint;
  memberCount: bigint;
  proposalCount: bigint;
  active: boolean;
}

// Module-level cache — shared across all instances
let spaceCache: { data: Space[]; ts: number } | null = null;
const SPACE_TTL = 60_000; // 60 s

export function useSpaces() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [spaces, setSpaces] = useState<Space[]>(() => spaceCache?.data ?? []);
  const [loading, setLoading] = useState(!spaceCache);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaces = useCallback(async (force = false) => {
    if (!publicClient) return;
    if (!force && spaceCache && Date.now() - spaceCache.ts < SPACE_TTL) {
      setSpaces(spaceCache.data);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const count = (await publicClient.readContract({
        address: SHADOWSPACE_ADDRESS,
        abi: SHADOWSPACE_ABI,
        functionName: 'getSpaceCount',
      } as any)) as bigint;

      const promises = [];
      for (let i = 0n; i < count; i++) {
        promises.push(
          publicClient.readContract({
            address: SHADOWSPACE_ADDRESS,
            abi: SHADOWSPACE_ABI,
            functionName: 'getSpace',
            args: [i],
          } as any)
        );
      }

      const results = await Promise.all(promises);

      const fetched: Space[] = results.map((result: any, index) => {
        const [creator, name, description, category, isPublic, defaultQuorum, memberCount, proposalCount, active] = result;
        return {
          id: BigInt(index),
          creator,
          name,
          description,
          category: Number(category),
          categoryLabel: CATEGORY_LABELS[Number(category)] || 'Other',
          isPublic,
          defaultQuorum,
          memberCount,
          proposalCount,
          active,
        };
      }).filter((s) => s.active);

      const sorted = fetched.reverse();
      spaceCache = { data: sorted, ts: Date.now() };
      setSpaces(sorted);
    } catch (err: any) {
      console.error('Failed to fetch spaces:', err);
      setError(err.message || 'Failed to load spaces');
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  const checkIsMember = useCallback(
    async (spaceId: bigint): Promise<boolean> => {
      if (!publicClient || !address) return false;
      try {
        return (await publicClient.readContract({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'isSpaceMember',
          args: [spaceId, address],
        } as any)) as boolean;
      } catch {
        return false;
      }
    },
    [publicClient, address]
  );

  const getMembers = useCallback(
    async (spaceId: bigint): Promise<string[]> => {
      if (!publicClient) return [];
      try {
        return (await publicClient.readContract({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'getMembers',
          args: [spaceId],
        } as any)) as string[];
      } catch {
        return [];
      }
    },
    [publicClient]
  );

  const getUserSpaceIds = useCallback(
    async (userAddress?: string): Promise<bigint[]> => {
      if (!publicClient) return [];
      const target = userAddress || address;
      if (!target) return [];
      try {
        return (await publicClient.readContract({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'getUserSpaces',
          args: [target as `0x${string}`],
        } as any)) as bigint[];
      } catch {
        return [];
      }
    },
    [publicClient, address]
  );

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const refetch = useCallback(() => {
    spaceCache = null;
    return fetchSpaces(true);
  }, [fetchSpaces]);

  return { spaces, loading, error, refetch, checkIsMember, getMembers, getUserSpaceIds };
}
