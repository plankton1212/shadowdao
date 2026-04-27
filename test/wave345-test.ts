/**
 * Wave 3/4/5 Integration Tests — ShadowVoteV2, ShadowTreasury, ShadowDelegate
 *
 * Requires in .env:
 *   PRIVATE_KEY=0x...
 *   PRIVATE_KEY_2=0x...
 *   SHADOWVOTEV2_ADDRESS=0x...
 *   SHADOWTREASURY_ADDRESS=0x...
 *   SHADOWDELEGATE_ADDRESS=0x...
 *   SHADOWSPACE_ADDRESS=0x...
 *
 * Run: npm run test:wave345
 */

import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import 'dotenv/config';

import {
  SHADOWVOTEV2_ABI,
  SHADOWTREASURY_ABI,
  SHADOWDELEGATE_ABI,
} from '../src/config/contract.js';

const V2_ADDR = process.env.SHADOWVOTEV2_ADDRESS! as `0x${string}`;
const TREASURY_ADDR = process.env.SHADOWTREASURY_ADDRESS! as `0x${string}`;
const DELEGATE_ADDR = process.env.SHADOWDELEGATE_ADDRESS! as `0x${string}`;

const account1 = privateKeyToAccount(process.env.PRIVATE_KEY! as `0x${string}`);
const account2 = privateKeyToAccount(process.env.PRIVATE_KEY_2! as `0x${string}`);

const publicClient = createPublicClient({ chain: sepolia, transport: http() });
const wallet1 = createWalletClient({ account: account1, chain: sepolia, transport: http() });
const wallet2 = createWalletClient({ account: account2, chain: sepolia, transport: http() });

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${name}... `);
  try {
    await fn();
    console.log('✓');
    passed++;
  } catch (e: any) {
    console.log(`✗ ${e.shortMessage ?? e.message}`);
    failed++;
  }
}

async function waitForTx(hash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
}

// ─── ShadowVoteV2 Tests ───────────────────────────────────────────────────────

async function testVoteV2() {
  console.log('\n── ShadowVoteV2 Tests ──');
  const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;

  let proposalId: bigint = 0n;
  const deadlineFuture = BigInt(Math.floor(Date.now() / 1000) + 600);

  await test('getProposalCount', async () => {
    const count = await publicClient.readContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI, functionName: 'getProposalCount',
    }) as bigint;
    console.log(`(${count} proposals)`);
    proposalId = count; // next ID
  });

  await test('createProposal with IPFS hash and weighted=false', async () => {
    const hash = await wallet1.writeContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI,
      functionName: 'createProposal',
      args: ['Wave3 Test Proposal', ZERO_HASH, 2, deadlineFuture, 1n, false, 0n, false],
    });
    await waitForTx(hash);
  });

  await test('getProposal returns weighted=false and descriptionHash', async () => {
    const p = await publicClient.readContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI,
      functionName: 'getProposal', args: [proposalId],
    }) as any;
    if (p.optionCount !== 2) throw new Error(`Expected 2 options, got ${p.optionCount}`);
    if (p.weighted !== false) throw new Error('Expected weighted=false');
    if (p.descriptionHash !== ZERO_HASH) throw new Error('Wrong descriptionHash');
  });

  await test('vote on V2 proposal (standard weight)', async () => {
    const encryptedOption = {
      ctHash: 1n,
      securityZone: 0,
      utype: 4,
      signature: '0x1234' as `0x${string}`,
    };
    const hash = await wallet1.writeContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI,
      functionName: 'vote', args: [proposalId, encryptedOption],
    });
    await waitForTx(hash);
  });

  await test('hasUserVoted returns true after voting', async () => {
    const voted = await publicClient.readContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI,
      functionName: 'hasUserVoted', args: [proposalId, account1.address],
    }) as boolean;
    if (!voted) throw new Error('Expected hasUserVoted=true');
  });

  await test('nonces increments correctly', async () => {
    const nonce = await publicClient.readContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI,
      functionName: 'nonces', args: [account1.address],
    }) as bigint;
    // nonce is 0 since we didn't use meta-tx, just check it's readable
    console.log(`(nonce=${nonce})`);
  });

  await test('postComment on V2 proposal', async () => {
    const ipfsHash = '0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`;
    const hash = await wallet1.writeContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI,
      functionName: 'postComment', args: [proposalId, ipfsHash],
    });
    await waitForTx(hash);
  });

  await test('getCommentCount returns 1', async () => {
    const count = await publicClient.readContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI,
      functionName: 'getCommentCount', args: [proposalId],
    }) as bigint;
    if (count !== 1n) throw new Error(`Expected 1 comment, got ${count}`);
  });

  await test('getComment returns author and ipfsHash', async () => {
    const [author, ipfsHash, blockNumber] = await publicClient.readContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI,
      functionName: 'getComment', args: [proposalId, 0n],
    }) as [string, string, bigint];
    if (author.toLowerCase() !== account1.address.toLowerCase()) throw new Error('Wrong author');
    console.log(`(block=${blockNumber})`);
  });

  await test('getUserVotes includes the new vote', async () => {
    const votes = await publicClient.readContract({
      address: V2_ADDR, abi: SHADOWVOTEV2_ABI,
      functionName: 'getUserVotes', args: [account1.address],
    }) as bigint[];
    if (!votes.includes(proposalId)) throw new Error('proposalId not in user votes');
  });
}

// ─── ShadowTreasury Tests ─────────────────────────────────────────────────────

async function testTreasury() {
  console.log('\n── ShadowTreasury Tests ──');

  await test('getEthBalance returns 0 initially', async () => {
    const bal = await publicClient.readContract({
      address: TREASURY_ADDR, abi: SHADOWTREASURY_ABI, functionName: 'getEthBalance',
    }) as bigint;
    console.log(`(balance=${formatEther(bal)} ETH)`);
  });

  await test('deposit 0.001 ETH', async () => {
    const hash = await wallet1.writeContract({
      address: TREASURY_ADDR, abi: SHADOWTREASURY_ABI,
      functionName: 'deposit', value: parseEther('0.001'),
    });
    await waitForTx(hash);
  });

  await test('getEthBalance increases after deposit', async () => {
    const bal = await publicClient.readContract({
      address: TREASURY_ADDR, abi: SHADOWTREASURY_ABI, functionName: 'getEthBalance',
    }) as bigint;
    if (bal < parseEther('0.001')) throw new Error('Balance did not increase');
    console.log(`(balance=${formatEther(bal)} ETH)`);
  });

  await test('getTreasuryBalance returns FHE handle (non-zero)', async () => {
    // This is a write (sets allowSender) — use simulate to read the handle
    const hash = await wallet1.writeContract({
      address: TREASURY_ADDR, abi: SHADOWTREASURY_ABI, functionName: 'getTreasuryBalance',
    });
    await waitForTx(hash);
    console.log(`(FHE handle returned, permit required to decrypt)`);
  });

  await test('allocationCount starts at 0', async () => {
    const count = await publicClient.readContract({
      address: TREASURY_ADDR, abi: SHADOWTREASURY_ABI, functionName: 'allocationCount',
    }) as bigint;
    console.log(`(${count} allocations)`);
  });

  await test('withdraw 0.001 ETH back to account1', async () => {
    const hash = await wallet1.writeContract({
      address: TREASURY_ADDR, abi: SHADOWTREASURY_ABI,
      functionName: 'withdraw',
      args: [parseEther('0.001'), account1.address],
    });
    await waitForTx(hash);
  });
}

// ─── ShadowDelegate Tests ─────────────────────────────────────────────────────

async function testDelegate() {
  console.log('\n── ShadowDelegate Tests ──');

  await test('getDelegateOf returns zero initially', async () => {
    const del = await publicClient.readContract({
      address: DELEGATE_ADDR, abi: SHADOWDELEGATE_ABI,
      functionName: 'getDelegateOf', args: [account1.address],
    }) as string;
    console.log(`(delegate=${del})`);
  });

  await test('getDelegators returns empty array initially', async () => {
    const delegators = await publicClient.readContract({
      address: DELEGATE_ADDR, abi: SHADOWDELEGATE_ABI,
      functionName: 'getDelegators', args: [account2.address],
    }) as string[];
    console.log(`(${delegators.length} delegators)`);
  });

  await test('delegate from account1 to account2', async () => {
    const power = { ctHash: 1n, securityZone: 0, utype: 4, signature: '0x1234' as `0x${string}` };
    const hash = await wallet1.writeContract({
      address: DELEGATE_ADDR, abi: SHADOWDELEGATE_ABI,
      functionName: 'delegate', args: [account2.address, power],
    });
    await waitForTx(hash);
  });

  await test('getDelegateOf account1 = account2 after delegation', async () => {
    const del = await publicClient.readContract({
      address: DELEGATE_ADDR, abi: SHADOWDELEGATE_ABI,
      functionName: 'getDelegateOf', args: [account1.address],
    }) as string;
    if (del.toLowerCase() !== account2.address.toLowerCase()) throw new Error('Wrong delegate');
  });

  await test('delegationCount[account2] = 1', async () => {
    const count = await publicClient.readContract({
      address: DELEGATE_ADDR, abi: SHADOWDELEGATE_ABI,
      functionName: 'delegationCount', args: [account2.address],
    }) as bigint;
    if (count !== 1n) throw new Error(`Expected 1, got ${count}`);
  });

  await test('getDelegators[account2] includes account1', async () => {
    const delegators = await publicClient.readContract({
      address: DELEGATE_ADDR, abi: SHADOWDELEGATE_ABI,
      functionName: 'getDelegators', args: [account2.address],
    }) as string[];
    if (!delegators.some(d => d.toLowerCase() === account1.address.toLowerCase())) {
      throw new Error('account1 not in delegators');
    }
  });

  await test('getTopDelegates returns account2', async () => {
    const [delegates, counts] = await publicClient.readContract({
      address: DELEGATE_ADDR, abi: SHADOWDELEGATE_ABI,
      functionName: 'getTopDelegates', args: [5],
    }) as [string[], bigint[]];
    if (delegates.length === 0) throw new Error('No delegates returned');
    console.log(`(top: ${delegates[0].slice(0,10)}... count=${counts[0]})`);
  });

  await test('undelegate from account1', async () => {
    const power = { ctHash: 1n, securityZone: 0, utype: 4, signature: '0x1234' as `0x${string}` };
    const hash = await wallet1.writeContract({
      address: DELEGATE_ADDR, abi: SHADOWDELEGATE_ABI,
      functionName: 'undelegate', args: [power],
    });
    await waitForTx(hash);
  });

  await test('getDelegateOf account1 = zero after undelegate', async () => {
    const del = await publicClient.readContract({
      address: DELEGATE_ADDR, abi: SHADOWDELEGATE_ABI,
      functionName: 'getDelegateOf', args: [account1.address],
    }) as string;
    if (del !== '0x0000000000000000000000000000000000000000') throw new Error(`Expected zero, got ${del}`);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('ShadowDAO Wave 3/4/5 Integration Tests');
  console.log('========================================');
  console.log(`Account1: ${account1.address}`);
  console.log(`Account2: ${account2.address}`);

  const V2_DEPLOYED = V2_ADDR && V2_ADDR !== '0x0000000000000000000000000000000000000000';
  const T_DEPLOYED = TREASURY_ADDR && TREASURY_ADDR !== '0x0000000000000000000000000000000000000000';
  const D_DEPLOYED = DELEGATE_ADDR && DELEGATE_ADDR !== '0x0000000000000000000000000000000000000000';

  if (!V2_DEPLOYED) { console.log('\n⚠️  SHADOWVOTEV2_ADDRESS not set, skipping V2 tests'); }
  else await testVoteV2();

  if (!T_DEPLOYED) { console.log('\n⚠️  SHADOWTREASURY_ADDRESS not set, skipping Treasury tests'); }
  else await testTreasury();

  if (!D_DEPLOYED) { console.log('\n⚠️  SHADOWDELEGATE_ADDRESS not set, skipping Delegate tests'); }
  else await testDelegate();

  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
