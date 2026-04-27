/**
 * shadowdao-sdk — TypeScript SDK for ShadowDAO FHE-encrypted governance
 *
 * Quick start:
 *   npm install shadowdao-sdk viem
 *
 * Usage:
 *   import { ShadowVoteClient, ShadowSpaceClient, useShadowVote } from 'shadowdao-sdk';
 *
 * Reusability:
 *   - ShadowVoteClient and ShadowSpaceClient accept any address + ABI
 *   - useShadowVote hook is fully generic — swap your own contract
 *   - All TypeScript types exported for IDE completions
 */

export { ShadowVoteClient } from './ShadowVoteClient.js';
export { ShadowSpaceClient } from './ShadowSpaceClient.js';
export { useShadowVote } from './useShadowVote.js';

export type {
  Address,
  Hash,
  InEuint32,
  Proposal,
  Space,
  VoteResult,
  Comment,
  Allocation,
  DelegateEntry,
  ShadowDAOConfig,
} from './types.js';
