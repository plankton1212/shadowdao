import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Users, Vote as VoteIcon, Shield, Plus, ArrowRight, Globe, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge, AppLayout, PageWrapper, Button } from '../components/UI';
import { useSpaces } from '../hooks/useSpaces';
import { CATEGORY_LABELS } from '../config/contract';
import { cn, formatAddress } from '../utils';

export const Spaces = () => {
  const { spaces, loading, error, refetch } = useSpaces();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = spaces.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All' || s.categoryLabel === category;
    return matchSearch && matchCategory;
  });

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Spaces</h2>
              <p className="text-text-secondary">Browse and join private DAOs powered by FHE</p>
            </div>
            <Link to="/app/create-space">
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Create Space
              </Button>
            </Link>
          </div>

          {/* Search & Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search spaces..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {['All', ...CATEGORY_LABELS].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap transition-all',
                    category === cat
                      ? 'bg-secondary-accent text-white'
                      : 'bg-bg-base text-text-secondary hover:bg-surface-highlight'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading spaces...
            </div>
          )}

          {/* Error */}
          {error && (
            <Card hover={false} className="text-center py-10 space-y-4">
              <p className="text-danger">{error}</p>
              <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
            </Card>
          )}

          {/* Spaces Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((space, i) => (
                <motion.div
                  key={space.id.toString()}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/app/space/${space.id.toString()}`}>
                    <Card className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-surface-highlight rounded-xl flex items-center justify-center">
                            <Globe className="w-6 h-6 text-primary-accent" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{space.name}</h3>
                            <Badge variant="default">{space.categoryLabel}</Badge>
                          </div>
                        </div>
                        {!space.isPublic && <Badge variant="warning">Invite Only</Badge>}
                      </div>

                      <p className="text-sm text-text-secondary line-clamp-2">{space.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-default">
                        <div className="flex gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {Number(space.memberCount)} members
                          </span>
                          <span className="flex items-center gap-1">
                            <VoteIcon className="w-3 h-3" /> {Number(space.proposalCount)} proposals
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filtered.length === 0 && (
            <Card hover={false} className="text-center py-16 space-y-4">
              <Globe className="w-12 h-12 text-text-muted mx-auto" />
              <h3 className="text-xl font-bold">
                {spaces.length === 0 ? 'No spaces yet' : 'No matching spaces'}
              </h3>
              <p className="text-text-secondary text-sm max-w-sm mx-auto">
                {spaces.length === 0
                  ? 'Be the first to create a private DAO with FHE-encrypted voting.'
                  : 'Try different search terms or filters.'}
              </p>
              {spaces.length === 0 && (
                <Link to="/app/create-space">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" /> Create First Space
                  </Button>
                </Link>
              )}
            </Card>
          )}

          {/* FHE Info */}
          <Card hover={false} className="p-4 bg-surface-highlight border-none flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary-accent shrink-0 mt-0.5" />
            <p className="text-xs text-primary-accent leading-relaxed">
              Each Space is an on-chain DAO deployed via ShadowSpace.sol on Ethereum Sepolia. All votes within a Space are FHE-encrypted — members vote privately, and only aggregate results are revealed after the deadline.
            </p>
          </Card>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
