import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { decodeEventLog } from 'viem';
import { SHADOWSPACE_ADDRESS, SHADOWSPACE_ABI } from '../config/contract';

export type SpaceDeployState = 'idle' | 'submitting' | 'confirming' | 'success' | 'error';

export function useCreateSpace() {
  const [deployState, setDeployState] = useState<SpaceDeployState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [spaceId, setSpaceId] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const createSpace = useCallback(
    async (name: string, description: string, category: number, isPublic: boolean, defaultQuorum: number, members: string[]) => {
      try {
        setError(null);
        setDeployState('submitting');

        const validMembers = members.filter((m) => m && m.startsWith('0x') && m.length === 42);

        const hash = await writeContractAsync({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'createSpace',
          args: [name, description, category, isPublic, BigInt(defaultQuorum), validMembers],
        } as any);

        setTxHash(hash);
        setDeployState('confirming');

        const receipt = await publicClient!.waitForTransactionReceipt({ hash });

        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: SHADOWSPACE_ABI,
              data: log.data,
              topics: (log as any).topics,
            }) as any;
            if (decoded.eventName === 'SpaceCreated') {
              setSpaceId(decoded.args.spaceId);
              break;
            }
          } catch {}
        }

        setDeployState('success');
      } catch (err: any) {
        console.error('Create space failed:', err);
        setError(err.shortMessage || err.message || 'Failed to create space');
        setDeployState('error');
      }
    },
    [writeContractAsync, publicClient]
  );

  const joinSpace = useCallback(
    async (spaceId: bigint) => {
      try {
        setError(null);
        const hash = await writeContractAsync({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'joinSpace',
          args: [spaceId],
        } as any);
        await publicClient!.waitForTransactionReceipt({ hash });
        return true;
      } catch (err: any) {
        setError(err.shortMessage || err.message || 'Join failed');
        return false;
      }
    },
    [writeContractAsync, publicClient]
  );

  const leaveSpace = useCallback(
    async (spaceId: bigint) => {
      try {
        setError(null);
        const hash = await writeContractAsync({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'leaveSpace',
          args: [spaceId],
        } as any);
        await publicClient!.waitForTransactionReceipt({ hash });
        return true;
      } catch (err: any) {
        setError(err.shortMessage || err.message || 'Leave failed');
        return false;
      }
    },
    [writeContractAsync, publicClient]
  );

  const archiveSpace = useCallback(
    async (spaceId: bigint) => {
      try {
        setError(null);
        const hash = await writeContractAsync({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'archiveSpace',
          args: [spaceId],
        } as any);
        await publicClient!.waitForTransactionReceipt({ hash });
        return true;
      } catch (err: any) {
        setError(err.shortMessage || err.message || 'Archive failed');
        return false;
      }
    },
    [writeContractAsync, publicClient]
  );

  const reset = useCallback(() => {
    setDeployState('idle');
    setTxHash(null);
    setSpaceId(null);
    setError(null);
  }, []);

  return { createSpace, joinSpace, leaveSpace, archiveSpace, deployState, txHash, spaceId, error, reset };
}
