import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useTransform, animate } from 'motion/react';
import {
  ArrowRight, Shield, Lock, Clock, CheckCircle2, TrendingUp,
  Users, Vote as VoteIcon, Database, Zap, Globe, Github,
  ExternalLink, Eye, EyeOff, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, PageWrapper, Navbar, Accordion, Logo } from '../components/UI';
import { SHADOWVOTE_ADDRESS, etherscanAddress } from '../config/contract';
import { useAccount, useConnect } from 'wagmi';
import { cn } from '../utils';

/* ────────────────────── helpers ────────────────────── */

const Section = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.section
    initial={{ opacity: 0, y: 60 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.section>
);

const StaggerContainer = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: '-60px' }}
    variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
    className={className}
  >
    {children}
  </motion.div>
);

const StaggerItem = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

const Counter = ({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const val = useMotionValue(0);
  const display = useTransform(val, (v) => `${prefix}${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (inView) animate(val, to, { duration: 1.8, ease: [0.22, 1, 0.36, 1] });
  }, [inView, to, val]);

  return <motion.span ref={ref}>{display}</motion.span>;
};

const TypeWriter = ({ text, className }: { text: string; className?: string }) => {
  const [displayed, setDisplayed] = useState('');
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) clearInterval(timer);
    }, 45);
    return () => clearInterval(timer);
  }, [inView, text]);

  return (
    <span ref={ref} className={className}>
      {displayed}
      <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.6, repeat: Infinity }} className="text-primary-accent">|</motion.span>
    </span>
  );
};

const FloatingCard = ({ delay = 0, className, children }: { delay?: number; className?: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 40, scale: 0.95 }}
    animate={{ opacity: 1, y: [-8, 0, -8], scale: 1 }}
    transition={{
      opacity: { duration: 0.8, delay: delay + 0.3 },
      scale: { duration: 0.8, delay: delay + 0.3 },
      y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: delay + 1.1 },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

const CodeLine = ({ children, delay }: { children: React.ReactNode; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, delay }}
    className="font-mono text-[13px] leading-6"
  >
    {children}
  </motion.div>
);

/* ────────────────────── page ────────────────────── */

export const Home = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const handleLaunch = () => {
    if (isConnected) {
      navigate('/app/dashboard');
    } else {
      const connector = connectors[0];
      if (connector) connect({ connector }, { onSuccess: () => navigate('/app/dashboard') });
    }
  };

  return (
    <PageWrapper>
      <Navbar />

      {/* Mesh Gradient Background */}
      <div className="mesh-gradient">
        <div className="mesh-ball w-[600px] h-[600px] bg-[#D4F542] top-[-10%] left-[-10%]" />
        <div className="mesh-ball w-[500px] h-[500px] bg-[#A8E6C3] bottom-[10%] right-[-5%]" />
        <div className="mesh-ball w-[400px] h-[400px] bg-[#FFFFF0] top-[40%] left-[30%]" />
      </div>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-pill shadow-sm border border-default"
          >
            <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 bg-primary-accent rounded-full" />
            <span className="text-sm font-medium text-text-secondary">Live on Ethereum Sepolia</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-secondary-accent leading-[1.08] tracking-tight">
            <TypeWriter text="Private Votes." />
            <br />
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="text-primary-accent">
              Public Trust.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-lg text-text-secondary max-w-lg leading-relaxed"
          >
            Encrypted on-chain governance powered by Fhenix FHE. Create proposals, cast secret ballots, and reveal fair results — without exposing any individual vote.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex flex-wrap gap-4">
            <Button onClick={handleLaunch} size="lg" className="gap-2 group">
              Launch App <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/how-it-works')} className="gap-2">
              Read Docs
            </Button>
          </motion.div>
        </div>

        <div className="relative hidden lg:block h-[500px]">
          <FloatingCard className="absolute top-10 left-0 z-20 w-80">
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1 bg-surface-highlight text-primary-accent rounded-badge text-xs font-bold">
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 bg-primary-accent rounded-full" />
                  VOTING
                </div>
                <Badge variant="warning">2d 14h</Badge>
              </div>
              <h3 className="font-bold text-lg">Increase staking rewards to 8%</h3>
              <div className="space-y-2">
                <div className="h-2 bg-bg-base rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} transition={{ duration: 1.5, delay: 1, ease: 'easeOut' }} className="h-full bg-primary-accent rounded-full" />
                </div>
                <div className="flex justify-between text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> 24 votes · Encrypted</span>
                  <span>72% Quorum</span>
                </div>
              </div>
            </Card>
          </FloatingCard>

          <FloatingCard delay={0.8} className="absolute bottom-10 right-0 z-10 w-80">
            <Card accent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="success">Winner</Badge>
                <span className="text-xs font-mono text-text-primary/60">Block 127,403</span>
              </div>
              <h3 className="font-bold text-lg text-[#1A3A20]">Fund developer grants Q2</h3>
              <div className="text-3xl font-extrabold text-[#1A3A20]">Option A — 64%</div>
              <p className="text-xs text-[#1A3A20]/70 flex items-center gap-1"><Shield className="w-3 h-3" /> Verified aggregate · FHE decrypted</p>
            </Card>
          </FloatingCard>

          {/* Decorative orbit */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-2 border-dashed border-primary-accent/10 rounded-full pointer-events-none"
          />
        </div>
      </section>

      {/* ═══════════════ POWERED BY ═══════════════ */}
      <Section className="py-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-12 md:gap-20 opacity-30">
            {['FHENIX', 'ETHEREUM', 'CoFHE', 'SEPOLIA'].map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-xl md:text-2xl font-black tracking-tighter text-secondary-accent select-none"
              >
                {name}
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════ STATS ═══════════════ */}
      <Section className="bg-white/50 border-y border-black/5 py-14">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { val: 13, suffix: '', label: 'FHE Operations', prefix: '' },
            { val: 2, suffix: '', label: 'Smart Contracts', prefix: '' },
            { val: 100, suffix: '%', label: 'Ballot Privacy', prefix: '' },
            { val: 0, suffix: '', label: 'Votes Exposed', prefix: '' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center space-y-1"
            >
              <div className="text-4xl font-extrabold text-secondary-accent">
                <Counter to={stat.val} suffix={stat.suffix} prefix={stat.prefix} />
              </div>
              <div className="text-sm text-text-muted uppercase tracking-wider font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ═══════════════ BEFORE vs AFTER ═══════════════ */}
      <Section className="py-28 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-extrabold text-secondary-accent">
            Transparent vs Private Governance
          </motion.h2>
          <p className="text-text-secondary max-w-2xl mx-auto text-lg">See why encrypted voting changes everything</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Before */}
          <StaggerItem>
            <div className="p-8 rounded-card bg-danger/[0.03] border-2 border-danger/10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-danger/10 text-danger rounded-full flex items-center justify-center">
                  <EyeOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-danger">Traditional DAO Voting</h3>
                  <p className="text-xs text-text-muted">Snapshot, Governor, Tally</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Eye, text: 'Everyone sees who voted for what' },
                  { icon: AlertTriangle, text: 'Whales coerce smaller holders' },
                  { icon: Users, text: 'Social pressure kills honest voting' },
                  { icon: Zap, text: 'MEV bots frontrun visible momentum' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3 text-sm text-text-secondary">
                    <item.icon className="w-4 h-4 text-danger shrink-0" />
                    <span>{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <div className="p-4 bg-danger/5 rounded-xl font-mono text-xs text-danger/80 space-y-1">
                <div>voter: 0x3f...a2c1</div>
                <div>choice: <span className="font-bold text-danger">Option A</span> <span className="text-text-muted">// visible to everyone</span></div>
                <div>power: <span className="font-bold text-danger">47,000 tokens</span></div>
              </div>
            </div>
          </StaggerItem>

          {/* After */}
          <StaggerItem>
            <div className="p-8 rounded-card bg-primary-accent/[0.03] border-2 border-primary-accent/10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary-accent">ShadowDAO + Fhenix FHE</h3>
                  <p className="text-xs text-text-muted">Encrypted by default</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Lock, text: 'Votes encrypted before touching the chain' },
                  { icon: Shield, text: 'Tallied on encrypted data — nobody peeks' },
                  { icon: Clock, text: 'Results sealed until deadline passes' },
                  { icon: CheckCircle2, text: 'Only aggregates revealed, never individuals' },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3 text-sm text-text-secondary">
                    <item.icon className="w-4 h-4 text-primary-accent shrink-0" />
                    <span>{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <div className="p-4 bg-surface-highlight rounded-xl font-mono text-xs text-primary-accent/80 space-y-1">
                <div>voter: 0x3f...a2c1</div>
                <div>choice: <span className="font-bold text-primary-accent">euint32(██████)</span> <span className="text-text-muted">// FHE encrypted</span></div>
                <div>proof: <span className="font-bold text-primary-accent">ZK verified</span></div>
              </div>
            </div>
          </StaggerItem>
        </div>
      </Section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <Section className="py-28 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-secondary-accent">Why DAOs Choose ShadowDAO</h2>
          <p className="text-text-secondary max-w-2xl mx-auto text-lg">Fhenix FHE encryption at every layer</p>
        </div>

        <StaggerContainer className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Encrypted Ballots',
              desc: 'Every vote is FHE-encrypted before touching the chain. Validators, frontrunners, and even the DAO itself cannot see individual choices.',
              icon: Shield,
              color: 'bg-surface-highlight text-primary-accent',
              code: 'FHE.asEuint32(vote)',
            },
            {
              title: 'On-Chain Tallying',
              desc: 'Fhenix CoFHE computes tallies directly on encrypted data. Results are mathematically correct without decrypting a single vote.',
              icon: Database,
              color: 'bg-[#EDEFFD] text-tertiary-accent',
              code: 'FHE.add(tally, encrypted)',
            },
            {
              title: 'Time-Locked Reveal',
              desc: 'Results stay sealed until the deadline. Only the aggregate is revealed — individual ballots remain private forever.',
              icon: Clock,
              color: 'bg-surface-highlight text-primary-accent',
              code: 'FHE.allowPublic(tally)',
            },
          ].map((feat, i) => (
            <StaggerItem key={i}>
              <motion.div
                whileHover={{ y: -6, boxShadow: '0 12px 48px rgba(0,0,0,0.08)' }}
                className="bg-surface-white rounded-card p-6 shadow-card border border-cards transition-all duration-300 h-full flex flex-col"
              >
                <motion.div whileHover={{ rotate: 12 }} transition={{ type: 'spring', stiffness: 300 }}
                  className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-6', feat.color)}>
                  <feat.icon className="w-6 h-6" />
                </motion.div>
                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                <p className="text-text-secondary leading-relaxed mb-4 flex-1">{feat.desc}</p>
                <div className="font-mono text-xs text-primary-accent bg-surface-highlight px-3 py-2 rounded-lg mb-4">{feat.code}</div>
                <Link to="/how-it-works" className="text-primary-accent font-semibold flex items-center gap-1 group">
                  Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Section>

      {/* ═══════════════ CODE SNIPPET ═══════════════ */}
      <Section className="py-28 px-6 bg-secondary-accent">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-4xl font-extrabold text-white leading-tight">
              FHE Operations<br /><span className="text-primary-accent">On-Chain</span>
            </motion.h2>
            <p className="text-white/60 text-lg leading-relaxed">
              13 distinct Fhenix FHE operations across 2 contracts. Every vote is processed entirely on encrypted data — the contract never sees a single plaintext value.
            </p>
            <div className="flex gap-3">
              <Badge variant="success">euint32</Badge>
              <Badge variant="info">ebool</Badge>
              <Badge variant="warning">InEuint32</Badge>
            </div>
          </div>

          <div className="bg-[#0d0d0d] rounded-card p-6 shadow-elevated overflow-hidden border border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-danger/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-primary-accent/60" />
              <span className="ml-2 text-xs text-white/30 font-mono">ShadowVote.sol</span>
            </div>
            <div className="space-y-0.5 overflow-x-auto">
              <CodeLine delay={0.1}><span className="text-[#7c7c7c]">// Initialize encrypted counters</span></CodeLine>
              <CodeLine delay={0.2}><span className="text-tertiary-accent">euint32</span> <span className="text-white">zero</span> <span className="text-white/40">=</span> <span className="text-[#D4F542]">FHE.asEuint32</span><span className="text-white/60">(</span><span className="text-warning">0</span><span className="text-white/60">);</span></CodeLine>
              <CodeLine delay={0.3}><span className="text-[#D4F542]">FHE.allowThis</span><span className="text-white/60">(</span><span className="text-white">zero</span><span className="text-white/60">);</span></CodeLine>
              <CodeLine delay={0.5}><span className="text-[#7c7c7c]">// Encrypted vote processing</span></CodeLine>
              <CodeLine delay={0.6}><span className="text-tertiary-accent">ebool</span> <span className="text-white">isMatch</span> <span className="text-white/40">=</span> <span className="text-[#D4F542]">FHE.eq</span><span className="text-white/60">(</span><span className="text-white">option, i</span><span className="text-white/60">);</span></CodeLine>
              <CodeLine delay={0.7}><span className="text-tertiary-accent">euint32</span> <span className="text-white">inc</span> <span className="text-white/40">=</span> <span className="text-[#D4F542]">FHE.select</span><span className="text-white/60">(</span><span className="text-white">isMatch, 1, 0</span><span className="text-white/60">);</span></CodeLine>
              <CodeLine delay={0.8}><span className="text-white">tallies[id][i]</span> <span className="text-white/40">=</span> <span className="text-[#D4F542]">FHE.add</span><span className="text-white/60">(</span><span className="text-white">tallies[id][i], inc</span><span className="text-white/60">);</span></CodeLine>
              <CodeLine delay={1.0}><span className="text-[#7c7c7c]">// Reveal aggregate only</span></CodeLine>
              <CodeLine delay={1.1}><span className="text-[#D4F542]">FHE.allowPublic</span><span className="text-white/60">(</span><span className="text-white">tallies[id][i]</span><span className="text-white/60">);</span></CodeLine>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════ USE CASES ═══════════════ */}
      <Section className="py-28 px-6 bg-surface-tinted">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold text-secondary-accent">Governance Use Cases</h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">Tailored for every type of decentralized organization</p>
          </div>

          <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Venture DAOs', desc: 'Vote on investment allocations without revealing strategies.', icon: TrendingUp },
              { title: 'Protocol Gov', desc: 'Prevent frontrunning on critical parameter changes.', icon: Zap },
              { title: 'Social Clubs', desc: 'Maintain member privacy in community elections.', icon: Users },
              { title: 'Grant Programs', desc: 'Evaluate applications without reviewer bias.', icon: CheckCircle2 },
            ].map((uc, i) => (
              <StaggerItem key={i}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}
                  className="bg-white rounded-card p-6 shadow-sm border border-transparent hover:border-primary-accent/10 transition-all duration-300"
                >
                  <motion.div whileHover={{ rotate: -8, scale: 1.1 }} transition={{ type: 'spring', stiffness: 300 }}
                    className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-xl flex items-center justify-center mb-4">
                    <uc.icon className="w-5 h-5" />
                  </motion.div>
                  <h3 className="font-bold text-lg mb-2">{uc.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{uc.desc}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <Section className="py-28 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-extrabold text-secondary-accent leading-tight">
              The Science of<br /><span className="text-primary-accent">Private Voting</span>
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed">
              Fhenix FHE enables computation on encrypted data. Your vote choice is never decrypted — not even during tallying.
            </p>
            <StaggerContainer className="space-y-4">
              {[
                { title: 'Client-Side Encryption', desc: 'Votes encrypted in your browser via CoFHE SDK before submission.' },
                { title: 'Homomorphic Tallying', desc: 'Smart contract adds encrypted values without knowing what they are.' },
                { title: 'Permit-Based Verification', desc: 'Verify your own vote was counted via EIP-712 FHE permit.' },
              ].map((item, i) => (
                <StaggerItem key={i}>
                  <div className="flex gap-4 group">
                    <motion.div whileHover={{ scale: 1.2 }} className="w-8 h-8 rounded-full bg-surface-highlight text-primary-accent flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </motion.div>
                    <div>
                      <h4 className="font-bold text-secondary-accent">{item.title}</h4>
                      <p className="text-sm text-text-secondary">{item.desc}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
            <Button variant="primary" onClick={() => navigate('/how-it-works')} className="gap-2 group">
              Full Technical Deep-Dive <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div className="relative">
            <div className="aspect-square bg-surface-highlight rounded-card p-12 flex items-center justify-center overflow-hidden">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-8 border-[3px] border-dashed border-primary-accent/15 rounded-full" />
              <motion.div animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-16 border-2 border-dashed border-tertiary-accent/10 rounded-full" />
              <div className="relative z-10 text-center space-y-6">
                <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 h-24 bg-white rounded-full shadow-elevated flex items-center justify-center mx-auto">
                  <Lock className="w-10 h-10 text-primary-accent" />
                </motion.div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-secondary-accent">FHE Engine</div>
                  <div className="text-sm text-text-muted font-mono">Fhenix CoFHE</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════ ROADMAP ═══════════════ */}
      <Section className="py-28 px-6 bg-secondary-accent text-white">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold">Protocol Roadmap</h2>
            <p className="text-white/50 max-w-2xl mx-auto text-lg">The future of private governance</p>
          </div>

          <StaggerContainer className="grid md:grid-cols-4 gap-8">
            {[
              { phase: 'Wave 1', title: 'FHE Voting', status: 'Live', desc: 'Encrypted proposals, FHE tallying, permit verify, admin cancel/extend. 10 FHE ops.' },
              { phase: 'Wave 2', title: 'Space-Gated', status: 'Live', desc: 'Space-gated voting, ACL wiring, encrypted quorum, differential tally. 13 FHE ops.' },
              { phase: 'Wave 3', title: 'Treasury', status: 'Next', desc: 'Encrypted DAO treasury (euint64), weighted voting (FHE.mul), solvency proofs.' },
              { phase: 'Wave 4-5', title: 'Production', status: 'Planned', desc: 'Delegation, gasless voting (ERC-2771), analytics, SDK, multi-chain.' },
            ].map((item, i) => (
              <StaggerItem key={i}>
                <div className="space-y-4 relative">
                  <div className="text-primary-accent font-bold text-sm tracking-widest uppercase">{item.phase}</div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                  <Badge variant={item.status === 'Live' ? 'success' : item.status === 'Next' ? 'warning' : 'default'}>{item.status}</Badge>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <Section className="py-28 px-6 max-w-3xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-secondary-accent">Common Questions</h2>
          <p className="text-text-secondary">Everything you need to know</p>
        </div>

        <Accordion items={[
          { title: 'Is ShadowDAO really private?', content: 'Yes. Using Fhenix FHE, your vote is encrypted before leaving your browser. The smart contract tallies votes while still encrypted. Only aggregate results are decrypted.' },
          { title: 'Can I verify my vote was counted?', content: "Absolutely. The 'Verify My Vote' feature uses a personal FHE permit (EIP-712 signature) to reveal your own vote to you only." },
          { title: 'What networks are supported?', content: 'Currently live on Ethereum Sepolia with Fhenix CoFHE coprocessor. Multi-chain expansion planned for Wave 5.' },
          { title: 'How is this different from Snapshot?', content: 'Snapshot votes are fully public. Their optional shielded voting reveals individual votes after voting ends. ShadowDAO keeps individual votes encrypted forever — only totals are revealed.' },
        ]} />
      </Section>

      {/* ═══════════════ CTA ═══════════════ */}
      <Section className="py-28 px-6">
        <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 200 }}>
          <Card hover={false} className="max-w-7xl mx-auto bg-surface-accent border-none p-16 text-center space-y-8">
            <div className="max-w-2xl mx-auto space-y-4">
              <h2 className="text-4xl font-extrabold text-[#1A3A20]">Start Governing Privately</h2>
              <p className="text-[#1A3A20]/70 text-lg">Deploy your first encrypted proposal in under 2 minutes.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={handleLaunch} className="gap-2 bg-[#1A3A20] text-white group">
                Launch App <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <a href="https://github.com/plankton1212/shadowdao" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2">
                  <Github className="w-5 h-5" /> GitHub
                </Button>
              </a>
              <a href={etherscanAddress(SHADOWVOTE_ADDRESS)} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2">
                  <ExternalLink className="w-5 h-5" /> Etherscan
                </Button>
              </a>
            </div>
          </Card>
        </motion.div>
      </Section>

    </PageWrapper>
  );
};
