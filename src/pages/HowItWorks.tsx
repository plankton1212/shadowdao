import React, { useState, useEffect } from 'react';
import { Shield, Lock, Database, ArrowRight, CheckCircle2, Eye, EyeOff, Clock, Cpu, Zap, Globe } from 'lucide-react';
import { Card, Badge, PageWrapper, Navbar, Button } from '../components/UI';
import { cn } from '../utils';

// ─── FHE Operation Visualizer ─────────────────────────────────────────────────

const FHE_STEPS = [
  {
    id: 'browser',
    label: '1. Browser',
    sublabel: 'Encryptable.uint32(choice)',
    desc: 'User selects option. CoFHE SDK encrypts locally via TFHE WASM.',
    color: '#5B6DEC',
    bg: '#EDEFFD',
    icon: Globe,
    ops: ['Encryptable.uint32(choice)', 'encryptInputs().execute()', 'ZK proof generated'],
  },
  {
    id: 'asuint',
    label: '2. asEuint32',
    sublabel: 'FHE.asEuint32(input)',
    desc: 'Contract converts InEuint32 calldata into an on-chain euint32 ciphertext.',
    color: '#1A8C52',
    bg: '#E8F5E0',
    icon: Lock,
    ops: ['FHE.asEuint32(encryptedOption)', 'ciphertext stored on CoFHE coprocessor'],
  },
  {
    id: 'eq',
    label: '3. FHE.eq',
    sublabel: 'for each option i',
    desc: 'For every option, compute encrypted comparison: does vote === i?',
    color: '#E8A408',
    bg: '#FEF3CD',
    icon: Cpu,
    ops: ['ebool match = FHE.eq(option, FHE.asEuint32(i))', 'encrypted boolean — nobody sees result'],
  },
  {
    id: 'select',
    label: '4. FHE.select',
    sublabel: 'Encrypted if/else',
    desc: 'Encrypted conditional: if match → 1 else → 0. No branch is revealed.',
    color: '#5B6DEC',
    bg: '#EDEFFD',
    icon: Shield,
    ops: ['euint32 inc = FHE.select(match, 1, 0)', 'weight applied: FHE.mul(inc, power) if weighted'],
  },
  {
    id: 'add',
    label: '5. FHE.add',
    sublabel: 'Homomorphic tallying',
    desc: 'Encrypted increment added to running tally. Tally grows without decryption.',
    color: '#1A8C52',
    bg: '#E8F5E0',
    icon: Database,
    ops: ['tally[i] = FHE.add(tally[i], inc)', 'FHE.allowThis(tally[i]) — contract retains access'],
  },
  {
    id: 'allowsender',
    label: '6. FHE.allowSender',
    sublabel: 'Permit-gated self-verify',
    desc: 'Voter\'s ballot stored; only they can decrypt via EIP-712 permit.',
    color: '#E8A408',
    bg: '#FEF3CD',
    icon: Eye,
    ops: ['userVotes[id][voter] = option', 'FHE.allowSender(vote) — only voter can decrypt'],
  },
  {
    id: 'allowpublic',
    label: '7. FHE.allowPublic',
    sublabel: 'After deadline → Reveal',
    desc: 'Once deadline passes + quorum met, aggregate tallies unlocked for anyone to read.',
    color: '#1A8C52',
    bg: '#E8F5E0',
    icon: CheckCircle2,
    ops: ['FHE.allowPublic(tally[i])', 'decryptForView(tally) → plaintext result', 'Individual votes stay encrypted forever'],
  },
];

function FheVisualizer() {
  const [activeStep, setActiveStep] = useState(-1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (activeStep >= FHE_STEPS.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setActiveStep(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [playing, activeStep]);

  const handlePlay = () => {
    setActiveStep(-1);
    setPlaying(false);
    setTimeout(() => {
      setActiveStep(0);
      setPlaying(true);
    }, 50);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">FHE Operation Visualizer</h3>
          <p className="text-sm text-text-secondary">7 operations that make private voting possible</p>
        </div>
        <Button size="sm" variant="accent" onClick={handlePlay}>
          <Zap className="w-4 h-4 mr-2" />
          {playing ? 'Running...' : 'Run Animation'}
        </Button>
      </div>

      {/* Pipeline diagram */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-[700px]">
          {FHE_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setActiveStep(i)}
                  className={cn(
                    'flex-1 rounded-xl p-3 text-left transition-all duration-300 border-2',
                    isActive ? 'border-current scale-105 shadow-elevated' : 'border-transparent',
                    isDone ? 'opacity-80' : !isActive && activeStep >= 0 ? 'opacity-40' : ''
                  )}
                  style={{ backgroundColor: isActive || isDone ? step.bg : '#F4FAF5' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: isDone || isActive ? step.color : '#E8F5E0' }}>
                      {isDone
                        ? <CheckCircle2 className="w-3 h-3 text-white" />
                        : <Icon className="w-3 h-3" style={{ color: isActive ? 'white' : '#9CA89E' }} />
                      }
                    </div>
                    <span className="text-[10px] font-bold truncate" style={{ color: isActive || isDone ? step.color : '#9CA89E' }}>
                      {step.label}
                    </span>
                  </div>
                  <code className="text-[9px] font-mono block text-text-muted leading-tight">{step.sublabel}</code>
                </button>
                {i < FHE_STEPS.length - 1 && (
                  <div className={cn('flex items-center self-center transition-colors duration-300', isDone ? 'text-primary-accent' : 'text-text-muted')}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step detail */}
      {activeStep >= 0 && activeStep < FHE_STEPS.length && (
        <div className="p-5 rounded-xl border-2 transition-all duration-300"
          style={{ backgroundColor: FHE_STEPS[activeStep].bg, borderColor: FHE_STEPS[activeStep].color + '40' }}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-bold" style={{ color: FHE_STEPS[activeStep].color }}>
                {FHE_STEPS[activeStep].label}
              </h4>
              {playing && <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: FHE_STEPS[activeStep].color }} />}
            </div>
            <p className="text-sm text-text-secondary">{FHE_STEPS[activeStep].desc}</p>
            <div className="space-y-1.5">
              {FHE_STEPS[activeStep].ops.map(op => (
                <div key={op} className="flex items-start gap-2">
                  <span className="text-primary-accent text-xs mt-0.5">›</span>
                  <code className="text-xs font-mono text-text-secondary">{op}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeStep === FHE_STEPS.length - 1 && !playing && (
        <div className="p-4 bg-surface-highlight rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary-accent" />
          <div className="text-sm font-bold text-primary-accent">
            Vote complete. Aggregate visible. Individual choice: encrypted forever.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Full FHE Operations Table ─────────────────────────────────────────────────

const FHE_OPS_TABLE = [
  { op: 'FHE.asEuint32()', wave: 1, where: 'vote(), createProposal()', purpose: 'Convert browser-encrypted input to on-chain FHE type' },
  { op: 'FHE.eq()', wave: 1, where: 'vote()', purpose: 'Encrypted comparison: does ballot match this option?' },
  { op: 'FHE.select()', wave: 1, where: 'vote(), ShadowDelegate', purpose: 'Encrypted if/else: increment 1 or 0; zero-out delegation' },
  { op: 'FHE.add()', wave: 1, where: 'vote(), checkQuorum, Treasury', purpose: 'Homomorphic addition: tally grows without decryption' },
  { op: 'FHE.allowThis()', wave: 1, where: 'everywhere', purpose: 'Contract retains access to ciphertext across transactions' },
  { op: 'FHE.allowSender()', wave: 1, where: 'vote(), getTreasuryBalance', purpose: 'Permit-gated: only msg.sender can decrypt this handle' },
  { op: 'FHE.allowPublic()', wave: 1, where: 'revealResults()', purpose: 'Unlock aggregate tallies for public decryption after deadline' },
  { op: 'FHE.gte()', wave: 2, where: 'checkQuorumEncrypted, withdraw', purpose: 'Encrypted ≥ comparison: quorum check + solvency gate' },
  { op: 'FHE.max()', wave: 2, where: 'getEncryptedMaxTally()', purpose: 'Find leading option without revealing any tally value' },
  { op: 'FHE.sub()', wave: 2, where: 'getEncryptedDifferential, withdraw', purpose: 'Encrypted subtraction: margin of victory, balance decrease' },
  { op: 'FHE.mul()', wave: 3, where: 'vote() weighted', purpose: 'Weighted voting: multiply ballot by encrypted voting power' },
  { op: 'FHE.add (euint32)', wave: 3, where: 'ShadowTreasury', purpose: 'Treasury deposit: balance grows on ciphertext' },
  { op: 'FHE.gte (solvency)', wave: 3, where: 'ShadowTreasury.withdraw', purpose: 'Encrypted solvency check before withdrawal' },
  { op: 'FHE.sub (balance)', wave: 3, where: 'ShadowTreasury', purpose: 'Reduce encrypted balance on withdrawal/allocation' },
  { op: 'FHE.add (aggregate)', wave: 4, where: 'ShadowDelegate.delegate', purpose: 'Accumulate delegated power into delegate pool' },
  { op: 'FHE.select (undelegate)', wave: 4, where: 'ShadowDelegate.undelegate', purpose: 'Safe zero-out of delegator contribution on undelegate' },
];

// ─── Main page ─────────────────────────────────────────────────────────────────

export const HowItWorks = () => {
  return (
    <PageWrapper>
      <Navbar />
      <div className="pt-32 pb-20 px-6 max-w-5xl mx-auto space-y-24">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-secondary-accent">How ShadowDAO Works</h1>
          <p className="text-text-secondary text-lg">The science of private, verifiable on-chain governance</p>
        </div>

        {/* Section 1: FHE Explainer */}
        <section className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">1. What is FHE?</h2>
            <p className="text-text-secondary leading-relaxed">
              Fully Homomorphic Encryption (FHE) allows computation directly on encrypted data.
              In ShadowDAO, this means vote tallies are computed <strong>without ever decrypting individual votes</strong>.
              The Fhenix CoFHE coprocessor runs alongside standard EVM — same address, same ABI, real FHE.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {[
              { icon: VoteIcon, label: 'Your Vote', color: 'text-tertiary-accent' },
              null,
              { icon: Lock, label: 'FHE Encryption', color: 'text-primary-accent', highlight: true },
              null,
              { icon: Database, label: 'On-Chain Tally', color: 'text-tertiary-accent' },
            ].map((item, i) =>
              item === null ? (
                <div key={i} className="hidden md:flex justify-center">
                  <ArrowRight className="text-primary-accent" />
                </div>
              ) : (
                <Card key={i} hover={false} className={cn('text-center p-4', item.highlight && 'bg-surface-highlight border-primary-accent/20')}>
                  <item.icon className={cn('w-8 h-8 mx-auto mb-2', item.color)} />
                  <div className="text-xs font-bold">{item.label}</div>
                </Card>
              )
            )}
          </div>
        </section>

        {/* Section 2: FHE Operation Visualizer */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold">2. FHE Operation Visualizer</h2>
          <Card hover={false} className="p-6">
            <FheVisualizer />
          </Card>
        </section>

        {/* Section 3: Privacy vs Transparency */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold">3. Privacy vs. Transparency</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card hover={false} className="bg-surface-tinted space-y-4">
              <div className="flex items-center gap-2 text-primary-accent font-bold">
                <Lock className="w-5 h-5" /> Private (Encrypted Forever)
              </div>
              <ul className="space-y-2 text-sm text-text-secondary">
                {['Individual vote choice', 'Voter selection', 'Ballot content', 'Vote-to-voter mapping', 'Treasury balance (euint32)', 'Voting power per address', 'Delegated power amounts'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
            <Card hover={false} className="space-y-4">
              <div className="flex items-center gap-2 text-tertiary-accent font-bold">
                <Shield className="w-5 h-5" /> Public (Verifiable On-Chain)
              </div>
              <ul className="space-y-2 text-sm text-text-secondary">
                {['Proposal title & options', 'Voter addresses (participation only)', 'Deadline & Quorum threshold', 'Final aggregate result (after reveal)', 'Who delegated to whom', 'Delegate count (not power)', 'Allocation execution events'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        {/* Section 4: Voting Lifecycle */}
        <section className="space-y-12">
          <h2 className="text-2xl font-bold">4. The Voting Lifecycle</h2>
          <div className="space-y-8">
            {[
              { title: 'Create', desc: 'DAO members draft a proposal with title, options, deadline, quorum. Optionally add an IPFS description hash and enable weighted voting.', badge: 'On-chain' },
              { title: 'Encrypt', desc: 'Each voter selects an option. The CoFHE SDK encrypts the choice locally via TFHE WASM and generates a ZK proof — all before the transaction is sent.', badge: 'Browser → WASM' },
              { title: 'Submit', desc: 'The encrypted ballot (InEuint32: ctHash + signature) is sent on-chain. The contract calls FHE.asEuint32 → eq → select → add — all on ciphertext.', badge: 'Fhenix CoFHE' },
              { title: 'Verify', desc: 'Any time during voting, a voter can request FHE.allowSender on their own ballot. With an EIP-712 permit, they decrypt their own choice — nobody else can.', badge: 'Self-only' },
              { title: 'Reveal', desc: 'After deadline + quorum: FHE.allowPublic unlocks aggregate tallies. Anyone calls revealResults. Individual votes remain encrypted forever.', badge: 'Public' },
            ].map((step, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary-accent text-white flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </div>
                  {i < 4 && <div className="w-0.5 flex-1 bg-primary-accent/20 my-2" />}
                </div>
                <div className="pb-8 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{step.title}</h3>
                    <Badge variant="default" className="text-xs">{step.badge}</Badge>
                  </div>
                  <p className="text-text-secondary">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: All FHE Operations */}
        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">5. All 16 FHE Operations</h2>
            <p className="text-text-secondary">One of the deepest Fhenix CoFHE integrations across all waves.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-default text-left">
                  <th className="pb-3 font-bold text-text-muted text-xs uppercase tracking-wide">Operation</th>
                  <th className="pb-3 font-bold text-text-muted text-xs uppercase tracking-wide">Wave</th>
                  <th className="pb-3 font-bold text-text-muted text-xs uppercase tracking-wide">Contract Function</th>
                  <th className="pb-3 font-bold text-text-muted text-xs uppercase tracking-wide">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {FHE_OPS_TABLE.map((row, i) => (
                  <tr key={i} className="border-b border-default hover:bg-surface-tinted transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-tertiary-accent font-bold whitespace-nowrap">{row.op}</td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        'px-2 py-0.5 rounded-badge text-xs font-bold',
                        row.wave === 1 ? 'bg-surface-highlight text-primary-accent' :
                        row.wave === 2 ? 'bg-[#EDEFFD] text-tertiary-accent' :
                        row.wave === 3 ? 'bg-warning/10 text-warning' : 'bg-danger/5 text-danger'
                      )}>
                        W{row.wave}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-text-muted font-mono">{row.where}</td>
                    <td className="py-3 text-xs text-text-secondary">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 6: Verify */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold">6. How to Verify FHE is Real</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { n: '1', title: 'Read the contract source', desc: 'Etherscan → imports @fhenixprotocol/cofhe-contracts/FHE.sol. Not a simulation.' },
              { n: '2', title: 'Inspect a vote transaction', desc: 'Input data shows ctHash — a ciphertext handle, not a plaintext number.' },
              { n: '3', title: 'Read the tally handle', desc: 'getEncryptedTally() returns a uint256 handle, not a vote count. Decrypt requires FHE permit.' },
              { n: '4', title: 'Run the test suite', desc: 'npm run test:full → 60+ tests on Sepolia. Covers FHE.gte, FHE.max, FHE.mul, weighted voting.' },
            ].map(({ n, title, desc }) => (
              <Card key={n} hover={false} className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-primary-accent text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                    {n}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{title}</h4>
                    <p className="text-xs text-text-secondary mt-0.5">{desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <div className="text-center pt-12">
          <Button size="lg" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to Top</Button>
        </div>
      </div>
    </PageWrapper>
  );
};

const VoteIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
