import { useState, useCallback, useRef } from 'react';
import { useSignTypedData, usePublicClient, useAccount, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { SHADOWVOTEV2_ADDRESS, SHADOWVOTEV2_ABI } from '../config/contract';
import { useCofhe } from './useCofhe';

export type GaslessVoteState =
  | 'idle'
  | 'initializing'
  | 'encrypting'
  | 'signing'
  | 'relaying'
  | 'success'
  | 'error';

// EIP-712 typed data — must match ShadowVoteV2.sol DOMAIN_SEPARATOR + VOTE_TYPEHASH exactly
const VOTE_DOMAIN = {
  name: 'ShadowVoteV2',
  version: '1',
  chainId: sepolia.id,
  verifyingContract: SHADOWVOTEV2_ADDRESS,
} as const;

const VOTE_TYPES = {
  Vote: [
    { name: 'proposalId', type: 'uint256' },
    { name: 'ctHash', type: 'uint256' },
    { name: 'securityZone', type: 'uint8' },
    { name: 'utype', type: 'uint8' },
    { name: 'nonce', type: 'uint256' },
  ],
} as const;

export function useGaslessVote() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { signTypedDataAsync } = useSignTypedData();
  const { encrypt, initialize, isInitialized } = useCofhe();

  const [state, setState] = useState<GaslessVoteState>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const gaslessVote = useCallback(async (proposalId: bigint, optionIndex: number): Promise<boolean> => {
    if (isSubmittingRef.current) return false;
    isSubmittingRef.current = true;

    try {
      setError(null);
      setState('initializing');

      if (!address || !publicClient) throw new Error('Wallet not connected');
      if (chainId !== sepolia.id) throw new Error('Wrong network — switch to Ethereum Sepolia');
      if (optionIndex < 0 || !Number.isInteger(optionIndex)) throw new Error('Invalid option');

      if (!isInitialized) await initialize();

      // Step 1: Encrypt vote in browser via CoFHE SDK
      setState('encrypting');
      const { Encryptable } = await import('@cofhe/sdk');
      const encrypted = await encrypt([Encryptable.uint32(BigInt(optionIndex))]);
      const encryptedVote = encrypted[0];

      const rawCtHash = encryptedVote.ctHash ?? encryptedVote.data?.ctHash;
      if (!rawCtHash) throw new Error('FHE encryption produced no ciphertext hash — ballot not submitted');
      const rawUtype = encryptedVote.utype ?? encryptedVote.data?.utype;
      if (rawUtype === undefined || rawUtype === null) throw new Error('FHE encryption produced no utype');
      const rawSecurityZone = encryptedVote.securityZone ?? encryptedVote.data?.securityZone ?? 0;
      const rawSig = (encryptedVote.signature ?? encryptedVote.data?.signature ?? '0x') as string;

      // Step 2: Read voter's current nonce from contract
      const nonce = await publicClient.readContract({
        address: SHADOWVOTEV2_ADDRESS,
        abi: SHADOWVOTEV2_ABI,
        functionName: 'nonces',
        args: [address],
      } as any) as bigint;

      // Step 3: Sign EIP-712 typed data — MetaMask shows structured data, not raw hex
      setState('signing');
      const ctHash = BigInt(rawCtHash);
      const eip712Signature = await signTypedDataAsync({
        account: address,
        domain: VOTE_DOMAIN,
        types: VOTE_TYPES,
        primaryType: 'Vote',
        message: {
          proposalId,
          ctHash,
          securityZone: Number(rawSecurityZone),
          utype: Number(rawUtype),
          nonce,
        },
      });

      // Step 4: Send to relay — relayer submits voteWithSignature() and pays gas
      setState('relaying');
      const res = await fetch('/api/relay-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposalId.toString(),
          encryptedVote: {
            ctHash: ctHash.toString(),
            signature: rawSig,
            securityZone: Number(rawSecurityZone),
            utype: Number(rawUtype),
          },
          nonce: nonce.toString(),
          signature: eip712Signature,
          voter: address,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `Relay failed with status ${res.status}`);
      }

      const data = await res.json();
      setTxHash(data.hash);
      setState('success');
      return true;
    } catch (err: any) {
      console.error('[ShadowDAO] Gasless vote failed:', err);
      setError(err.shortMessage ?? err.message ?? 'Gasless vote failed');
      setState('error');
      return false;
    } finally {
      isSubmittingRef.current = false;
    }
  }, [address, chainId, publicClient, signTypedDataAsync, encrypt, initialize, isInitialized]);

  const reset = useCallback(() => {
    setState('idle');
    setTxHash(null);
    setError(null);
  }, []);

  return { gaslessVote, state, txHash, error, reset };
}
