import React from 'react';
import { Shield, Lock, Database, ArrowRight, CheckCircle2, Eye, EyeOff, Clock } from 'lucide-react';
import { Card, Badge, PageWrapper, Navbar, Button } from '../components/UI';

export const HowItWorks = () => {
  return (
    <PageWrapper>
      <Navbar />
      <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto space-y-24">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-secondary-accent">How ShadowDAO Works</h1>
          <p className="text-text-secondary text-lg">The science of private, verifiable on-chain governance</p>
        </div>

        {/* Section 1: FHE Explainer */}
        <section className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">1. What is FHE?</h2>
            <p className="text-text-secondary leading-relaxed">
              Fully Homomorphic Encryption (FHE) is a revolutionary technology that allows computation to be performed directly on encrypted data. In ShadowDAO, this means we can count votes without ever seeing what they are.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <Card hover={false} className="text-center p-4">
              <VoteIcon className="w-8 h-8 mx-auto mb-2 text-primary-accent" />
              <div className="text-xs font-bold">Your Vote</div>
            </Card>
            <div className="hidden md:flex justify-center"><ArrowRight className="text-primary-accent" /></div>
            <Card hover={false} className="text-center p-4 bg-surface-highlight border-primary-accent/20">
              <Lock className="w-8 h-8 mx-auto mb-2 text-primary-accent" />
              <div className="text-xs font-bold">FHE Encryption</div>
            </Card>
            <div className="hidden md:flex justify-center"><ArrowRight className="text-primary-accent" /></div>
            <Card hover={false} className="text-center p-4">
              <Database className="w-8 h-8 mx-auto mb-2 text-tertiary-accent" />
              <div className="text-xs font-bold">On-Chain Tally</div>
            </Card>
          </div>
        </section>

        {/* Section 2: Privacy vs Transparency */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold">2. Privacy vs. Transparency</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card hover={false} className="bg-surface-tinted space-y-4">
              <div className="flex items-center gap-2 text-primary-accent font-bold">
                <Lock className="w-5 h-5" /> Private (Encrypted)
              </div>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">● Individual vote choice</li>
                <li className="flex items-center gap-2">● Voter selection</li>
                <li className="flex items-center gap-2">● Ballot content</li>
                <li className="flex items-center gap-2">● Vote-to-voter mapping</li>
              </ul>
            </Card>
            <Card hover={false} className="space-y-4">
              <div className="flex items-center gap-2 text-tertiary-accent font-bold">
                <Shield className="w-5 h-5" /> Public (On-Chain)
              </div>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">● Proposal title & options</li>
                <li className="flex items-center gap-2">● Voter addresses (participation)</li>
                <li className="flex items-center gap-2">● Deadline & Quorum</li>
                <li className="flex items-center gap-2">● Final aggregate result</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Section 3: The Flow */}
        <section className="space-y-12">
          <h2 className="text-2xl font-bold">3. The Voting Lifecycle</h2>
          <div className="space-y-8">
            {[
              { title: 'Create', desc: 'DAO members draft a proposal and define voting parameters.' },
              { title: 'Encrypt', desc: 'Each voter selects an option. The ballot is encrypted locally before submission.' },
              { title: 'Submit', desc: 'The encrypted ballot is sent to the Fhenix blockchain.' },
              { title: 'Tally', desc: 'Fhenix computes the aggregate result directly on the encrypted data.' },
              { title: 'Reveal', desc: 'Once the deadline passes, the final result is decrypted. Individual votes stay private.' },
            ].map((step, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary-accent text-white flex items-center justify-center font-bold shrink-0">
                    {i + 1}
                  </div>
                  {i < 4 && <div className="w-0.5 h-full bg-primary-accent/20 my-2" />}
                </div>
                <div className="pb-8">
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-text-secondary">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center pt-12">
          <Button size="lg" onClick={() => window.scrollTo(0, 0)}>Back to Top</Button>
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
