/**
 * useShadowVote — generic React hook for any ShadowVote-compatible contract.
 *
 * Swap `contractAddress` and `abi` to use with your own FHE voting deployment.
 * This is the primary reusability primitive of the ShadowDAO SDK.
 *
 * @example
 * const { proposals, loading, vote, revealResults } = useShadowVote(
 *   '0xYourContract',
 *   YOUR_ABI,
 *   publicClient,
 *   walletClient,
 * );
 */

import { useState, useEffect, useCallback } from 'react';
import { ShadowVoteClient } from './ShadowVoteClient.js';
import type { Proposal, InEuint32, Address } from './types.js';

export function useShadowVote(
  contractAddress: Address,
  abi: readonly any[],
  publicClient: any,
  walletClient?: any,
) {
  const [client] = useState(() => new ShadowVoteClient({ address: contractAddress, abi, publicClient, walletClient }));
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await client.getAllProposals();
      setProposals(all);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => { refetch(); }, [refetch]);

  const vote = useCallback(async (proposalId: bigint, encryptedOption: InEuint32) => {
    const hash = await client.vote(proposalId, encryptedOption);
    await publicClient.waitForTransactionReceipt({ hash });
    await refetch();
    return hash;
  }, [client, publicClient, refetch]);

  const revealResults = useCallback(async (proposalId: bigint) => {
    const hash = await client.revealResults(proposalId);
    await publicClient.waitForTransactionReceipt({ hash });
    await refetch();
    return hash;
  }, [client, publicClient, refetch]);

  const createProposal = useCallback(async (params: Parameters<ShadowVoteClient['createProposal']>[0]) => {
    const hash = await client.createProposal(params);
    await publicClient.waitForTransactionReceipt({ hash });
    await refetch();
    return hash;
  }, [client, publicClient, refetch]);

  return { proposals, loading, error, refetch, vote, revealResults, createProposal, client };
}
