import React from 'react';
import { Shield, Lock, Database, Clock, Zap, Users, CheckCircle2 } from 'lucide-react';
import { Card, PageWrapper, Navbar } from '../components/UI';
import { cn } from '../utils';

export const Features = () => {
  const features = [
    {
      title: 'Encrypted Ballots',
      desc: 'Military-grade FHE encryption ensures that individual choices are never revealed. Not even validators can see how you voted.',
      icon: Lock,
      color: 'text-primary-accent',
      bg: 'bg-surface-highlight'
    },
    {
      title: 'On-Chain Tallying',
      desc: 'Computation happens directly on the blockchain using encrypted data. No off-chain trust required for results.',
      icon: Database,
      color: 'text-tertiary-accent',
      bg: 'bg-[#EDEFFD]'
    },
    {
      title: 'Time-Locked Reveals',
      desc: 'Results are automatically decrypted only after the voting period ends, preventing early-voter bias.',
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-[#FEF3CD]'
    },
    {
      title: 'Sybil Resistance',
      desc: 'Integrated with standard token-gating and allowlist systems to ensure fair democratic participation.',
      icon: Users,
      color: 'text-primary-accent',
      bg: 'bg-surface-highlight'
    },
    {
      title: 'Instant Verification',
      desc: 'Voters can verify their own vote was counted correctly using personal FHE permits without revealing it to others.',
      icon: CheckCircle2,
      color: 'text-success',
      bg: 'bg-surface-highlight'
    },
    {
      title: 'Fhenix Native',
      desc: 'Built from the ground up to leverage the unique privacy-preserving capabilities of the Fhenix FHE blockchain.',
      icon: Zap,
      color: 'text-tertiary-accent',
      bg: 'bg-[#EDEFFD]'
    }
  ];

  return (
    <PageWrapper>
      <Navbar />
      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-24">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-secondary-accent">Protocol Features</h1>
          <p className="text-text-secondary text-lg">Everything you need for secure, private DAO governance</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <Card key={i} className="space-y-6">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", f.bg)}>
                <f.icon className={cn("w-7 h-7", f.color)} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold">{f.title}</h3>
                <p className="text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card hover={false} className="bg-secondary-accent text-white p-12 text-center space-y-8">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-bold">Audit-Ready Design</h2>
            <p className="text-white/70">
              ShadowDAO is built with transparency in mind. While votes are private, the protocol logic is fully open-source and verifiable on-chain.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 opacity-60">
            <div className="flex items-center gap-2 font-bold"><Shield className="w-5 h-5" /> Open Source</div>
            <div className="flex items-center gap-2 font-bold"><Shield className="w-5 h-5" /> FHE Verified</div>
            <div className="flex items-center gap-2 font-bold"><Shield className="w-5 h-5" /> EVM Compatible</div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
};
