/**
 * ShadowSpaceClient — read/write wrapper for ShadowSpace contract.
 */

import type { Address, Space } from './types.js';

export interface ShadowSpaceClientConfig {
  address: Address;
  abi: readonly any[];
  publicClient: any;
  walletClient?: any;
}

export class ShadowSpaceClient {
  readonly address: Address;
  private readonly abi: readonly any[];
  private readonly publicClient: any;
  private readonly walletClient: any;

  constructor(config: ShadowSpaceClientConfig) {
    this.address = config.address;
    this.abi = config.abi;
    this.publicClient = config.publicClient;
    this.walletClient = config.walletClient;
  }

  async getSpaceCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'getSpaceCount',
    }) as Promise<bigint>;
  }

  async getSpace(spaceId: bigint): Promise<Space> {
    const r = await this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'getSpace',
      args: [spaceId],
    }) as any;
    return {
      id: spaceId,
      creator: r.creator as Address,
      name: r.name as string,
      description: r.description as string,
      category: Number(r.category),
      isPublic: r.isPublic as boolean,
      defaultQuorum: r.defaultQuorum as bigint,
      memberCount: r.memberCount as bigint,
      proposalCount: r.proposalCount as bigint,
      active: r.active as boolean,
    };
  }

  async getAllSpaces(): Promise<Space[]> {
    const count = await this.getSpaceCount();
    return Promise.all(
      Array.from({ length: Number(count) }, (_, i) => this.getSpace(BigInt(i)))
    );
  }

  async getMembers(spaceId: bigint): Promise<Address[]> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'getMembers',
      args: [spaceId],
    }) as Promise<Address[]>;
  }

  async getUserSpaces(user: Address): Promise<bigint[]> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'getUserSpaces',
      args: [user],
    }) as Promise<bigint[]>;
  }

  async isSpaceMember(spaceId: bigint, user: Address): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: 'isSpaceMember',
      args: [spaceId, user],
    }) as Promise<boolean>;
  }

  private requireWallet(): void {
    if (!this.walletClient) throw new Error('walletClient required');
  }

  async createSpace(params: {
    name: string;
    description: string;
    category: number;
    isPublic: boolean;
    defaultQuorum: bigint;
    initialMembers?: Address[];
  }): Promise<`0x${string}`> {
    this.requireWallet();
    return this.walletClient.writeContract({
      address: this.address,
      abi: this.abi,
      functionName: 'createSpace',
      args: [params.name, params.description, params.category, params.isPublic, params.defaultQuorum, params.initialMembers ?? []],
    });
  }

  async joinSpace(spaceId: bigint): Promise<`0x${string}`> {
    this.requireWallet();
    return this.walletClient.writeContract({
      address: this.address, abi: this.abi, functionName: 'joinSpace', args: [spaceId],
    });
  }

  async leaveSpace(spaceId: bigint): Promise<`0x${string}`> {
    this.requireWallet();
    return this.walletClient.writeContract({
      address: this.address, abi: this.abi, functionName: 'leaveSpace', args: [spaceId],
    });
  }
}
