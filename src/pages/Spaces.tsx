import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Users, Vote as VoteIcon, Shield, Plus, ArrowRight, Globe, Loader2, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Badge, AppLayout, PageWrapper, Button, CategoryEmoji } from '../components/UI';
import { useSpaces } from '../hooks/useSpaces';
import { CATEGORY_LABELS } from '../config/contract';
import { cn, formatAddress } from '../utils';
import { useAccount } from 'wagmi';

type Tab = 'explore' | 'mine';

export const Spaces = () => {
  const { spaces, loading, error, refetch, getUserSpaceIds } = useSpaces();
  const { address } = useAccount();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [tab, setTab] = useState<Tab>('explore');
  const [mySpaceIds, setMySpaceIds] = useState<bigint[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoadingMine(true);
    getUserSpaceIds().then((ids) => {
      setMySpaceIds(ids);
      setLoadingMine(false);
    });
  }, [address, getUserSpaceIds]);

  const allFiltered = spaces.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All' || s.categoryLabel === category;
    return matchSearch && matchCategory;
  });

  const mySpaces = spaces.filter((s) => mySpaceIds.includes(s.id));
  const displaySpaces = tab === 'mine' ? mySpaces : allFiltered;

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold">Spaces</h2>
              <p className="text-text-secondary">Browse and join private DAOs powered by FHE</p>
            </div>
            <Link to="/app/create-space">
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Create Space
              </Button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-bg-base rounded-2xl p-1 w-fit">
            {(['explore', 'mine'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200',
                  tab === t
                    ? 'bg-white text-secondary-accent shadow-card'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                {t === 'explore' ? (
                  <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Explore</span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> My Spaces
                    {mySpaceIds.length > 0 && (
                      <span className="bg-primary-accent text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {mySpaceIds.length}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Category filter — only on Explore tab */}
          <AnimatePresence mode="wait">
            {tab === 'explore' && (
              <motion.div
                key="filters"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search spaces by name or description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-all bg-white"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {['All', ...CATEGORY_LABELS].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        'px-4 py-2 rounded-pill text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5',
                        category === cat
                          ? 'bg-secondary-accent text-white'
                          : 'bg-white text-text-secondary border border-default hover:border-primary-accent/40 hover:text-text-primary'
                      )}
                    >
                      {cat !== 'All' && <CategoryEmoji label={cat} className="text-sm" />}
                      {cat}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats bar */}
          {!loading && spaces.length > 0 && tab === 'explore' && (
            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span className="font-medium">{allFiltered.length} space{allFiltered.length !== 1 ? 's' : ''}</span>
              {search && <span>matching "{search}"</span>}
              {category !== 'All' && <span>in {category}</span>}
            </div>
          )}

          {/* Loading */}
          {(loading || (tab === 'mine' && loadingMine)) && (
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
          {!loading && !loadingMine && !error && displaySpaces.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displaySpaces.map((space, i) => (
                <motion.div
                  key={space.id.toString()}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/app/space/${space.id.toString()}`}>
                    <Card className="space-y-4 group h-full">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 8 }}
                            className="w-12 h-12 bg-surface-highlight rounded-xl flex items-center justify-center text-2xl shrink-0"
                          >
                            <CategoryEmoji label={space.categoryLabel} />
                          </motion.div>
                          <div>
                            <h3 className="font-bold text-lg group-hover:text-primary-accent transition-colors">{space.name}</h3>
                            <Badge variant="default">{space.categoryLabel}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {!space.isPublic && <Badge variant="warning">Invite Only</Badge>}
                          {mySpaceIds.includes(space.id) && <Badge variant="success">Member</Badge>}
                        </div>
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
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3" /> FHE
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary-accent group-hover:translate-x-1 transition-all" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty States */}
          {!loading && !loadingMine && !error && displaySpaces.length === 0 && (
            <Card hover={false} className="text-center py-16 space-y-4">
              {tab === 'mine' ? (
                <>
                  <Users className="w-12 h-12 text-text-muted mx-auto" />
                  <h3 className="text-xl font-bold">No spaces joined yet</h3>
                  <p className="text-text-secondary text-sm max-w-sm mx-auto">
                    Join existing spaces or create your own private DAO with FHE-encrypted voting.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={() => setTab('explore')}>
                      <Button variant="outline" className="gap-2">
                        <Globe className="w-4 h-4" /> Browse Spaces
                      </Button>
                    </button>
                    <Link to="/app/create-space">
                      <Button className="gap-2">
                        <Plus className="w-4 h-4" /> Create Space
                      </Button>
                    </Link>
                  </div>
                </>
              ) : spaces.length === 0 ? (
                <>
                  <Globe className="w-12 h-12 text-text-muted mx-auto" />
                  <h3 className="text-xl font-bold">No spaces yet</h3>
                  <p className="text-text-secondary text-sm max-w-sm mx-auto">
                    Be the first to create a private DAO with FHE-encrypted voting.
                  </p>
                  <Link to="/app/create-space">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" /> Create First Space
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 text-text-muted mx-auto" />
                  <h3 className="text-xl font-bold">No matching spaces</h3>
                  <p className="text-text-secondary text-sm">Try different search terms or filters.</p>
                  <Button variant="ghost" onClick={() => { setSearch(''); setCategory('All'); }}>
                    Clear filters
                  </Button>
                </>
              )}
            </Card>
          )}

          {/* FHE Info banner */}
          <Card hover={false} className="p-4 bg-surface-highlight border-none flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary-accent shrink-0 mt-0.5" />
            <p className="text-xs text-primary-accent leading-relaxed">
              Each Space is an on-chain DAO deployed via ShadowSpace.sol on Ethereum Sepolia. All votes within a Space are FHE-encrypted using Fhenix CoFHE — members vote privately, and only aggregate results are revealed after the deadline. Membership is public; only ballots are private.
            </p>
          </Card>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
