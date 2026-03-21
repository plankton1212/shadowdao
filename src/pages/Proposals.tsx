import React, { useState } from 'react';
import { Search, Vote as VoteIcon, Users, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, StatusBadge, AppLayout, PageWrapper, Button } from '../components/UI';
import { useProposals, ProposalStatus } from '../hooks/useProposals';
import { cn, formatAddress } from '../utils';
import { formatDistanceToNow } from 'date-fns';

export const Proposals = () => {
  const navigate = useNavigate();
  const { proposals, loading, error, refetch } = useProposals();
  const [filter, setFilter] = useState<ProposalStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const filteredProposals = proposals.filter((p) => {
    const matchesFilter = filter === 'ALL' || p.status === filter;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AppLayout>
      <PageWrapper>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-3xl font-bold">Proposals</h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
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
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {(['ALL', 'VOTING', 'ENDED', 'REVEALED'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      'px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap transition-all',
                      filter === f
                        ? 'bg-secondary-accent text-white shadow-sm'
                        : 'bg-white text-text-secondary border border-default hover:bg-surface-tinted'
                    )}
                  >
                    {f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading proposals from chain...
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
                filteredProposals.map((proposal) => (
                  <Card
                    key={proposal.id.toString()}
                    className="p-0 overflow-hidden hover:border-primary-accent/20 cursor-pointer"
                    onClick={() => navigate(`/app/proposal/${proposal.id.toString()}`)}
                  >
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={proposal.status} />
                          <span className="text-xs text-text-muted font-mono">#{proposal.id.toString()}</span>
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
