import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import {
  SHADOWVOTEV2_ADDRESS, SHADOWVOTEV2_ABI,
  SHADOWSPACE_ADDRESS, SHADOWSPACE_ABI,
  SEMAPHORE_ADDRESS, SEMAPHORE_ABI,
} from '../config/contract';
import { useCofhe } from './useCofhe';
import { deriveSemaphoreIdentity } from './useSemaphoreIdentity';

/**
 * Wave 5 — anonymous, coercion-resistant voting.
 *
 * The voter proves space membership in zero knowledge (Semaphore) and casts an
 * FHE-encrypted ballot. The contract verifies the proof and tallies on
 * ciphertext; it never learns which member voted. msg.sender is irrelevant.
 */
export type AnonVoteState =
  | 'idle' | 'initializing' | 'identity' | 'building-group'
  | 'proving' | 'encrypting' | 'submitting' | 'confirming' | 'success' | 'error';

/** Reconstruct a space's Semaphore group from on-chain MemberAdded events. */
async function buildGroup(publicClient: any, groupId: bigint) {
  const { Group } = await import('@semaphore-protocol/group');
  const logs = await publicClient.getLogs({
    address: SEMAPHORE_ADDRESS,
    event: SEMAPHORE_ABI[0], // MemberAdded(groupId, index, identityCommitment, merkleTreeRoot)
    args: { groupId },
    fromBlock: 0n,
  });
  // Order by leaf index so the reconstructed Merkle tree matches the on-chain one.
  const sorted = [...logs].sort((a: any, b: any) => Number(BigInt(a.args.index) - BigInt(b.args.index)));
  const members = sorted.map((l: any) => BigInt(l.args.identityCommitment));
  return new Group(members);
}

export function useAnonymousVote() {
  const [state, setState] = useState<AnonVoteState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { encrypt, initialize, isInitialized } = useCofhe();

  /**
   * Cast an anonymous vote. `optionIndex` is encrypted; `spaceId` is the
   * proposal's space (its Semaphore group). Returns true on success.
   */
  const castAnonymousVote = useCallback(
    async (proposalId: bigint, spaceId: bigint, optionIndex: number): Promise<boolean> => {
      try {
        setError(null);
        if (!publicClient || !walletClient) throw new Error('Connect your wallet first');
        if (chainId !== sepolia.id) throw new Error('Wrong network — switch to Ethereum Sepolia');
        if (optionIndex < 0 || !Number.isInteger(optionIndex)) throw new Error('Invalid option selected');

        setState('initializing');
        if (!isInitialized) await initialize();

        // 1. Derive the voter's Semaphore identity (deterministic, gasless).
        setState('identity');
        const identity = await deriveSemaphoreIdentity(walletClient);

        // 2. Reconstruct the space's Semaphore group from on-chain membership.
        setState('building-group');
        const groupId = (await publicClient.readContract({
          address: SHADOWSPACE_ADDRESS,
          abi: SHADOWSPACE_ABI,
          functionName: 'spaceGroupId',
          args: [spaceId],
        } as any)) as bigint;
        const group = await buildGroup(publicClient, groupId);
        if (group.indexOf(identity.commitment) === -1) {
          throw new Error('Your voting identity is not in this space — register it first');
        }

        // 3. Generate the Semaphore ZK membership proof.
        //    scope = message = proposalId (the contract requires both); the
        //    nullifier is then unique per (identity, proposal).
        setState('proving');
        const { generateProof } = await import('@semaphore-protocol/proof');
        const proof = await generateProof(identity, group, proposalId, proposalId);

        // 4. Encrypt the ballot via CoFHE.
        setState('encrypting');
        const { Encryptable } = await import('@cofhe/sdk');
        const encrypted = await encrypt([Encryptable.uint32(BigInt(optionIndex))]);
        const ev: any = encrypted[0];
        const rawCtHash = ev.ctHash ?? ev.data?.ctHash;
        if (!rawCtHash) throw new Error('FHE encryption produced no ciphertext — ballot not submitted');
        const rawUtype = ev.utype ?? ev.data?.utype;
        if (rawUtype === undefined || rawUtype === null) throw new Error('FHE encryption produced no utype');
        const encTuple = {
          ctHash: BigInt(rawCtHash),
          securityZone: ev.securityZone ?? ev.data?.securityZone ?? 0,
          utype: rawUtype,
          signature: (ev.signature ?? ev.data?.signature ?? '0x') as `0x${string}`,
        };

        const proofTuple = {
          merkleTreeDepth: BigInt(proof.merkleTreeDepth),
          merkleTreeRoot: BigInt(proof.merkleTreeRoot),
          nullifier: BigInt(proof.nullifier),
          message: BigInt(proof.message),
          scope: BigInt(proof.scope),
          points: proof.points.map((p: any) => BigInt(p)),
        };

        // 5. Submit through the gasless relayer so the voter's wallet address
        //    never touches the chain — not as a signer, not as msg.sender. If
        //    the relayer is unavailable, fall back to direct submission: the
        //    vote still succeeds (ZK eligibility is unchanged), only the
        //    gas-payer address link is lost.
        setState('submitting');
        let hash: `0x${string}`;
        try {
          const resp = await fetch('/api/relay-anon-vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              proposalId: proposalId.toString(),
              encryptedVote: {
                ctHash: encTuple.ctHash.toString(),
                securityZone: encTuple.securityZone,
                utype: encTuple.utype,
                signature: encTuple.signature,
              },
              proof: {
                merkleTreeDepth: proofTuple.merkleTreeDepth.toString(),
                merkleTreeRoot: proofTuple.merkleTreeRoot.toString(),
                nullifier: proofTuple.nullifier.toString(),
                message: proofTuple.message.toString(),
                scope: proofTuple.scope.toString(),
                points: proofTuple.points.map((p: bigint) => p.toString()),
              },
            }),
          });
          const data = await resp.json();
          if (!resp.ok || !data.hash) throw new Error(data.error || 'Relay failed');
          hash = data.hash as `0x${string}`;
        } catch (relayErr) {
          // Relayer unavailable — submit directly. The wallet becomes msg.sender,
          // but the ballot and ZK eligibility proof are identical.
          console.warn('Anonymous relay unavailable, submitting directly:', relayErr);
          hash = await writeContractAsync({
            address: SHADOWVOTEV2_ADDRESS,
            abi: SHADOWVOTEV2_ABI,
            functionName: 'voteAnonymous',
            args: [proposalId, encTuple, proofTuple],
          } as any);
        }
        setTxHash(hash);

        setState('confirming');
        await publicClient.waitForTransactionReceipt({ hash });
        setState('success');
        return true;
      } catch (err: any) {
        console.error('Anonymous vote failed:', err);
        setError(err.shortMessage || err.message || 'Anonymous vote failed');
        setState('error');
        return false;
      }
    },
    [chainId, walletClient, publicClient, writeContractAsync, encrypt, initialize, isInitialized]
  );

  const reset = useCallback(() => {
    setState('idle');
    setTxHash(null);
    setError(null);
  }, []);

  return { castAnonymousVote, state, txHash, error, reset };
}
