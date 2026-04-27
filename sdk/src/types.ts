// ShadowDAO SDK — TypeScript type definitions

export type Address = `0x${string}`;
export type Hash = `0x${string}`;

/** Fhenix CoFHE encrypted input (browser-generated) */
export interface InEuint32 {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: Hash;
}

/** Proposal as returned by ShadowVote(V2).getProposal() */
export interface Proposal {
  id: bigint;
  creator: Address;
  title: string;
  /** IPFS hash of proposal description (V2 only) */
  descriptionHash?: Hash;
  optionCount: number;
  deadline: bigint;
  quorum: bigint;
  voterCount: bigint;
  revealed: boolean;
  /** True if FHE.mul applied (V2 weighted voting) */
  weighted?: boolean;
  spaceId: bigint;
  spaceGated: boolean;
  /** Derived status */
  status: 'VOTING' | 'ENDED' | 'REVEALED' | 'CANCELLED';
}

/** DAO Space as returned by ShadowSpace.getSpace() */
export interface Space {
  id: bigint;
  creator: Address;
  name: string;
  description: string;
  category: number;
  isPublic: boolean;
  defaultQuorum: bigint;
  memberCount: bigint;
  proposalCount: bigint;
  active: boolean;
}

/** Decrypted vote result (after FHE.allowPublic + decryptForView) */
export interface VoteResult {
  optionIndex: number;
  votes: number;
}

/** Comment stored on-chain in ShadowVoteV2 */
export interface Comment {
  author: Address;
  /** bytes32 IPFS hash */
  ipfsHash: Hash;
  blockNumber: bigint;
}

/** Treasury allocation */
export interface Allocation {
  id: number;
  proposalId: bigint;
  amountWei: bigint;
  recipient: Address;
  executed: boolean;
  cancelled: boolean;
}

/** Delegate entry for leaderboard */
export interface DelegateEntry {
  address: Address;
  delegationCount: number;
}

/** SDK configuration */
export interface ShadowDAOConfig {
  /** ShadowVote V1 address (Wave 1-2) */
  shadowVoteAddress: Address;
  /** ShadowSpace address */
  shadowSpaceAddress: Address;
  /** ShadowVoteV2 address (Wave 3+) */
  shadowVoteV2Address?: Address;
  /** ShadowTreasury address (Wave 3) */
  shadowTreasuryAddress?: Address;
  /** ShadowDelegate address (Wave 4) */
  shadowDelegateAddress?: Address;
  /** viem PublicClient */
  publicClient: any;
  /** viem WalletClient (for write operations) */
  walletClient?: any;
}
