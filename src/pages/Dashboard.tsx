import React, { useState } from 'react';
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
  ArrowDown,
  Send,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, StatusBadge, AppLayout, PageWrapper, Button } from '../components/UI';
import { useAccount } from 'wagmi';
import { useProposals } from '../hooks/useProposals';
import { formatAddress, formatNumber } from '../utils';
import { formatDistanceToNow } from 'date-fns';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { proposals, loading, error, refetch } = useProposals();
  const [showBalance, setShowBalance] = useState(false);

  const activeProposals = proposals.filter((p) => p.status === 'VOTING');
  const recentResults = proposals.filter((p) => p.status === 'REVEALED');

  return (
    <AppLayout>
      <PageWrapper>
        <div className="space-y-8">
          {/* Welcome Banner */}
          <Card hover={false} className="border-l-4 border-l-primary-accent flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Hi, {formatAddress(address ?? null)}</h2>
              <p className="text-text-secondary">
                You have{' '}
                <span className="font-bold text-primary-accent">{activeProposals.length} pending votes</span>
              </p>
            </div>
            <Button
              variant="ghost"
              className="text-primary-accent font-bold"
              onClick={() => navigate('/app/proposals')}
            >
              Vote Now →
            </Button>
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="space-y-2">
              <div className="text-text-muted text-sm font-medium uppercase tracking-wider">Total Proposals</div>
              <div className="text-3xl font-bold">{loading ? '...' : proposals.length}</div>
              <div className="flex items-center gap-1 text-xs text-primary-accent">
                <Database className="w-3 h-3" /> On-chain
              </div>
            </Card>

            <Card accent className="space-y-2 relative overflow-hidden">
              <div className="text-[#1A3A20]/70 text-sm font-medium uppercase tracking-wider">Active Now</div>
              <div className="text-3xl font-bold text-[#1A3A20] flex items-center gap-2">
                {activeProposals.length}
                {activeProposals.length > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-3 h-3 bg-[#1A3A20] rounded-full"
                  />
                )}
              </div>
              <div className="text-xs text-[#1A3A20]/60">
                {activeProposals.length > 0 ? 'Live voting in progress' : 'No active votes'}
              </div>
            </Card>

            <Card className="space-y-2">
              <div className="text-text-muted text-sm font-medium uppercase tracking-wider">Revealed</div>
              <div className="text-3xl font-bold">{recentResults.length}</div>
              <div className="text-xs text-text-muted">Results decrypted</div>
            </Card>

            <Card className="space-y-2">
              <div className="text-text-muted text-sm font-medium uppercase tracking-wider">Network</div>
              <div className="text-3xl font-bold">Sepolia</div>
              <div className="flex items-center gap-1 text-xs text-primary-accent">
                <div className="w-2 h-2 bg-primary-accent rounded-full" /> Connected
              </div>
            </Card>
          </div>

          {error ? (
            <Card hover={false} className="text-center py-12 space-y-4">
              <AlertCircle className="w-8 h-8 text-danger mx-auto" />
              <p className="text-danger font-medium">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </Card>
          ) : loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading proposals from chain...
            </div>
          ) : (
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
                    {activeProposals.slice(0, 4).map((proposal) => {
                      const quorumPct = Number(proposal.quorum) > 0
                        ? Math.min(Math.round((Number(proposal.voterCount) / Number(proposal.quorum)) * 100), 100)
                        : 0;

                      return (
                        <Card key={proposal.id.toString()} className="flex flex-col justify-between h-full">
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <StatusBadge status={proposal.status} />
                              <Badge variant="warning">{formatDistanceToNow(proposal.deadline)}</Badge>
                            </div>
                            <h4 className="font-bold text-lg line-clamp-2">{proposal.title}</h4>
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
                                <div className="h-full bg-primary-accent" style={{ width: `${quorumPct}%` }} />
                              </div>
                              <div className="flex justify-between text-[10px] text-text-muted">
                                <span>{quorumPct}% Quorum</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-6 w-full group"
                            onClick={() => navigate(`/app/proposal/${proposal.id.toString()}`)}
                          >
                            Vote{' '}
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </Card>
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

              {/* Recent Results + Treasury Preview */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">Recent Results</h3>
                </div>

                <div className="space-y-4">
                  {recentResults.length > 0 ? (
                    recentResults.slice(0, 3).map((proposal) => (
                      <Card key={proposal.id.toString()} className="p-4 hover:border-primary-accent/20">
                        <div className="space-y-3">
                          <h4 className="font-bold text-sm line-clamp-1">{proposal.title}</h4>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-primary-accent" />
                              <span className="text-sm font-semibold">Results revealed</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs h-8"
                            onClick={() => navigate(`/app/proposal/${proposal.id.toString()}`)}
                          >
                            Details →
                          </Button>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <Card hover={false} className="p-4 text-center text-text-muted text-sm">
                      No revealed results yet
                    </Card>
                  )}
                </div>

                {/* Treasury Preview */}
                <Card accent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1A3A20]/70">Treasury</span>
                    <button onClick={() => setShowBalance(!showBalance)} className="text-[#1A3A20]">
                      {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-2xl font-extrabold text-[#1A3A20]">
                    {showBalance ? 'Encrypted' : 'FHE Protected'}
                  </div>
                  <div className="text-xs text-[#1A3A20]/60">Treasury coming in Wave 3</div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
