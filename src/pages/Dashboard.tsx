import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Activity,
  RefreshCw,
  PlusCircle,
  Shield,
  Zap,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card, Badge, StatusBadge, AppLayout, PageWrapper, Button,
  ProposalSkeleton, StatSkeleton, CountUp, CategoryEmoji,
} from '../components/UI';
import { useAccount } from 'wagmi';
import { usePublicClient } from 'wagmi';
import { useProposals } from '../hooks/useProposals';
import { useSpaces } from '../hooks/useSpaces';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { formatAddress, cn } from '../utils';
import { formatDistanceToNow } from 'date-fns';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI } from '../config/contract';

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
                <Link to="/app/treasury">
                  <Card accent className="p-5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1A3A20]/70">Treasury</span>
                      <button onClick={e => { e.preventDefault(); setShowBalance(!showBalance); }} className="text-[#1A3A20]">
                        {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="text-xl font-extrabold text-[#1A3A20]">
                      {showBalance ? '🔒 Encrypted' : 'FHE Protected'}
                    </div>
                    <div className="text-xs text-[#1A3A20]/60 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> euint32 balance · Wave 3
                    </div>
                  </Card>
                </Link>
              </div>
            </div>
          )}

          {/* Activity Feed */}
          <ActivityFeed />

        </div>
      </PageWrapper>
    </AppLayout>
  );
};

// ─── Activity Feed ─────────────────────────────────────────────────────────────

type ActivityEvent = {
  type: 'VoteCast' | 'ProposalCreated' | 'ResultsRevealed' | 'ProposalCancelled';
  proposalId: string;
  actor?: string;
  blockNumber: bigint;
  txHash: string;
};

function ActivityFeed() {
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Limit to last 100k blocks (~14 days on Sepolia) to avoid RPC limits
  const BLOCKS_WINDOW = 100_000n;

  const fetchEvents = useCallback(async () => {
    if (!publicClient) return;
    setLoading(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock > BLOCKS_WINDOW ? latestBlock - BLOCKS_WINDOW : 0n;
      const [voteLogs, proposalLogs, revealLogs, cancelLogs] = await Promise.all([
        publicClient.getLogs({
          address: SHADOWVOTE_ADDRESS,
          event: { name: 'VoteCast', type: 'event', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'voter', type: 'address', indexed: true }] },
          fromBlock, toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: SHADOWVOTE_ADDRESS,
          event: { name: 'ProposalCreated', type: 'event', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'title', type: 'string', indexed: false }, { name: 'optionCount', type: 'uint8', indexed: false }, { name: 'deadline', type: 'uint256', indexed: false }, { name: 'quorum', type: 'uint256', indexed: false }, { name: 'spaceId', type: 'uint256', indexed: false }, { name: 'spaceGated', type: 'bool', indexed: false }] },
          fromBlock, toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: SHADOWVOTE_ADDRESS,
          event: { name: 'ResultsRevealed', type: 'event', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }] },
          fromBlock, toBlock: 'latest',
        }),
        publicClient.getLogs({
          address: SHADOWVOTE_ADDRESS,
          event: { name: 'ProposalCancelled', type: 'event', inputs: [{ name: 'proposalId', type: 'uint256', indexed: true }, { name: 'creator', type: 'address', indexed: true }] },
          fromBlock, toBlock: 'latest',
        }),
      ]);

      const safeId = (l: any): string => {
        try { return ((l.args as any).proposalId as bigint).toString(); } catch { return '?'; }
      };
      const all: ActivityEvent[] = [
        ...voteLogs.filter(l => (l.args as any)?.voter && (l.args as any)?.proposalId != null).map(l => ({ type: 'VoteCast' as const, proposalId: safeId(l), actor: (l.args as any).voter, blockNumber: l.blockNumber!, txHash: l.transactionHash! })),
        ...proposalLogs.filter(l => (l.args as any)?.creator && (l.args as any)?.proposalId != null).map(l => ({ type: 'ProposalCreated' as const, proposalId: safeId(l), actor: (l.args as any).creator, blockNumber: l.blockNumber!, txHash: l.transactionHash! })),
        ...revealLogs.filter(l => (l.args as any)?.proposalId != null).map(l => ({ type: 'ResultsRevealed' as const, proposalId: safeId(l), blockNumber: l.blockNumber!, txHash: l.transactionHash! })),
        ...cancelLogs.filter(l => (l.args as any)?.creator && (l.args as any)?.proposalId != null).map(l => ({ type: 'ProposalCancelled' as const, proposalId: safeId(l), actor: (l.args as any).creator, blockNumber: l.blockNumber!, txHash: l.transactionHash! })),
      ];

      all.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setEvents(all.slice(0, 20));
    } catch (e) {
      console.error('Activity feed error:', e);
    } finally {
      setLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchEvents();
    timerRef.current = setInterval(fetchEvents, 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchEvents]);

  const eventConfig = {
    VoteCast: { label: 'voted on', icon: VoteIcon, color: 'text-primary-accent', bg: 'bg-surface-highlight' },
    ProposalCreated: { label: 'created', icon: PlusCircle, color: 'text-tertiary-accent', bg: 'bg-[#EDEFFD]' },
    ResultsRevealed: { label: 'results revealed for', icon: Shield, color: 'text-warning', bg: 'bg-warning/10' },
    ProposalCancelled: { label: 'cancelled', icon: AlertCircle, color: 'text-danger', bg: 'bg-danger/5' },
  };

  return (
    <Card hover={false} className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold">Activity Feed</h3>
            <p className="text-xs text-text-muted">Live events from blockchain · auto-refresh 30s</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={fetchEvents}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {loading && events.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-accent" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-text-muted text-sm">No on-chain events yet</div>
      ) : (
        <div className="space-y-2">
          {events.map((ev, i) => {
            const cfg = eventConfig[ev.type];
            const Icon = cfg.icon;
            return (
              <div key={`${ev.txHash}-${i}`} className="flex items-center gap-3 py-2.5 border-b border-default last:border-0">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', cfg.bg)}>
                  <Icon className={cn('w-4 h-4', cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {ev.actor && (
                      <span className="font-mono font-bold">{formatAddress(ev.actor)}</span>
                    )}
                    {' '}<span className="text-text-secondary">{cfg.label}</span>{' '}
                    <Link to={`/app/proposal/${ev.proposalId}`} className="font-bold text-primary-accent hover:underline">
                      Proposal #{ev.proposalId}
                    </Link>
                  </div>
                  <div className="text-xs text-text-muted">Block #{ev.blockNumber.toString()}</div>
                </div>
                <a href={`https://sepolia.etherscan.io/tx/${ev.txHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-text-muted hover:text-text-primary shrink-0">
                  <Zap className="w-3 h-3" />
                </a>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
