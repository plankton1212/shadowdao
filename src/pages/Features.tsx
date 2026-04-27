import React from 'react';
import {
  Shield, Lock, Database, Clock, Zap, Users, CheckCircle2,
  Coins, UserCheck, BarChart3, MessageSquare, Package, Wifi,
  Scale, Globe, Eye,
} from 'lucide-react';
import { Card, Badge, PageWrapper, Navbar } from '../components/UI';
import { cn } from '../utils';

const features = [
  // Wave 1-2
  {
    title: 'Encrypted Ballots',
    desc: 'Every vote is FHE-encrypted in the browser via CoFHE SDK before submission. Not even validators or contract owners can see individual choices.',
    icon: Lock,
    color: 'text-primary-accent',
    bg: 'bg-surface-highlight',
    wave: 1,
    ops: ['FHE.asEuint32', 'FHE.eq', 'FHE.select'],
  },
  {
    title: 'Homomorphic Tallying',
    desc: 'The smart contract adds encrypted votes to encrypted counters. Final tally is computed entirely on ciphertext — no intermediate decryption ever happens.',
    icon: Database,
    color: 'text-tertiary-accent',
    bg: 'bg-[#EDEFFD]',
    wave: 1,
    ops: ['FHE.add', 'FHE.allowThis'],
  },
  {
    title: 'Time-Locked Reveals',
    desc: 'Results are decryptable only after the voting deadline passes and quorum is met. FHE.allowPublic transitions tallies from private to public at exactly the right moment.',
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-[#FEF3CD]',
    wave: 1,
    ops: ['FHE.allowPublic', 'FHE.gte'],
  },
  {
    title: 'Self-Verify Your Vote',
    desc: 'Any voter can decrypt their own ballot using an EIP-712 permit. Nobody else can — not even the contract owner. The choice stays private, the proof is personal.',
    icon: Eye,
    color: 'text-primary-accent',
    bg: 'bg-surface-highlight',
    wave: 1,
    ops: ['FHE.allowSender', 'decryptForView', 'EIP-712 permit'],
  },
  {
    title: 'Space-Gated Voting',
    desc: 'Proposals can be restricted to DAO Space members. Cross-contract ACL enforced on-chain: non-members revert at the contract level, not the UI.',
    icon: Users,
    color: 'text-tertiary-accent',
    bg: 'bg-[#EDEFFD]',
    wave: 2,
    ops: ['IShadowSpace.isSpaceMember', 'cross-contract ACL'],
  },
  {
    title: 'Encrypted Analytics',
    desc: 'Quorum checks, winner detection, and vote margin computed directly on encrypted tallies. Three advanced FHE ops that reveal nothing about individual votes.',
    icon: BarChart3,
    color: 'text-primary-accent',
    bg: 'bg-surface-highlight',
    wave: 2,
    ops: ['FHE.gte', 'FHE.max', 'FHE.sub'],
  },
  // Wave 3
  {
    title: 'Encrypted Treasury',
    desc: 'DAO balance stored as euint32 on-chain — invisible on Etherscan. Encrypted solvency check on every withdrawal. Budget allocations linked to governance proposals.',
    icon: Coins,
    color: 'text-warning',
    bg: 'bg-[#FEF3CD]',
    wave: 3,
    ops: ['FHE.add (balance)', 'FHE.gte (solvency)', 'FHE.sub (withdrawal)', 'FHE.select'],
  },
  {
    title: 'Weighted Voting',
    desc: 'Admin assigns encrypted voting power per address. The contract multiplies each ballot by encrypted weight — heavier votes, zero information leaked about distribution.',
    icon: Scale,
    color: 'text-primary-accent',
    bg: 'bg-surface-highlight',
    wave: 3,
    ops: ['FHE.mul(vote, power)', 'FHE.allowSender(power)'],
  },
  {
    title: 'IPFS Proposals',
    desc: 'Long-form proposal descriptions pinned to IPFS, hash stored on-chain as bytes32. On-chain storage cost is fixed regardless of description length.',
    icon: Globe,
    color: 'text-tertiary-accent',
    bg: 'bg-[#EDEFFD]',
    wave: 3,
    ops: ['bytes32 descriptionHash', 'postComment(proposalId, bytes32)'],
  },
  // Wave 4
  {
    title: 'Vote Delegation',
    desc: 'Delegate your voting rights to a trusted address. Delegation is public (transparent), but the aggregated power pool stays encrypted in the FHE coprocessor.',
    icon: UserCheck,
    color: 'text-primary-accent',
    bg: 'bg-surface-highlight',
    wave: 4,
    ops: ['FHE.add (pool)', 'FHE.select (zero-out)', 'FHE.allowSender (power view)'],
  },
  {
    title: 'On-Chain Discussion',
    desc: 'Each proposal has a comment thread where IPFS hashes are posted on-chain. Authorship and timestamps are blockchain-verified. No centralized backend required.',
    icon: MessageSquare,
    color: 'text-warning',
    bg: 'bg-[#FEF3CD]',
    wave: 4,
    ops: ['postComment(proposalId, bytes32)', 'CommentPosted event'],
  },
  {
    title: 'Governance Analytics',
    desc: 'Participation rate, quorum achievement, voter activity heatmap, and delegate leaderboard — all computed from on-chain getLogs. No indexer or subgraph needed.',
    icon: BarChart3,
    color: 'text-tertiary-accent',
    bg: 'bg-[#EDEFFD]',
    wave: 4,
    ops: ['getLogs: VoteCast, ProposalCreated, ResultsRevealed'],
  },
  // Wave 5
  {
    title: 'Gasless Voting',
    desc: 'Voters sign an EIP-712 message off-chain. A relayer submits the transaction and pays the gas. Full FHE encryption still happens in the browser — gas cost = zero.',
    icon: Zap,
    color: 'text-primary-accent',
    bg: 'bg-surface-highlight',
    wave: 5,
    ops: ['voteWithSignature()', 'EIP-712 domain separator', 'nonces replay protection'],
  },
  {
    title: 'shadowdao-sdk',
    desc: 'TypeScript npm package: ShadowVoteClient, ShadowSpaceClient, and useShadowVote hook. Swap any contract address and ABI to get a full-featured DAO frontend in minutes.',
    icon: Package,
    color: 'text-tertiary-accent',
    bg: 'bg-[#EDEFFD]',
    wave: 5,
    ops: ['ShadowVoteClient', 'ShadowSpaceClient', 'useShadowVote(address, abi)'],
  },
  {
    title: 'PWA + Offline',
    desc: 'Installable as a native app on any device. Service worker caches static assets for offline access. IPFS content loads from cache when network is unavailable.',
    icon: Wifi,
    color: 'text-primary-accent',
    bg: 'bg-surface-highlight',
    wave: 5,
    ops: ['manifest.json', 'service worker', 'offline fallback page'],
  },
  {
    title: 'Instant Verification',
    desc: 'The entire protocol is open-source and verifiable on Etherscan. FHE operations are real — check any vote transaction to see the encrypted ctHash, not a number.',
    icon: CheckCircle2,
    color: 'text-primary-accent',
    bg: 'bg-surface-highlight',
    wave: 1,
    ops: ['Etherscan verified', 'CoFHE coprocessor', 'ZK proof per vote'],
  },
];

const WAVE_COLORS: Record<number, string> = {
  1: 'bg-surface-highlight text-primary-accent',
  2: 'bg-[#EDEFFD] text-tertiary-accent',
  3: 'bg-[#FEF3CD] text-warning',
  4: 'bg-danger/10 text-danger',
  5: 'bg-secondary-accent/10 text-secondary-accent',
};

export const Features = () => {
  return (
    <PageWrapper>
      <Navbar />
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-24">

        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-secondary-accent">Protocol Features</h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            16 FHE operations across 4 contracts — the deepest Fhenix CoFHE integration in any DAO platform
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {[
              { label: '16 FHE ops', color: 'bg-surface-highlight text-primary-accent' },
              { label: '4 contracts', color: 'bg-[#EDEFFD] text-tertiary-accent' },
              { label: '14 pages', color: 'bg-[#FEF3CD] text-warning' },
              { label: 'No backend', color: 'bg-secondary-accent/10 text-secondary-accent' },
            ].map(b => (
              <span key={b.label} className={cn('px-4 py-1.5 rounded-pill text-sm font-bold', b.color)}>{b.label}</span>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card key={i} className="space-y-5 group">
              <div className="flex items-start justify-between">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', f.bg)}>
                  <f.icon className={cn('w-6 h-6', f.color)} />
                </div>
                <span className={cn('px-2.5 py-1 rounded-badge text-[10px] font-bold uppercase tracking-wide', WAVE_COLORS[f.wave])}>
                  W{f.wave}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.desc}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {f.ops.map(op => (
                  <code key={op} className="text-[10px] font-mono bg-bg-base text-text-muted px-2 py-0.5 rounded-badge">
                    {op}
                  </code>
                ))}
              </div>
            </Card>
          ))}
        </div>

        {/* FHE Operations count bar */}
        <div className="grid grid-cols-5 gap-4 text-center">
          {[
            { wave: 1, ops: 7, color: 'bg-primary-accent' },
            { wave: 2, ops: 3, color: 'bg-tertiary-accent' },
            { wave: 3, ops: 4, color: 'bg-warning' },
            { wave: 4, ops: 2, color: 'bg-danger' },
            { wave: 5, ops: 0, color: 'bg-secondary-accent' },
          ].map(w => (
            <div key={w.wave} className="space-y-2">
              <div className="text-2xl font-extrabold">{w.ops > 0 ? `+${w.ops}` : 'SDK'}</div>
              <div className={cn('h-2 rounded-full', w.color)} style={{ opacity: 0.7 + w.ops * 0.05 }} />
              <div className="text-xs text-text-muted font-bold">Wave {w.wave}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Card hover={false} className="bg-secondary-accent text-white p-12 text-center space-y-8">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-bold">Audit-Ready &amp; Open Source</h2>
            <p className="text-white/70">
              All contract logic is verifiable on Etherscan. FHE operations are real — any vote transaction shows
              an encrypted ctHash, not a plaintext number. Individual votes remain encrypted forever.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 opacity-70">
            <div className="flex items-center gap-2 font-bold"><Shield className="w-5 h-5" /> Open Source</div>
            <div className="flex items-center gap-2 font-bold"><Lock className="w-5 h-5" /> FHE Verified</div>
            <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="w-5 h-5" /> EVM Compatible</div>
            <div className="flex items-center gap-2 font-bold"><Zap className="w-5 h-5" /> Gasless Option</div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
};
