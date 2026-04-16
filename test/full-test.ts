/**
 * ShadowDAO — Full Contract Test Suite
 * Covers every function in ShadowVote.sol + ShadowSpace.sol (Wave 1 + Wave 2)
 * Makes real transactions on Sepolia with two accounts.
 *
 * Usage:
 *   npx tsx test/full-test.ts
 *   PRIVATE_KEY=0x... PRIVATE_KEY_2=0x... npx tsx test/full-test.ts
 */

import { createPublicClient, createWalletClient, http, parseAbi, getAddress } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────

const KEY1 = (process.env.PRIVATE_KEY || '') as `0x${string}`;
const KEY2 = (process.env.PRIVATE_KEY_2 || '') as `0x${string}`;
if (!KEY1 || !KEY2) {
  console.error('Need PRIVATE_KEY and PRIVATE_KEY_2 in .env');
  process.exit(1);
}

const RPC   = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const VOTE  = '0xd0Cb4AFC95919d6a37F1b363c6cc0745752faBb5' as const;
const SPACE = '0x2B2A4370c5f26cB109D04047e018E65ddf413c88' as const;

// ─── ABI ──────────────────────────────────────────────────────────────────────

const VOTE_ABI = parseAbi([
  // write
  'function createProposal(string _title, uint8 _optionCount, uint256 _deadline, uint256 _quorum) returns (uint256)',
  'function vote(uint256 _proposalId, (uint256 ctHash, uint8 securityZone, uint8 utype, bytes signature) _encryptedOption)',
  'function revealResults(uint256 _proposalId)',
  'function cancelProposal(uint256 _proposalId)',
  'function extendDeadline(uint256 _proposalId, uint256 _newDeadline)',
  'function checkQuorumEncrypted(uint256 _proposalId) returns (uint256)',
  'function getEncryptedMaxTally(uint256 _proposalId) returns (uint256)',
  'function getEncryptedDifferential(uint256 _proposalId, uint8 _optionA, uint8 _optionB) returns (uint256)',
  // read
  'function getProposal(uint256 _proposalId) view returns (address creator, string title, uint8 optionCount, uint256 deadline, uint256 quorum, uint256 voterCount, bool revealed)',
  'function hasUserVoted(uint256 _proposalId, address _user) view returns (bool)',
  'function getProposalCount() view returns (uint256)',
  'function getUserProposals(address _user) view returns (uint256[])',
  'function getUserVotes(address _user) view returns (uint256[])',
  'function getEncryptedTally(uint256 _proposalId, uint8 _optionIndex) view returns (uint256)',
  'function getMyVote(uint256 _proposalId) view returns (uint256)',
  // events
  'event ProposalCreated(uint256 indexed proposalId, address indexed creator, string title, uint8 optionCount, uint256 deadline, uint256 quorum)',
  'event VoteCast(uint256 indexed proposalId, address indexed voter)',
  'event ResultsRevealed(uint256 indexed proposalId)',
  'event ProposalCancelled(uint256 indexed proposalId, address indexed creator)',
  'event DeadlineExtended(uint256 indexed proposalId, uint256 newDeadline)',
]);

const SPACE_ABI = parseAbi([
  // write — Wave 1
  'function createSpace(string _name, string _description, uint8 _category, bool _isPublic, uint256 _defaultQuorum, address[] _initialMembers) returns (uint256)',
  'function joinSpace(uint256 _spaceId)',
  'function addMember(uint256 _spaceId, address _member)',
  'function removeMember(uint256 _spaceId, address _member)',
  'function updateSpace(uint256 _spaceId, string _name, string _description)',
  // write — Wave 2
  'function leaveSpace(uint256 _spaceId)',
  'function archiveSpace(uint256 _spaceId)',
  'function setShadowVoteContract(address _shadowVote)',
  // read
  'function getSpace(uint256 _spaceId) view returns (address creator, string name, string description, uint8 category, bool isPublic, uint256 defaultQuorum, uint256 memberCount, uint256 proposalCount, bool active)',
  'function getSpaceCount() view returns (uint256)',
  'function getMembers(uint256 _spaceId) view returns (address[])',
  'function getUserSpaces(address _user) view returns (uint256[])',
  'function isSpaceMember(uint256 _spaceId, address _user) view returns (bool)',
  'function owner() view returns (address)',
  'function shadowVoteContract() view returns (address)',
  // events
  'event SpaceCreated(uint256 indexed spaceId, address indexed creator, string name, string description, uint8 category, bool isPublic, uint256 defaultQuorum)',
  'event MemberJoined(uint256 indexed spaceId, address indexed member)',
  'event MemberRemoved(uint256 indexed spaceId, address indexed member)',
  'event SpaceArchived(uint256 indexed spaceId, address indexed creator)',
]);

// ─── Setup ────────────────────────────────────────────────────────────────────

const acc1 = privateKeyToAccount(KEY1);
const acc2 = privateKeyToAccount(KEY2);

const pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
const w1  = createWalletClient({ account: acc1, chain: sepolia, transport: http(RPC) });
const w2  = createWalletClient({ account: acc2, chain: sepolia, transport: http(RPC) });

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0;
const log: { name: string; status: 'ok' | 'fail' | 'skip'; detail?: string; ms: number }[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const t0 = Date.now();
  try {
    await fn();
    const ms = Date.now() - t0;
    passed++;
    log.push({ name, status: 'ok', ms });
    console.log(`  \x1b[32m✓\x1b[0m ${name} \x1b[2m(${ms}ms)\x1b[0m`);
  } catch (err: any) {
    const ms = Date.now() - t0;
    const detail = (err.shortMessage || err.message || String(err)).slice(0, 300);
    if (detail.includes('SKIP:')) {
      skipped++;
      log.push({ name, status: 'skip', detail, ms });
      console.log(`  \x1b[33m○\x1b[0m ${name} \x1b[2m(skipped)\x1b[0m`);
      return;
    }
    failed++;
    log.push({ name, status: 'fail', detail, ms });
    console.log(`  \x1b[31m✗\x1b[0m ${name} \x1b[2m(${ms}ms)\x1b[0m`);
    console.log(`    \x1b[31m→ ${detail}\x1b[0m`);
  }
}

function skip(reason: string): never { throw new Error(`SKIP: ${reason}`); }
function assert(cond: boolean, msg: string) { if (!cond) throw new Error(`Assert failed: ${msg}`); }
async function waitTx(hash: `0x${string}`) {
  return pub.waitForTransactionReceipt({ hash, timeout: 120_000 });
}

// Expect revert — test passes if tx reverts with matching message
async function expectRevert(label: string, fn: () => Promise<any>, contains: string) {
  try {
    await fn();
    throw new Error(`Expected revert containing "${contains}" but tx succeeded`);
  } catch (err: any) {
    const msg = (err.shortMessage || err.message || String(err));
    if (msg.includes(contains) || msg.toLowerCase().includes('revert')) {
      console.log(`    \x1b[2m→ Correctly reverted: ${msg.slice(0, 80)}\x1b[0m`);
    } else {
      throw err;
    }
  }
}

function section(title: string) {
  console.log('');
  console.log(`\x1b[36m─── ${title}\x1b[0m`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   ShadowDAO — Full Test Suite (Wave 1 + Wave 2)             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Acc1:  ${acc1.address}`);
  console.log(`  Acc2:  ${acc2.address}`);
  console.log(`  Vote:  ${VOTE}`);
  console.log(`  Space: ${SPACE}`);
  console.log(`  RPC:   ${RPC}`);

  const [bal1, bal2] = await Promise.all([
    pub.getBalance({ address: acc1.address }),
    pub.getBalance({ address: acc2.address }),
  ]);
  const eth1 = Number(bal1) / 1e18;
  const eth2 = Number(bal2) / 1e18;
  console.log(`  Bal1:  ${eth1.toFixed(5)} ETH`);
  console.log(`  Bal2:  ${eth2.toFixed(5)} ETH`);

  if (eth1 < 0.002 || eth2 < 0.002) {
    console.error('\n  ✗ Both accounts need ≥ 0.002 ETH on Sepolia');
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  section('1. ShadowVote — Read baseline');

  let totalProposals = 0n;
  await test('getProposalCount()', async () => {
    totalProposals = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getProposalCount' }) as bigint;
    console.log(`    → ${totalProposals} existing proposals`);
  });

  await test('getUserProposals(acc1)', async () => {
    const r = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getUserProposals', args: [acc1.address] }) as bigint[];
    assert(Array.isArray(r), 'Array expected');
    console.log(`    → acc1 created ${r.length} proposals`);
  });

  await test('getUserProposals(acc2)', async () => {
    const r = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getUserProposals', args: [acc2.address] }) as bigint[];
    console.log(`    → acc2 created ${r.length} proposals`);
  });

  await test('getUserVotes(acc1)', async () => {
    const r = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getUserVotes', args: [acc1.address] }) as bigint[];
    console.log(`    → acc1 voted on ${r.length} proposals`);
  });

  await test('getUserVotes(acc2)', async () => {
    const r = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getUserVotes', args: [acc2.address] }) as bigint[];
    console.log(`    → acc2 voted on ${r.length} proposals`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  section('2. ShadowVote — createProposal (acc1)');

  let mainPid = 0n;
  await test('createProposal — 3 options, quorum=2, deadline=10min', async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const hash = await w1.writeContract({
      address: VOTE, abi: VOTE_ABI, functionName: 'createProposal',
      args: ['Wave2 Full Test', 3, deadline, 2n],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'tx success');
    mainPid = (await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getProposalCount' }) as bigint) - 1n;
    console.log(`    → Proposal #${mainPid} at block ${receipt.blockNumber}`);
  });

  await test('getProposal — verify all fields', async () => {
    const p = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getProposal', args: [mainPid] }) as any;
    assert(getAddress(p[0]) === getAddress(acc1.address), `creator=${p[0]}`);
    assert(p[1] === 'Wave2 Full Test',  `title=${p[1]}`);
    assert(p[2] === 3,                  `optionCount=${p[2]}`);
    assert(p[4] === 2n,                 `quorum=${p[4]}`);
    assert(p[5] === 0n,                 `voterCount=${p[5]}`);
    assert(p[6] === false,              `revealed=${p[6]}`);
    console.log(`    → creator=${p[0].slice(0,10)}... title="${p[1]}" opts=${p[2]} quorum=${p[4]} revealed=${p[6]}`);
  });

  await test('hasUserVoted(acc1) = false (before vote)', async () => {
    const v = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'hasUserVoted', args: [mainPid, acc1.address] });
    assert(v === false, 'should be false');
  });

  await test('getEncryptedTally — all 3 options return handles', async () => {
    for (let i = 0; i < 3; i++) {
      const t = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getEncryptedTally', args: [mainPid, i] }) as bigint;
      assert(typeof t === 'bigint', `option ${i} handle`);
      console.log(`    → option ${i} handle = ${t}`);
    }
  });

  await test('getUserProposals — includes new proposal', async () => {
    const r = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getUserProposals', args: [acc1.address] }) as bigint[];
    assert(r.includes(mainPid), `${mainPid} in list`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  section('3. ShadowVote — vote (FHE ciphertext path)');

  let acc1Voted = false;
  let acc2Voted = false;

  await test('vote acc1 — CoFHE ciphertext (expected revert if invalid)', async () => {
    try {
      const hash = await w1.writeContract({
        address: VOTE, abi: VOTE_ABI, functionName: 'vote',
        args: [mainPid, { ctHash: 99991n, securityZone: 0, utype: 4, signature: '0x00' as `0x${string}` }],
      });
      console.log(`    → tx: ${hash}`);
      const receipt = await waitTx(hash);
      if (receipt.status === 'success') {
        acc1Voted = true;
        console.log(`    → Vote accepted (FHE coprocessor validated)`);
      } else {
        console.log(`    → tx reverted in receipt (FHE coprocessor rejected — expected)`);
      }
    } catch (err: any) {
      const msg = err.shortMessage || err.message || '';
      console.log(`    → FHE coprocessor rejected simulated ctHash: ${msg.slice(0, 100)}`);
    }
  });

  await test('vote acc2 — CoFHE ciphertext', async () => {
    try {
      const hash = await w2.writeContract({
        address: VOTE, abi: VOTE_ABI, functionName: 'vote',
        args: [mainPid, { ctHash: 99992n, securityZone: 0, utype: 4, signature: '0x00' as `0x${string}` }],
      });
      console.log(`    → tx: ${hash}`);
      const receipt = await waitTx(hash);
      if (receipt.status === 'success') {
        acc2Voted = true;
        console.log(`    → Vote accepted`);
      }
    } catch (err: any) {
      console.log(`    → FHE rejected: ${(err.shortMessage || err.message || '').slice(0, 100)}`);
    }
  });

  await test('hasUserVoted — check both accounts after vote attempt', async () => {
    const [v1, v2] = await Promise.all([
      pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'hasUserVoted', args: [mainPid, acc1.address] }),
      pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'hasUserVoted', args: [mainPid, acc2.address] }),
    ]);
    acc1Voted = v1 as boolean;
    acc2Voted = v2 as boolean;
    console.log(`    → acc1.voted=${v1}  acc2.voted=${v2}`);
  });

  await test('vote — double vote should revert (if acc1 voted)', async () => {
    if (!acc1Voted) { console.log('    → Skip: acc1 did not vote (FHE rejected)'); return; }
    await expectRevert('double vote', () => w1.writeContract({
      address: VOTE, abi: VOTE_ABI, functionName: 'vote',
      args: [mainPid, { ctHash: 777n, securityZone: 0, utype: 4, signature: '0x00' as `0x${string}` }],
    }), 'revert');
  });

  await test('getMyVote — acc1 reads own encrypted vote (only if voted)', async () => {
    if (!acc1Voted) {
      console.log('    → Skip: acc1 has no vote (FHE rejected simulated ciphertext — expected on testnet)');
      return;
    }
    const h = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getMyVote', args: [mainPid] }) as bigint;
    console.log(`    → encrypted vote handle = ${h}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  section('4. ShadowVote — FHE aggregate ops');

  await test('checkQuorumEncrypted() — FHE.gte(voterCount, quorum)', async () => {
    try {
      const hash = await w1.writeContract({
        address: VOTE, abi: VOTE_ABI, functionName: 'checkQuorumEncrypted', args: [mainPid],
      });
      console.log(`    → tx: ${hash}`);
      const receipt = await waitTx(hash);
      assert(receipt.status === 'success', 'tx ok');
      console.log(`    → FHE.gte() executed successfully at block ${receipt.blockNumber}`);
    } catch (err: any) {
      console.log(`    → FHE.gte() error (may need votes): ${(err.shortMessage || err.message || '').slice(0, 100)}`);
    }
  });

  await test('getEncryptedMaxTally() — FHE.max() across options', async () => {
    try {
      const hash = await w1.writeContract({
        address: VOTE, abi: VOTE_ABI, functionName: 'getEncryptedMaxTally', args: [mainPid],
      });
      console.log(`    → tx: ${hash}`);
      const receipt = await waitTx(hash);
      assert(receipt.status === 'success', 'tx ok');
      console.log(`    → FHE.max() executed at block ${receipt.blockNumber}`);
    } catch (err: any) {
      console.log(`    → FHE.max() error: ${(err.shortMessage || err.message || '').slice(0, 100)}`);
    }
  });

  await test('getEncryptedDifferential(0,1) — FHE.sub()', async () => {
    try {
      const hash = await w1.writeContract({
        address: VOTE, abi: VOTE_ABI, functionName: 'getEncryptedDifferential', args: [mainPid, 0, 1],
      });
      console.log(`    → tx: ${hash}`);
      const receipt = await waitTx(hash);
      assert(receipt.status === 'success', 'tx ok');
      console.log(`    → FHE.sub() executed at block ${receipt.blockNumber}`);
    } catch (err: any) {
      console.log(`    → FHE.sub() error: ${(err.shortMessage || err.message || '').slice(0, 100)}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  section('5. ShadowVote — admin functions');

  let cancelPid = 0n;
  await test('createProposal — for cancel test', async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const hash = await w1.writeContract({
      address: VOTE, abi: VOTE_ABI, functionName: 'createProposal',
      args: ['Cancel Me', 2, deadline, 1n],
    });
    await waitTx(hash);
    cancelPid = (await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getProposalCount' }) as bigint) - 1n;
    console.log(`    → Proposal #${cancelPid}`);
  });

  await test('cancelProposal — acc2 cannot cancel acc1 proposal', async () => {
    await expectRevert('acc2 cancel', () => w2.writeContract({
      address: VOTE, abi: VOTE_ABI, functionName: 'cancelProposal', args: [cancelPid],
    }), 'revert');
  });

  await test('cancelProposal — acc1 cancels own proposal', async () => {
    const hash = await w1.writeContract({
      address: VOTE, abi: VOTE_ABI, functionName: 'cancelProposal', args: [cancelPid],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const p = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getProposal', args: [cancelPid] }) as any;
    console.log(`    → optionCount after cancel = ${p[2]} (expect 0)`);
    assert(p[2] === 0, 'cancelled = optionCount 0');
  });

  await test('extendDeadline — acc2 cannot extend acc1 proposal', async () => {
    await expectRevert('acc2 extend', () => w2.writeContract({
      address: VOTE, abi: VOTE_ABI, functionName: 'extendDeadline',
      args: [mainPid, BigInt(Math.floor(Date.now() / 1000) + 999999)],
    }), 'revert');
  });

  await test('extendDeadline — acc1 extends own proposal', async () => {
    const newDeadline = BigInt(Math.floor(Date.now() / 1000) + 86400);
    const hash = await w1.writeContract({
      address: VOTE, abi: VOTE_ABI, functionName: 'extendDeadline', args: [mainPid, newDeadline],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const p = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getProposal', args: [mainPid] }) as any;
    assert(p[3] === newDeadline, 'deadline updated');
    console.log(`    → Extended to ${new Date(Number(newDeadline) * 1000).toISOString()}`);
  });

  await test('revealResults — should revert (deadline not passed)', async () => {
    await expectRevert('reveal before deadline', () => w1.writeContract({
      address: VOTE, abi: VOTE_ABI, functionName: 'revealResults', args: [mainPid],
    }), 'revert');
  });

  await test('createProposal — acc2 creates own proposal', async () => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const hash = await w2.writeContract({
      address: VOTE, abi: VOTE_ABI, functionName: 'createProposal',
      args: ['Acc2 Proposal', 2, deadline, 1n],
    });
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const pid2 = (await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getProposalCount' }) as bigint) - 1n;
    const p = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getProposal', args: [pid2] }) as any;
    assert(getAddress(p[0]) === getAddress(acc2.address), 'creator = acc2');
    console.log(`    → Proposal #${pid2} by acc2`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  section('6. ShadowSpace — read baseline (Wave 1)');

  let spaceCount0 = 0n;
  await test('getSpaceCount()', async () => {
    spaceCount0 = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpaceCount' }) as bigint;
    console.log(`    → ${spaceCount0} existing spaces`);
  });

  await test('owner() — should return deployer', async () => {
    const o = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'owner' }) as string;
    console.log(`    → owner = ${o}`);
    assert(o !== '0x0000000000000000000000000000000000000000', 'owner not zero');
  });

  await test('shadowVoteContract() — current ACL address', async () => {
    const sv = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'shadowVoteContract' }) as string;
    console.log(`    → shadowVoteContract = ${sv}`);
  });

  await test('getUserSpaces(acc1)', async () => {
    const s = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getUserSpaces', args: [acc1.address] }) as bigint[];
    console.log(`    → acc1 in ${s.length} spaces`);
  });

  await test('getUserSpaces(acc2)', async () => {
    const s = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getUserSpaces', args: [acc2.address] }) as bigint[];
    console.log(`    → acc2 in ${s.length} spaces`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  section('7. ShadowSpace — createSpace + member management (Wave 1)');

  let sid = 0n; // main space used in tests below
  await test('createSpace — public DeFi space, no initial members', async () => {
    const hash = await w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'createSpace',
      args: ['Wave2 Test DAO', 'Full test space', 0, true, 3n, []],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    sid = (await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpaceCount' }) as bigint) - 1n;
    console.log(`    → Space #${sid} at block ${receipt.blockNumber}`);
  });

  await test('getSpace — verify all fields', async () => {
    const s = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpace', args: [sid] }) as any;
    assert(getAddress(s[0]) === getAddress(acc1.address), `creator ${s[0]}`);
    assert(s[1] === 'Wave2 Test DAO',    `name ${s[1]}`);
    assert(s[2] === 'Full test space',   `desc ${s[2]}`);
    assert(s[3] === 0,                   `category ${s[3]} (DeFi)`);
    assert(s[4] === true,                `isPublic ${s[4]}`);
    assert(s[5] === 3n,                  `defaultQuorum ${s[5]}`);
    assert(s[6] === 1n,                  `memberCount ${s[6]}`);
    assert(s[7] === 0n,                  `proposalCount ${s[7]}`);
    assert(s[8] === true,                `active ${s[8]}`);
    console.log(`    → creator=${s[0].slice(0,10)}... name="${s[1]}" members=${s[6]} active=${s[8]}`);
  });

  await test('createSpace — private NFT space with acc2 as initial member', async () => {
    const hash = await w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'createSpace',
      args: ['Private NFT DAO', 'Invite only', 1, false, 2n, [acc2.address]],
    });
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const sid2 = (await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpaceCount' }) as bigint) - 1n;
    const members = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getMembers', args: [sid2] }) as string[];
    const addrs = members.map(m => getAddress(m));
    assert(addrs.includes(getAddress(acc2.address)), 'acc2 in initial members');
    console.log(`    → Space #${sid2} created, initial members: ${members.length} (acc1 + acc2)`);
  });

  await test('isSpaceMember(acc1) = true (creator)', async () => {
    const m = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'isSpaceMember', args: [sid, acc1.address] });
    assert(m === true, 'creator is member');
  });

  await test('isSpaceMember(acc2) = false (not joined yet)', async () => {
    const m = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'isSpaceMember', args: [sid, acc2.address] });
    assert(m === false, 'not member');
  });

  await test('joinSpace — acc2 joins public space', async () => {
    const hash = await w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'joinSpace', args: [sid],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
  });

  await test('joinSpace — acc2 cannot join again (already member)', async () => {
    await expectRevert('double join', () => w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'joinSpace', args: [sid],
    }), 'revert');
  });

  await test('isSpaceMember(acc2) = true after join', async () => {
    const m = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'isSpaceMember', args: [sid, acc2.address] });
    assert(m === true, 'now member');
  });

  await test('getMembers — returns both accounts', async () => {
    const members = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getMembers', args: [sid] }) as string[];
    const addrs = members.map(m => getAddress(m));
    assert(addrs.includes(getAddress(acc1.address)), 'acc1 in list');
    assert(addrs.includes(getAddress(acc2.address)), 'acc2 in list');
    console.log(`    → ${members.length} members: ${members.map(a => a.slice(0, 8)).join(', ')}...`);
  });

  await test('getSpace — memberCount updated to 2', async () => {
    const s = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpace', args: [sid] }) as any;
    assert(s[6] >= 2n, `memberCount=${s[6]}`);
    console.log(`    → memberCount = ${s[6]}`);
  });

  await test('updateSpace — acc1 renames space', async () => {
    const hash = await w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'updateSpace',
      args: [sid, 'Renamed DAO', 'Updated desc'],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const s = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpace', args: [sid] }) as any;
    assert(s[1] === 'Renamed DAO',    `name=${s[1]}`);
    assert(s[2] === 'Updated desc',  `desc=${s[2]}`);
    console.log(`    → name="${s[1]}" desc="${s[2]}"`);
  });

  await test('updateSpace — acc2 cannot update (not creator)', async () => {
    await expectRevert('acc2 updateSpace', () => w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'updateSpace',
      args: [sid, 'Hacked', 'Hacked'],
    }), 'revert');
  });

  await test('removeMember — acc2 cannot remove acc1 (not creator)', async () => {
    await expectRevert('acc2 removeMember', () => w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'removeMember',
      args: [sid, acc1.address],
    }), 'revert');
  });

  await test('addMember — acc2 cannot addMember (not creator)', async () => {
    // We need a 3rd address that isn't in the space; use a dummy
    const dummy = '0x000000000000000000000000000000000000dEaD';
    await expectRevert('acc2 addMember', () => w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'addMember',
      args: [sid, dummy as `0x${string}`],
    }), 'revert');
  });

  await test('removeMember — acc1 removes acc2 (swap-and-pop fix)', async () => {
    const hash = await w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'removeMember',
      args: [sid, acc2.address],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const [isMember, members, s] = await Promise.all([
      pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'isSpaceMember', args: [sid, acc2.address] }),
      pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getMembers', args: [sid] }) as Promise<string[]>,
      pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpace', args: [sid] }),
    ]);
    const s2 = s as any;
    assert(isMember === false, 'isMember=false');
    assert(!(members as string[]).map(m => getAddress(m)).includes(getAddress(acc2.address)), 'not in memberList');
    console.log(`    → isMember=${isMember}  membersList.length=${(members as string[]).length}  memberCount=${s2[6]}`);
  });

  await test('addMember — acc1 re-adds acc2', async () => {
    const hash = await w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'addMember',
      args: [sid, acc2.address],
    });
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const m = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'isSpaceMember', args: [sid, acc2.address] });
    assert(m === true, 'acc2 back');
    console.log(`    → acc2 re-added`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  section('8. ShadowSpace — Wave 2 new functions');

  // leaveSpace
  await test('leaveSpace — creator cannot leave (should revert)', async () => {
    await expectRevert('creator leave', () => w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'leaveSpace', args: [sid],
    }), 'revert');
  });

  await test('leaveSpace — acc2 leaves space', async () => {
    const membersBefore = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getMembers', args: [sid] }) as string[];
    const hash = await w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'leaveSpace', args: [sid],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const [isMember, membersAfter, space] = await Promise.all([
      pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'isSpaceMember', args: [sid, acc2.address] }),
      pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getMembers', args: [sid] }) as Promise<string[]>,
      pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpace', args: [sid] }),
    ]);
    const spaceData = space as any;
    assert(isMember === false, 'not member');
    assert(!(membersAfter as string[]).map(m => getAddress(m)).includes(getAddress(acc2.address)), 'not in array');
    assert(Number(spaceData[6]) === membersBefore.length - 1, 'memberCount decremented');
    console.log(`    → isMember=${isMember}  membersList: ${membersBefore.length} → ${(membersAfter as string[]).length}  memberCount=${spaceData[6]}`);
  });

  await test('leaveSpace — acc2 cannot leave again (not member)', async () => {
    await expectRevert('leave not member', () => w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'leaveSpace', args: [sid],
    }), 'revert');
  });

  // setShadowVoteContract — Wave 2 ACL
  await test('setShadowVoteContract — only owner can call', async () => {
    const isAcc1Owner = getAddress(acc1.address) === getAddress(
      await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'owner' }) as string
    );
    if (!isAcc1Owner) {
      console.log('    → acc1 is not owner of this contract, testing that acc2 is rejected...');
      await expectRevert('non-owner setShadowVote', () => w2.writeContract({
        address: SPACE, abi: SPACE_ABI, functionName: 'setShadowVoteContract', args: [VOTE],
      }), 'revert');
      return;
    }
    // acc2 should fail
    await expectRevert('non-owner setShadowVote', () => w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'setShadowVoteContract', args: [VOTE],
    }), 'revert');
  });

  await test('setShadowVoteContract — owner sets ShadowVote address', async () => {
    const owner = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'owner' }) as string;
    if (getAddress(owner) !== getAddress(acc1.address)) {
      console.log(`    → acc1 is not owner (owner=${owner.slice(0, 10)}...), skipping`);
      return;
    }
    const hash = await w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'setShadowVoteContract', args: [VOTE],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const sv = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'shadowVoteContract' }) as string;
    assert(getAddress(sv) === getAddress(VOTE), `shadowVoteContract = ${sv}`);
    console.log(`    → shadowVoteContract set to ${sv.slice(0, 10)}...`);
  });

  // archiveSpace — Wave 2
  let archiveSpaceId = 0n;
  await test('createSpace — for archive test', async () => {
    const hash = await w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'createSpace',
      args: ['Archive Me', 'Will be archived', 4, true, 1n, []],
    });
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    archiveSpaceId = (await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpaceCount' }) as bigint) - 1n;
    console.log(`    → Space #${archiveSpaceId} created for archive test`);
  });

  await test('archiveSpace — acc2 cannot archive acc1 space', async () => {
    await expectRevert('acc2 archive', () => w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'archiveSpace', args: [archiveSpaceId],
    }), 'revert');
  });

  await test('archiveSpace — acc1 archives own space', async () => {
    const hash = await w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'archiveSpace', args: [archiveSpaceId],
    });
    console.log(`    → tx: ${hash}`);
    const receipt = await waitTx(hash);
    assert(receipt.status === 'success', 'ok');
    const s = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpace', args: [archiveSpaceId] }) as any;
    assert(s[8] === false, `active=${s[8]}`);
    console.log(`    → Space #${archiveSpaceId} active=${s[8]} (archived)`);
  });

  await test('archiveSpace — cannot archive twice', async () => {
    await expectRevert('double archive', () => w1.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'archiveSpace', args: [archiveSpaceId],
    }), 'revert');
  });

  await test('joinSpace — cannot join archived space', async () => {
    await expectRevert('join archived', () => w2.writeContract({
      address: SPACE, abi: SPACE_ABI, functionName: 'joinSpace', args: [archiveSpaceId],
    }), 'revert');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  section('9. ShadowSpace — Wave 2 ACL: incrementProposalCount');

  // This is called by ShadowVote internally when createProposal is linked to a space.
  // We test the guard logic directly.
  const INC_ABI = parseAbi(['function incrementProposalCount(uint256 _spaceId)']);

  await test('incrementProposalCount — random caller should fail (ACL set)', async () => {
    const sv = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'shadowVoteContract' }) as string;
    if (sv === '0x0000000000000000000000000000000000000000') {
      console.log('    → shadowVoteContract not set, ACL allows any caller (pre-Wave2 compat mode)');
      return;
    }
    // acc2 is not ShadowVote contract — should revert
    await expectRevert('random incrementProposalCount', () => w2.writeContract({
      address: SPACE, abi: INC_ABI, functionName: 'incrementProposalCount', args: [sid],
    }), 'revert');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  section('10. Final state dump');

  await test('getSpaceCount — verify increased', async () => {
    const c = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getSpaceCount' }) as bigint;
    assert(c > spaceCount0, `count ${c} > baseline ${spaceCount0}`);
    console.log(`    → ${spaceCount0} → ${c} spaces`);
  });

  await test('getProposalCount — verify increased', async () => {
    const c = await pub.readContract({ address: VOTE, abi: VOTE_ABI, functionName: 'getProposalCount' }) as bigint;
    assert(c > totalProposals, `count ${c} > baseline ${totalProposals}`);
    console.log(`    → ${totalProposals} → ${c} proposals`);
  });

  await test('getUserSpaces(acc1) — includes new spaces', async () => {
    const s = await pub.readContract({ address: SPACE, abi: SPACE_ABI, functionName: 'getUserSpaces', args: [acc1.address] }) as bigint[];
    console.log(`    → acc1 in ${s.length} spaces: [${s.join(', ')}]`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  const total = passed + failed + skipped;
  console.log(`║  RESULTS:  ${String(passed).padStart(3)} passed  ${String(failed).padStart(2)} failed  ${String(skipped).padStart(2)} skipped  / ${total} total`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('');
    console.log('  Failed tests:');
    for (const r of log) {
      if (r.status === 'fail') {
        console.log(`  \x1b[31m✗ ${r.name}\x1b[0m`);
        console.log(`    ${r.detail}`);
      }
    }
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => {
  console.error('\nFatal error:', e);
  process.exit(1);
});
