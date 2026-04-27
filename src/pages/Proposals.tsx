import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Vote as VoteIcon, Users, ArrowRight, Loader2, Lock, SlidersHorizontal, X, CalendarDays, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, StatusBadge, AppLayout, PageWrapper, Button, ProposalSkeleton, CategoryEmoji } from '../components/UI';
import { useProposals, ProposalStatus } from '../hooks/useProposals';
import { useSpaces, Space } from '../hooks/useSpaces';
import { cn } from '../utils';
import { formatDistanceToNow } from 'date-fns';
import { CATEGORY_LABELS } from '../config/contract';

type SortKey = 'newest' | 'oldest' | 'most_votes' | 'deadline_soonest';
type DateRange = 'any' | '1d' | '7d' | '30d';

const PAGE_SIZE = 10;

export const Proposals = () => {
  const navigate = useNavigate();
  const { proposals, loading, error, refetch } = useProposals();
  const { spaces } = useSpaces();
  const [filter, setFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [spaceFilter, setSpaceFilter] = useState<bigint | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [dateRange, setDateRange] = useState<DateRange>('any');
  const [page, setPage] = useState(1);

  const spaceMap = new Map<string, Space>(spaces.map((s) => [s.id.toString(), s]));

  const now = BigInt(Math.floor(Date.now() / 1000));
  const daySeconds = 86400n;

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filter, spaceFilter, search, sortKey, dateRange]);

  const filteredProposals = useMemo(() => {
    let list = proposals.filter((p) => {
      const matchesFilter = filter === 'ALL' || p.status === filter;
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
      const matchesSpace = spaceFilter === 'ALL' || (p.spaceGated && p.spaceId === spaceFilter);
      return matchesFilter && matchesSearch && matchesSpace;
    });

    // Sort
    list = [...list].sort((a, b) => {
      if (sortKey === 'newest') return Number(b.id - a.id);
      if (sortKey === 'oldest') return Number(a.id - b.id);
      if (sortKey === 'most_votes') return Number(b.voterCount - a.voterCount);
      if (sortKey === 'deadline_soonest') return Number(a.deadline - b.deadline);
      return 0;
    });

    return list;
  }, [proposals, filter, search, spaceFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(filteredProposals.length / PAGE_SIZE));
  const pagedProposals = filteredProposals.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeFilterCount = [
    filter !== 'ALL',
    spaceFilter !== 'ALL',
    sortKey !== 'newest',
    dateRange !== 'any',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilter('ALL');
    setSpaceFilter('ALL');
    setSortKey('newest');
    setDateRange('any');
    setSearch('');
  };

  return (
    <AppLayout>
      <PageWrapper>
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">Proposals</h2>
                <span className="px-2 py-0.5 bg-surface-highlight text-xs font-bold rounded-badge text-text-muted">
                  {filteredProposals.length}
                </span>
              </div>
              <div className="flex gap-2">
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-pill text-xs font-bold text-danger bg-danger/5 hover:bg-danger/10 transition-colors">
                    <X className="w-3 h-3" /> Clear ({activeFilterCount})
                  </button>
                )}
                <button onClick={() => setShowAdvanced(!showAdvanced)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-bold transition-all border',
                    showAdvanced ? 'bg-secondary-accent text-white border-secondary-accent' : 'bg-white text-text-secondary border-default hover:bg-surface-tinted'
                  )}>
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search proposals by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-input border border-default bg-white focus:outline-none focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                </button>
              )}
            </div>

            {/* Status pills */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {([
                { key: 'ALL', label: 'All', color: '' },
                { key: 'VOTING', label: 'Active', color: 'bg-primary-accent' },
                { key: 'ENDED', label: 'Pending Reveal', color: 'bg-warning' },
                { key: 'REVEALED', label: 'Closed', color: 'bg-text-muted' },
                { key: 'CANCELLED', label: 'Cancelled', color: 'bg-danger' },
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

            {/* Advanced filters panel */}
            {showAdvanced && (
              <div className="p-4 bg-surface-tinted rounded-xl border border-default grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Space filter */}
                {spaces.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wide">Space</label>
                    <select
                      value={spaceFilter === 'ALL' ? 'ALL' : spaceFilter.toString()}
                      onChange={(e) => setSpaceFilter(e.target.value === 'ALL' ? 'ALL' : BigInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-input border border-default bg-white text-sm text-text-secondary focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Spaces</option>
                      {spaces.map((s) => (
                        <option key={s.id.toString()} value={s.id.toString()}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sort */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wide flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" /> Sort by
                  </label>
                  <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                    className="w-full px-3 py-2 rounded-input border border-default bg-white text-sm text-text-secondary focus:outline-none cursor-pointer">
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="most_votes">Most votes</option>
                    <option value="deadline_soonest">Deadline soonest</option>
                  </select>
                </div>

                {/* Date range */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wide flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Created
                  </label>
                  <select value={dateRange} onChange={e => setDateRange(e.target.value as DateRange)}
                    className="w-full px-3 py-2 rounded-input border border-default bg-white text-sm text-text-secondary focus:outline-none cursor-pointer">
                    <option value="any">Any time</option>
                    <option value="1d">Last 24h</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                </div>
              </div>
            )}
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
                pagedProposals.map((proposal, i) => (
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
              ) : null}

              {/* Pagination */}
              {filteredProposals.length > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-4">
                  <span className="text-sm text-text-muted">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredProposals.length)} of {filteredProposals.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 h-auto"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '...' ? (
                          <span key={`ellipsis-${i}`} className="text-text-muted text-sm px-1">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setPage(p as number)}
                            className={cn(
                              'w-8 h-8 rounded-input text-sm font-bold transition-all',
                              page === p ? 'bg-primary-accent text-white' : 'bg-white border border-default text-text-secondary hover:bg-surface-tinted'
                            )}
                          >
                            {p}
                          </button>
                        )
                      )
                    }
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-2 h-auto"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {filteredProposals.length === 0 && (
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
