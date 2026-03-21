import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Shield,
  Lock,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  Vote as VoteIcon,
  Database,
  Zap,
  Globe,
  MessageSquare,
  Github,
  Twitter,
  ChevronRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Card, Badge, PageWrapper, Navbar, Accordion, Logo } from '../components/UI';
import { useAccount, useConnect } from 'wagmi';
import { cn } from '../utils';

const FloatingCard = ({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ y: 0 }}
    animate={{ y: [-8, 0, -8] }}
    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay }}
    className={className}
  >
    {children}
  </motion.div>
);

export const Home = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const handleLaunch = () => {
    if (isConnected) {
      navigate('/app/dashboard');
    } else {
      const connector = connectors[0];
      if (connector) {
        connect(
          { connector },
          {
            onSuccess: () => navigate('/app/dashboard'),
          }
        );
      }
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

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-pill shadow-sm border border-default"
          >
            <div className="w-2 h-2 bg-primary-accent rounded-full animate-pulse" />
            <span className="text-sm font-medium text-text-secondary">Live on Ethereum Sepolia</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-secondary-accent leading-[1.08] tracking-tight">
            Private Votes.
            <br />
            Public Trust.
          </h1>

          <p className="text-lg text-text-secondary max-w-lg leading-relaxed">
            Encrypted on-chain governance powered by Fhenix FHE. Create proposals, cast secret ballots, and reveal fair
            results — without exposing any individual vote.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button onClick={handleLaunch} size="lg" className="gap-2">
              Launch App <ArrowRight className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg">
              Read Docs
            </Button>
          </div>
        </div>

        <div className="relative hidden lg:block h-[500px]">
          <FloatingCard className="absolute top-10 left-0 z-20 w-80">
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1 bg-surface-highlight text-primary-accent rounded-badge text-xs font-bold">
                  <div className="w-2 h-2 bg-primary-accent rounded-full" />
                  VOTING
                </div>
                <Badge variant="warning">2d 14h</Badge>
              </div>
              <h3 className="font-bold text-lg">Increase staking rewards to 8%</h3>
              <div className="space-y-2">
                <div className="h-2 bg-bg-base rounded-full overflow-hidden">
                  <div className="h-full bg-primary-accent w-[72%]" />
                </div>
                <div className="flex justify-between text-xs text-text-muted">
                  <span>24 votes · Encrypted</span>
                  <span>72% Quorum</span>
                </div>
              </div>
            </Card>
          </FloatingCard>

          <FloatingCard delay={1} className="absolute bottom-10 right-0 z-10 w-80">
            <Card accent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="success">Winner</Badge>
                <span className="text-xs font-mono text-text-primary/60">Block 127,403</span>
              </div>
              <h3 className="font-bold text-lg text-[#1A3A20]">Fund developer grants Q2</h3>
              <div className="text-3xl font-extrabold text-[#1A3A20]">Option A — 64%</div>
              <p className="text-xs text-[#1A3A20]/70">Verified aggregate result revealed</p>
            </Card>
          </FloatingCard>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white/50 border-y border-black/5 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { val: 'FHE', label: 'Encryption Standard' },
            { val: 'Sepolia', label: 'Network' },
            { val: 'CoFHE', label: 'Coprocessor' },
            { val: '100%', label: 'Ballot Privacy' },
          ].map((stat, i) => (
            <div key={i} className="text-center space-y-1">
              <div className="text-3xl font-bold text-secondary-accent">{stat.val}</div>
              <div className="text-sm text-text-muted uppercase tracking-wider font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-secondary-accent">Why DAOs Choose ShadowDAO</h2>
          <p className="text-text-secondary max-w-2xl mx-auto text-lg">
            Military-grade encryption meets democratic governance
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Encrypted Ballots',
              desc: 'Every vote is FHE-encrypted before touching the chain. Not validators, not frontrunners, not even the DAO can see individual choices.',
              icon: Shield,
              color: 'bg-surface-highlight text-primary-accent',
            },
            {
              title: 'On-Chain Tallying',
              desc: 'Fhenix computes tallies directly on encrypted data. Results are mathematically correct without decrypting individual votes.',
              icon: Database,
              color: 'bg-[#EDEFFD] text-tertiary-accent',
              featured: true,
            },
            {
              title: 'Time-Locked Reveal',
              desc: 'Results stay sealed until the deadline. When time expires, only the aggregate is revealed — individual ballots remain private forever.',
              icon: Clock,
              color: 'bg-surface-highlight text-primary-accent',
            },
          ].map((feat, i) => (
            <Card key={i} className={cn(feat.featured && 'bg-surface-tinted')}>
              <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-6', feat.color)}>
                <feat.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-4">{feat.title}</h3>
              <p className="text-text-secondary leading-relaxed mb-6">{feat.desc}</p>
              <button className="text-primary-accent font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                Learn more <ArrowRight className="w-4 h-4" />
              </button>
            </Card>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-32 px-6 bg-surface-tinted">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold text-secondary-accent">Governance Use Cases</h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-lg">
              Tailored for every type of decentralized organization
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: 'Venture DAOs',
                desc: 'Securely vote on investment allocations without revealing individual fund manager strategies.',
                icon: TrendingUp,
              },
              {
                title: 'Protocol Gov',
                desc: 'Prevent front-running and MEV attacks on critical protocol parameter changes.',
                icon: Zap,
              },
              {
                title: 'Social Clubs',
                desc: 'Maintain member privacy and prevent peer pressure in community elections.',
                icon: Users,
              },
              {
                title: 'Grant Programs',
                desc: 'Fairly evaluate grant applications without reviewer bias or public scrutiny.',
                icon: CheckCircle2,
              },
            ].map((useCase, i) => (
              <Card key={i} className="bg-white border-none shadow-sm">
                <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-xl flex items-center justify-center mb-4">
                  <useCase.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg mb-2">{useCase.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{useCase.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Summary */}
      <section className="py-32 px-6 max-w-7xl mx-auto space-y-16">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl font-extrabold text-secondary-accent leading-tight">
              The Science of <br />
              <span className="text-primary-accent">Private Voting</span>
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed">
              ShadowDAO leverages Fhenix FHE (Fully Homomorphic Encryption) to enable computation on encrypted data.
              Your vote choice is never decrypted, not even during tallying.
            </p>
            <div className="space-y-4">
              {[
                {
                  title: 'Client-Side Encryption',
                  desc: 'Votes are encrypted in your browser before being sent to the chain.',
                },
                {
                  title: 'Homomorphic Tallying',
                  desc: 'The smart contract adds encrypted values without knowing what they are.',
                },
                {
                  title: 'Zero-Knowledge Proofs',
                  desc: 'Verify your vote was included without revealing its content.',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-surface-highlight text-primary-accent flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-secondary-accent">{item.title}</h4>
                    <p className="text-sm text-text-secondary">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="primary" onClick={() => navigate('/how-it-works')}>
              Full Technical Deep-Dive
            </Button>
          </div>
          <div className="relative">
            <div className="aspect-square bg-surface-highlight rounded-card p-12 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 border-4 border-dashed border-primary-accent/20 rounded-full"
              />
              <div className="relative z-10 text-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-full shadow-elevated flex items-center justify-center mx-auto">
                  <Lock className="w-10 h-10 text-primary-accent" />
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-secondary-accent">FHE Engine</div>
                  <div className="text-sm text-text-muted font-mono">CoFHE Coprocessor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="py-32 px-6 bg-secondary-accent text-white">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold">Protocol Roadmap</h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg">
              The future of private governance is being built today
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                phase: 'Q1 2026',
                title: 'Testnet Launch',
                status: 'Completed',
                desc: 'Initial deployment on Ethereum Sepolia with FHE voting.',
              },
              {
                phase: 'Q2 2026',
                title: 'Treasury FHE',
                status: 'In Progress',
                desc: 'Encrypted treasury management and allocation voting.',
              },
              {
                phase: 'Q3 2026',
                title: 'Mainnet Alpha',
                status: 'Upcoming',
                desc: 'Limited mainnet release for partner DAOs.',
              },
              {
                phase: 'Q4 2026',
                title: 'ShadowDAO v2',
                status: 'Upcoming',
                desc: 'Multi-chain support and advanced delegation.',
              },
            ].map((item, i) => (
              <div key={i} className="space-y-4 relative">
                <div className="text-primary-accent font-bold text-sm tracking-widest uppercase">{item.phase}</div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
                <Badge
                  variant={
                    item.status === 'Completed' ? 'success' : item.status === 'In Progress' ? 'warning' : 'default'
                  }
                  className="mt-2"
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 px-6 max-w-3xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-secondary-accent">Common Questions</h2>
          <p className="text-text-secondary">Everything you need to know about ShadowDAO</p>
        </div>

        <Accordion
          items={[
            {
              title: 'Is ShadowDAO really private?',
              content:
                'Yes. Using Fhenix FHE, your vote choice is encrypted before it leaves your browser. The smart contract tallies the votes while they are still encrypted, and only the final aggregate result is ever decrypted.',
            },
            {
              title: 'Can I verify my vote was counted?',
              content:
                "Absolutely. ShadowDAO provides a 'Verify My Vote' feature that uses a personal FHE permit to reveal your own vote to you, while keeping it hidden from everyone else.",
            },
            {
              title: 'What networks are supported?',
              content:
                'Currently, we are live on Ethereum Sepolia with the Fhenix CoFHE coprocessor. We plan to expand to more FHE-enabled networks in the future.',
            },
            {
              title: 'How much does it cost to vote?',
              content:
                'Voting on ShadowDAO is extremely efficient. While FHE computation is more complex than standard EVM calls, our optimized contracts ensure gas costs remain comparable to standard governance actions.',
            },
          ]}
        />
      </section>

      {/* Community / Newsletter */}
      <section className="py-32 px-6">
        <Card hover={false} className="max-w-7xl mx-auto bg-surface-accent border-none p-16 text-center space-y-8">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-4xl font-extrabold text-[#1A3A20]">Join the ShadowDAO Community</h2>
            <p className="text-[#1A3A20]/70 text-lg">
              Stay updated with the latest in private governance and FHE technology.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="px-6 py-4 rounded-pill bg-white border-none focus:ring-2 focus:ring-primary-accent outline-none w-full sm:w-80"
            />
            <Button size="lg" className="bg-[#1A3A20] text-white">
              Subscribe
            </Button>
          </div>
          <div className="flex justify-center gap-8 pt-4">
            <a href="#" className="text-[#1A3A20]/60 hover:text-[#1A3A20] transition-colors">
              <Twitter className="w-6 h-6" />
            </a>
            <a href="#" className="text-[#1A3A20]/60 hover:text-[#1A3A20] transition-colors">
              <Github className="w-6 h-6" />
            </a>
            <a href="#" className="text-[#1A3A20]/60 hover:text-[#1A3A20] transition-colors">
              <MessageSquare className="w-6 h-6" />
            </a>
          </div>
        </Card>
      </section>

      {/* Trust Strip */}
      <section className="bg-white/50 border-y border-black/5 py-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">FHENIX</div>
            <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">ARBITRUM</div>
            <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">ETHEREUM</div>
            <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">ZAMA</div>
            <div className="flex items-center gap-2 font-black text-2xl tracking-tighter">POLYGON</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#FAFCFA] border-t border-black/5 pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <Logo className="w-7 h-7" />
              <span className="text-xl font-bold text-secondary-accent">ShadowDAO</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              Private governance for the open internet. Powered by Fhenix FHE.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-6">Protocol</h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li>
                <a href="#" className="hover:text-primary-accent">
                  Fhenix
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-accent">
                  Sepolia
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-accent">
                  Docs
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Community</h4>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li>
                <a href="#" className="hover:text-primary-accent">
                  GitHub
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-accent">
                  Telegram
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-accent">
                  Twitter
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex gap-2">
              <Badge variant="success">Fhenix CoFHE</Badge>
              <Badge variant="info">Sepolia</Badge>
            </div>
            <p className="text-xs text-text-muted">Built with Fhenix FHE</p>
          </div>
        </div>
      </footer>
    </PageWrapper>
  );
};
