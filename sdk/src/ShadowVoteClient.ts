/**
 * ShadowVoteClient — read/write wrapper for ShadowVote and ShadowVoteV2 contracts.
 *
 * Generic: swap the contract address and ABI to use with any FHE-voting contract
 * that follows the same interface pattern.
 *
 * @example
 * import { ShadowVoteClient } from 'shadowdao-sdk';
 * import { createPublicClient, http } from 'viem';
 * import { sepolia } from 'viem/chains';
 *
 * const client = new ShadowVoteClient({
 *   address: '0x...',
 *   abi: SHADOWVOTE_ABI,
 *   publicClient: createPublicClient({ chain: sepolia, transport: http() }),
 * });
 *
 * const proposals = await client.getAllProposals();
 */

import type { Address, Proposal, VoteResult, InEuint32 } from './types.js';

export interface ShadowVoteClientConfig {
  address: Address;
  abi: readonly any[];
  publicClient: any;
  walletClient?: any;
}

export class ShadowVoteClient {
  readonly address: Address;
  private readonly abi: readonly any[];
  private readonly publicClient: any;
  private readonly walletClient: any;

  constructor(config: ShadowVoteClientConfig) {
    this.address = config.address;
    this.abi = config.abi;
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
  }

  // ─── Reads ────────────────────────────────────────────────────────────────

  async getProposalCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'getProposalCount',
    }) as Promise<bigint>;
  }

  async getProposal(proposalId: bigint): Promise<Proposal> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'getProposal',
      args: [proposalId],
    }) as any;

    const now = BigInt(Math.floor(Date.now() / 1000));
    let status: Proposal['status'] = 'VOTING';
    if (result.optionCount === 0) status = 'CANCELLED';
    else if (result.revealed) status = 'REVEALED';
    else if (result.deadline <= now) status = 'ENDED';

    return {
      id: proposalId,
      creator: result.creator as Address,
      title: result.title as string,
      descriptionHash: result.descriptionHash,
      optionCount: Number(result.optionCount),
      deadline: result.deadline as bigint,
      quorum: result.quorum as bigint,
      voterCount: result.voterCount as bigint,
      revealed: result.revealed as boolean,
      weighted: result.weighted as boolean | undefined,
      spaceId: result.spaceId as bigint,
      spaceGated: result.spaceGated as boolean,
      status,
    };
  }

  async getAllProposals(): Promise<Proposal[]> {
    const count = await this.getProposalCount();
    const proposals = await Promise.all(
      Array.from({ length: Number(count) }, (_, i) => this.getProposal(BigInt(i)))
    );
    return proposals;
  }

  async hasUserVoted(proposalId: bigint, user: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'hasUserVoted',
      args: [proposalId, user],
    }) as Promise<boolean>;
  }

  async getUserProposals(user: Address): Promise<bigint[]> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'getUserProposals',
      args: [user],
    }) as Promise<bigint[]>;
  }

  async getUserVotes(user: Address): Promise<bigint[]> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'getUserVotes',
      args: [user],
    }) as Promise<bigint[]>;
  }

  async getProposalsBySpace(spaceId: bigint): Promise<bigint[]> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'getProposalsBySpace',
      args: [spaceId],
    }) as Promise<bigint[]>;
  }

  // ─── Writes ───────────────────────────────────────────────────────────────

  private requireWallet(): void {
    if (!this.walletClient) throw new Error('walletClient required for write operations');
  }

  async createProposal(params: {
    title: string;
    descriptionHash?: `0x${string}`;
    optionCount: number;
    deadline: bigint;
    quorum: bigint;
    weighted?: boolean;
    spaceId?: bigint;
    spaceGated?: boolean;
  }): Promise<`0x${string}`> {
    this.requireWallet();
    const isV2 = this.abi.some((f: any) => f.name === 'createProposal' &&
      f.inputs?.some((i: any) => i.name === '_descriptionHash'));

    if (isV2) {
      return this.walletClient.writeContract({
        address: this.address,
        abi: this.abi,
        functionName: 'createProposal',
        args: [
          params.title,
          params.descriptionHash ?? '0x0000000000000000000000000000000000000000000000000000000000000000',
          params.optionCount,
          params.deadline,
          params.quorum,
          params.weighted ?? false,
          params.spaceId ?? 0n,
          params.spaceGated ?? false,
        ],
      });
    }
    return this.walletClient.writeContract({
      address: this.address,
      abi: this.abi,
      functionName: 'createProposal',
      args: [params.title, params.optionCount, params.deadline, params.quorum, params.spaceId ?? 0n, params.spaceGated ?? false],
    });
  }

  async vote(proposalId: bigint, encryptedOption: InEuint32): Promise<`0x${string}`> {
    this.requireWallet();
    return this.walletClient.writeContract({
      address: this.address,
      abi: this.abi,
      functionName: 'vote',
      args: [proposalId, encryptedOption],
    });
  }

  async revealResults(proposalId: bigint): Promise<`0x${string}`> {
    this.requireWallet();
    return this.walletClient.writeContract({
      address: this.address,
      abi: this.abi,
      functionName: 'revealResults',
      args: [proposalId],
    });
  }
}
