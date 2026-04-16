import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Vote as VoteIcon, Users, ArrowRight, Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, StatusBadge, AppLayout, PageWrapper, Button, ProposalSkeleton, CategoryEmoji } from '../components/UI';
import { useProposals, ProposalStatus } from '../hooks/useProposals';
import { useSpaces, Space } from '../hooks/useSpaces';
import { cn } from '../utils';
import { formatDistanceToNow } from 'date-fns';

export const Proposals = () => {
  const navigate = useNavigate();
  const { proposals, loading, error, refetch } = useProposals();
  const { spaces } = useSpaces();
  const [filter, setFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [spaceFilter, setSpaceFilter] = useState<bigint | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const spaceMap = new Map<string, Space>(spaces.map((s) => [s.id.toString(), s]));

  const filteredProposals = proposals.filter((p) => {
    const matchesFilter = filter === 'ALL' || p.status === filter;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesSpace = spaceFilter === 'ALL' || (p.spaceGated && p.spaceId === spaceFilter);
    return matchesFilter && matchesSearch && matchesSpace;
  });

  return (
    <AppLayout>
      <PageWrapper>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-3xl font-bold">Proposals</h2>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search proposals..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-input border border-default bg-white focus:outline-none focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent transition-all"
                  />
                </div>
                {/* Space filter */}
                {spaces.length > 0 && (
                  <select
                    value={spaceFilter === 'ALL' ? 'ALL' : spaceFilter.toString()}
                    onChange={(e) => setSpaceFilter(e.target.value === 'ALL' ? 'ALL' : BigInt(e.target.value))}
                    className="px-3 py-2.5 rounded-input border border-default bg-white text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent transition-all cursor-pointer"
                  >
                    <option value="ALL">All Spaces</option>
                    {spaces.map((s) => (
                      <option key={s.id.toString()} value={s.id.toString()}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {([
                  { key: 'ALL', label: 'Any', color: '' },
                  { key: 'VOTING', label: 'Active', color: 'bg-primary-accent' },
                  { key: 'ENDED', label: 'Pending Reveal', color: 'bg-warning' },
                  { key: 'REVEALED', label: 'Closed', color: 'bg-text-muted' },
                ] as const).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key as any)}
                    className={cn(
                      'px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2',
                      filter === f.key
                        ? 'bg-secondary-accent text-white shadow-sm'
                        : 'bg-white text-text-secondary border border-default hover:bg-surface-tinted'
                    )}
                  >
                    {f.color && <span className={cn('w-2 h-2 rounded-full', f.color)} />}
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <ProposalSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-white/50 rounded-card border border-dashed border-danger/30 space-y-4">
              <p className="text-danger font-medium">{error}</p>
              <p className="text-text-muted text-sm">Make sure the contract is deployed and you're on Sepolia.</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProposals.length > 0 ? (
                filteredProposals.map((proposal, i) => (
                  <motion.div
                    key={proposal.id.toString()}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                  <Card
                    className="p-0 overflow-hidden hover:border-primary-accent/20 cursor-pointer"
                    onClick={() => navigate(`/app/proposal/${proposal.id.toString()}`)}
                  >
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <StatusBadge status={proposal.status} />
                          <span className="text-xs text-text-muted font-mono">#{proposal.id.toString()}</span>
                          {proposal.spaceGated && (() => {
                            const space = spaceMap.get(proposal.spaceId.toString());
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-highlight text-primary-accent rounded-badge text-[10px] font-bold border border-primary-accent/20">
                                <Lock className="w-2.5 h-2.5" />
                                {space ? (
                                  <>
                                    <CategoryEmoji label={space.categoryLabel} className="text-[10px]" />
                                    {space.name}
                                  </>
                                ) : (
                                  `Space #${proposal.spaceId.toString()}`
                                )}
                              </span>
                            );
                          })()}
                        </div>
                        <h3 className="text-xl font-bold text-secondary-accent">{proposal.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                          <span className="flex items-center gap-1">
                            <VoteIcon className="w-4 h-4" /> {proposal.optionCount} options
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" /> {proposal.voterCount.toString()} votes
                          </span>
                          <span>
                            {proposal.status === 'VOTING'
                              ? `Ends in ${formatDistanceToNow(proposal.deadline)}`
                              : `Ended ${proposal.deadline.toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" className="group">
                          View Details{' '}
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 bg-white/50 rounded-card border border-dashed border-default space-y-4">
                  <div className="w-16 h-16 bg-bg-base rounded-full flex items-center justify-center mx-auto">
                    <VoteIcon className="w-8 h-8 text-text-muted" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">No proposals found</h3>
                    <p className="text-text-secondary">
                      {proposals.length === 0
                        ? 'No proposals have been created yet.'
                        : 'Try adjusting your filters or search terms.'}
                    </p>
                  </div>
                  {proposals.length === 0 ? (
                    <Button variant="primary" size="sm" onClick={() => navigate('/app/create')}>
                      Create First Proposal
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilter('ALL');
                        setSpaceFilter('ALL');
                        setSearch('');
                      }}
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
