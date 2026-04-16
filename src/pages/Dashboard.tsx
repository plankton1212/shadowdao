import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Users,
  Vote as VoteIcon,
  Database,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Plus,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card, Badge, StatusBadge, AppLayout, PageWrapper, Button,
  ProposalSkeleton, StatSkeleton, CountUp, CategoryEmoji,
} from '../components/UI';
import { useAccount } from 'wagmi';
import { useProposals } from '../hooks/useProposals';
import { useSpaces } from '../hooks/useSpaces';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { formatAddress } from '../utils';
import { formatDistanceToNow } from 'date-fns';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { proposals, loading, error, refetch, getUserProposalIds, getUserVoteIds } = useProposals();
  const { spaces, getUserSpaceIds } = useSpaces();
  useKeyboardShortcuts();
  const [showBalance, setShowBalance] = useState(false);

  // Personal on-chain stats
  const [myVoteCount, setMyVoteCount] = useState<number | null>(null);
  const [myProposalCount, setMyProposalCount] = useState<number | null>(null);
  const [mySpaceIds, setMySpaceIds] = useState<bigint[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      const [voteIds, proposalIds, spaceIds] = await Promise.all([
        getUserVoteIds(),
        getUserProposalIds(),
        getUserSpaceIds(),
      ]);
      setMyVoteCount(voteIds.length);
      setMyProposalCount(proposalIds.length);
      setMySpaceIds(spaceIds);
    };
    if (address) loadStats();
  }, [address, getUserVoteIds, getUserProposalIds, getUserSpaceIds]);

  const activeProposals = proposals.filter((p) => p.status === 'VOTING');
  const recentResults = proposals.filter((p) => p.status === 'REVEALED');
  const mySpaces = spaces.filter((s) => mySpaceIds.includes(s.id));

  return (
    <AppLayout>
      <PageWrapper>
        <div className="space-y-8">
          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card hover={false} className="border-l-4 border-l-primary-accent">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">
                      Hey, <span className="font-mono text-primary-accent">{formatAddress(address ?? null)}</span>
                    </h2>
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="w-2 h-2 bg-primary-accent rounded-full"
                    />
                  </div>
                  <p className="text-text-secondary text-sm">
                    {activeProposals.length > 0
                      ? <>You have <span className="font-bold text-primary-accent">{activeProposals.length} active vote{activeProposals.length !== 1 ? 's' : ''}</span> waiting</>
                      : 'No active votes right now'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-primary-accent font-bold" onClick={() => navigate('/app/proposals')}>
                    All Proposals <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                  <Button size="sm" onClick={() => navigate('/app/create')} className="gap-1">
                    <Plus className="w-3 h-3" /> Create
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Stats Row — 5 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Total proposals */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="space-y-1.5 p-5">
                <div className="text-text-muted text-xs font-bold uppercase tracking-wider">Total Proposals</div>
                <div className="text-3xl font-bold">
                  {loading ? <div className="animate-pulse bg-bg-base rounded h-8 w-12" /> : <CountUp end={proposals.length} />}
                </div>
                <div className="flex items-center gap-1 text-xs text-primary-accent">
                  <Database className="w-3 h-3" /> On-chain
                </div>
              </Card>
            </motion.div>

            {/* Active */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card accent className="space-y-1.5 p-5 relative overflow-hidden">
                <div className="text-[#1A3A20]/70 text-xs font-bold uppercase tracking-wider">Active Now</div>
                <div className="text-3xl font-bold text-[#1A3A20] flex items-center gap-2">
                  {loading ? <div className="animate-pulse bg-[#1A3A20]/20 rounded h-8 w-8" /> : <CountUp end={activeProposals.length} duration={1} />}
                  {!loading && activeProposals.length > 0 && (
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }} className="w-2.5 h-2.5 bg-[#1A3A20] rounded-full" />
                  )}
                </div>
                <div className="text-xs text-[#1A3A20]/60">{activeProposals.length > 0 ? 'Live voting' : 'No active votes'}</div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#1A3A20]/5 rounded-full" />
              </Card>
            </motion.div>

            {/* Revealed */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="space-y-1.5 p-5">
                <div className="text-text-muted text-xs font-bold uppercase tracking-wider">Revealed</div>
                <div className="text-3xl font-bold">
                  {loading ? <div className="animate-pulse bg-bg-base rounded h-8 w-10" /> : <CountUp end={recentResults.length} />}
                </div>
                <div className="text-xs text-text-muted">Results decrypted</div>
              </Card>
            </motion.div>

            {/* My Votes Cast */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="space-y-1.5 p-5">
                <div className="text-text-muted text-xs font-bold uppercase tracking-wider">My Votes</div>
                <div className="text-3xl font-bold">
                  {myVoteCount === null
                    ? <div className="animate-pulse bg-bg-base rounded h-8 w-10" />
                    : <CountUp end={myVoteCount} />}
                </div>
                <div className="flex items-center gap-1 text-xs text-primary-accent">
                  <Lock className="w-3 h-3" /> FHE encrypted
                </div>
              </Card>
            </motion.div>

            {/* My Spaces */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="space-y-1.5 p-5 cursor-pointer" onClick={() => navigate('/app/spaces')}>
                <div className="text-text-muted text-xs font-bold uppercase tracking-wider">My Spaces</div>
                <div className="text-3xl font-bold">
                  {mySpaceIds.length === 0 && myVoteCount === null
                    ? <div className="animate-pulse bg-bg-base rounded h-8 w-8" />
                    : <CountUp end={mySpaceIds.length} />}
                </div>
                <div className="flex items-center gap-1 text-xs text-tertiary-accent">
                  <Globe className="w-3 h-3" /> DAOs joined
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Error */}
          {error && (
            <Card hover={false} className="text-center py-10 space-y-4">
              <AlertCircle className="w-8 h-8 text-danger mx-auto" />
              <p className="text-danger font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
            </Card>
          )}

          {loading ? (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => <ProposalSkeleton key={i} />)}
              </div>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)}
              </div>
            </div>
          ) : !error && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Active Proposals */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">Active Proposals</h3>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/app/proposals')}>
                    See All →
                  </Button>
                </div>

                {activeProposals.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-6">
                    {activeProposals.slice(0, 4).map((proposal, i) => {
                      const quorumPct = Number(proposal.quorum) > 0
                        ? Math.min(Math.round((Number(proposal.voterCount) / Number(proposal.quorum)) * 100), 100)
                        : 0;

                      return (
                        <motion.div
                          key={proposal.id.toString()}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.4 }}
                        >
                          <Card className="flex flex-col justify-between h-full group">
                            <div className="space-y-4">
                              <div className="flex justify-between items-start">
                                <StatusBadge status={proposal.status} />
                                <Badge variant="warning">{formatDistanceToNow(proposal.deadline)}</Badge>
                              </div>
                              <h4 className="font-bold text-lg line-clamp-2 group-hover:text-primary-accent transition-colors">{proposal.title}</h4>
                              <div className="flex gap-4 text-xs text-text-muted">
                                <span className="flex items-center gap-1">
                                  <VoteIcon className="w-3 h-3" /> {proposal.optionCount} options
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {proposal.voterCount.toString()} votes
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="h-1.5 bg-bg-base rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${quorumPct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full bg-primary-accent"
                                  />
                                </div>
                                <div className="flex justify-between text-[10px] text-text-muted">
                                  <span>{quorumPct}% Quorum</span>
                                  <span>{Number(proposal.voterCount)}/{Number(proposal.quorum)}</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-6 w-full group/btn"
                              onClick={() => navigate(`/app/proposal/${proposal.id.toString()}`)}
                            >
                              <Lock className="w-3 h-3 mr-1.5" />
                              Vote
                              <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <Card hover={false} className="text-center py-12">
                    <VoteIcon className="w-8 h-8 text-text-muted mx-auto mb-3" />
                    <p className="text-text-secondary">No active proposals</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/app/create')}>
                      Create One
                    </Button>
                  </Card>
                )}
              </div>

              {/* Right column: Recent Results + My Spaces */}
              <div className="space-y-6">
                {/* Recent Results */}
                <div>
                  <h3 className="text-2xl font-bold mb-4">Recent Results</h3>
                  <div className="space-y-3">
                    {recentResults.length > 0 ? (
                      recentResults.slice(0, 3).map((proposal) => (
                        <Card
                          key={proposal.id.toString()}
                          className="p-4 hover:border-primary-accent/20 cursor-pointer"
                          onClick={() => navigate(`/app/proposal/${proposal.id.toString()}`)}
                        >
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm line-clamp-1">{proposal.title}</h4>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary-accent" />
                              <span className="text-xs font-semibold text-primary-accent">Results revealed</span>
                            </div>
                            <div className="text-[10px] text-text-muted">
                              {proposal.voterCount.toString()} total votes · FHE decrypted
                            </div>
                          </div>
                        </Card>
                      ))
                    ) : (
                      <Card hover={false} className="p-4 text-center text-text-muted text-sm">
                        No revealed results yet
                      </Card>
                    )}
                  </div>
                </div>

                {/* My Spaces widget */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">My Spaces</h3>
                    <Link to="/app/spaces">
                      <Button variant="ghost" size="sm" className="text-xs">Explore →</Button>
                    </Link>
                  </div>

                  {mySpaces.length > 0 ? (
                    <div className="space-y-3">
                      {mySpaces.slice(0, 3).map((space) => (
                        <Link key={space.id.toString()} to={`/app/space/${space.id.toString()}`}>
                          <Card className="p-4 hover:border-primary-accent/20">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-surface-highlight rounded-xl flex items-center justify-center text-lg shrink-0">
                                <CategoryEmoji label={space.categoryLabel} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-sm truncate">{space.name}</div>
                                <div className="text-[10px] text-text-muted flex gap-2 mt-0.5">
                                  <span>{Number(space.memberCount)} members</span>
                                  <span>·</span>
                                  <span>{Number(space.proposalCount)} proposals</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                      {mySpaces.length > 3 && (
                        <Link to="/app/spaces">
                          <div className="text-xs text-center text-primary-accent font-medium py-2 hover:underline">
                            +{mySpaces.length - 3} more spaces
                          </div>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <Card hover={false} className="p-5 text-center space-y-3">
                      <Globe className="w-8 h-8 text-text-muted mx-auto" />
                      <p className="text-sm text-text-secondary">No spaces joined yet</p>
                      <Link to="/app/spaces">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Plus className="w-3 h-3" /> Browse Spaces
                        </Button>
                      </Link>
                    </Card>
                  )}
                </div>

                {/* Treasury Preview */}
                <Card accent className="p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1A3A20]/70">Treasury</span>
                    <button onClick={() => setShowBalance(!showBalance)} className="text-[#1A3A20]">
                      {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-xl font-extrabold text-[#1A3A20]">
                    {showBalance ? '🔒 Encrypted' : 'FHE Protected'}
                  </div>
                  <div className="text-xs text-[#1A3A20]/60 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> euint64 balance · Coming Wave 3
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
