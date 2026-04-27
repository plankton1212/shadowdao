import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Users, Vote as VoteIcon,
  Shield, Lock, RefreshCw, Calendar, Award,
} from 'lucide-react';
import { Card, Badge, AppLayout, PageWrapper, Button } from '../components/UI';
import { usePublicClient } from 'wagmi';
import { useProposals } from '../hooks/useProposals';
import { useSpaces } from '../hooks/useSpaces';
import { SHADOWVOTE_ADDRESS, SHADOWVOTE_ABI, CATEGORY_LABELS } from '../config/contract';
import { formatAddress, cn } from '../utils';

// ─── Mini SVG chart components ────────────────────────────────────────────────

const LineChart = ({ data, color = '#1A8C52' }: { data: number[]; color?: string }) => {
  if (data.length < 2) return <div className="h-24 flex items-center justify-center text-xs text-text-muted">No data yet</div>;
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 60;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  const fill = `${pts} ${w},${h} 0,${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24" preserveAspectRatio="none">
      <defs>
        <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill="url(#line-fill)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * w} cy={h - (v / max) * h} r="2" fill={color} />
      ))}
    </svg>
  );
};

const DonutChart = ({ value, total, color = '#1A8C52' }: { value: number; total: number; color?: string }) => {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#E8F5E0" strokeWidth="10" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold">{pct}%</span>
        <span className="text-[10px] text-text-muted">quorum</span>
      </div>
    </div>
  );
};

const BarGroup = ({ bars, labels, colors }: { bars: number[]; labels: string[]; colors: string[] }) => {
  const max = Math.max(...bars, 1);
  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {bars.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-[10px] text-text-muted font-bold">{v}</div>
          <div
            className="w-full rounded-t-md transition-all duration-500"
            style={{
              height: `${Math.max((v / max) * 100, 4)}%`,
              backgroundColor: colors[i % colors.length],
            }}
          />
          <div className="text-[9px] text-text-muted text-center leading-tight truncate w-full">{labels[i]}</div>
        </div>
      ))}
    </div>
  );
};

// Calendar heatmap (last 4 weeks)
const HeatmapCell = ({ count }: { count: number }) => {
  const intensity = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;
  const colors = ['#E8F5E0', '#A8D5B5', '#4CAF78', '#1A8C52'];
  return (
    <div className="w-5 h-5 rounded-sm transition-colors" style={{ backgroundColor: colors[intensity] }}
      title={`${count} votes`} />
  );
};

// ─── Main Analytics component ─────────────────────────────────────────────────

export const Analytics = () => {
  const publicClient = usePublicClient();
  const { proposals, loading: proposalsLoading } = useProposals();
  const { spaces } = useSpaces();
  const [refreshing, setRefreshing] = useState(false);
  const [voteCastEvents, setVoteCastEvents] = useState<{ voter: string; proposalId: bigint; blockNumber: bigint; timestamp?: number }[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Fetch VoteCast events + resolve block timestamps for accurate charts
  // Block range limited to last 200k blocks (~28 days on Sepolia ~12s/block)
  // to avoid RPC "response too large" errors on production RPCs
  const BLOCKS_WINDOW = 200_000n;

  const fetchEvents = useCallback(async () => {
    if (!publicClient) return;
    setEventsLoading(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const fromBlock = latestBlock > BLOCKS_WINDOW ? latestBlock - BLOCKS_WINDOW : 0n;

      const logs = await publicClient.getLogs({
        address: SHADOWVOTE_ADDRESS,
        event: {
          name: 'VoteCast',
          type: 'event',
          inputs: [
            { name: 'proposalId', type: 'uint256', indexed: true },
            { name: 'voter', type: 'address', indexed: true },
          ],
        },
        fromBlock,
        toBlock: 'latest',
      });

      const rawEvents = logs.map(l => ({
        voter: (l.args as any).voter as string,
        proposalId: (l.args as any).proposalId as bigint,
        blockNumber: l.blockNumber!,
        timestamp: undefined as number | undefined,
      }));

      // Resolve timestamps: batch unique block numbers to minimize RPC calls
      const uniqueBlocks = [...new Set(rawEvents.map(e => e.blockNumber))];
      const blockTimestamps = new Map<bigint, number>();
      await Promise.all(
        uniqueBlocks.map(async (blockNumber) => {
          try {
            const block = await publicClient.getBlock({ blockNumber });
            blockTimestamps.set(blockNumber, Number(block.timestamp));
          } catch {
            // Non-critical: fall back to block-based estimate
          }
        })
      );

      setVoteCastEvents(rawEvents.map(e => ({
        ...e,
        timestamp: blockTimestamps.get(e.blockNumber),
      })));
    } catch (e) {
      console.error('Failed to fetch events:', e);
    } finally {
      setEventsLoading(false);
      setRefreshing(false);
    }
  }, [publicClient]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleRefresh = () => { setRefreshing(true); fetchEvents(); };

  // ─── Computed metrics ──────────────────────────────────────────────────────
  const totalProposals = proposals.length;
  const revealedProposals = proposals.filter(p => p.revealed).length;
  const activeProposals = proposals.filter(p => !p.revealed && p.deadline.getTime() > Date.now()).length;
  const totalVotes = voteCastEvents.length;

  const uniqueVoters = new Set(voteCastEvents.map(e => e.voter)).size;

  const proposalsWithQuorum = proposals.filter(p => p.revealed && p.voterCount >= p.quorum).length;

  // Weekly participation: bucket votes by real block timestamp (last 8 weeks)
  const weeklyVotes: number[] = new Array(8).fill(0);
  const nowSec = Math.floor(Date.now() / 1000);
  const weekSec = 7 * 24 * 3600;

  voteCastEvents.forEach(e => {
    if (e.timestamp !== undefined) {
      const ageSeconds = nowSec - e.timestamp;
      const weekIndex = Math.floor(ageSeconds / weekSec);
      if (weekIndex >= 0 && weekIndex < 8) {
        weeklyVotes[7 - weekIndex]++;
      }
    }
  });
  const participationLine = weeklyVotes;

  // Proposals by category
  const categoryCount: Record<number, number> = {};
  spaces.forEach(s => {
    proposals.filter(p => p.spaceId === s.id && p.spaceGated).forEach(() => {
      categoryCount[s.category] = (categoryCount[s.category] ?? 0) + 1;
    });
  });
  const categoryBars = CATEGORY_LABELS.map((_, i) => categoryCount[i] ?? 0);
  const topCategoryIndices = [...categoryBars.map((v, i) => ({ v, i }))]
    .sort((a, b) => b.v - a.v)
    .slice(0, 6);

  // Voter leaderboard (most votes cast)
  const voterTally: Record<string, number> = {};
  voteCastEvents.forEach(e => { voterTally[e.voter] = (voterTally[e.voter] ?? 0) + 1; });
  const topVoters = Object.entries(voterTally).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Heatmap: last 28 days grid (7 cols × 4 rows)
  const daySeconds = 86400;
  const heatmapData: number[] = new Array(28).fill(0);

  voteCastEvents.forEach(e => {
    if (e.timestamp !== undefined) {
      const ageSeconds = nowSec - e.timestamp;
      const dayIndex = Math.floor(ageSeconds / daySeconds);
      if (dayIndex >= 0 && dayIndex < 28) {
        heatmapData[27 - dayIndex]++;
      }
    }
  });

  const loading = proposalsLoading || eventsLoading;

  const PALETTE = ['#1A8C52', '#5B6DEC', '#E8A408', '#D93025', '#4CAF78', '#9CA89E'];

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">Analytics</h2>
                <Badge variant="success">Wave 4</Badge>
              </div>
              <p className="text-text-secondary">Governance insights from on-chain events — no backend</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Proposals', value: totalProposals, icon: BarChart3, color: 'text-primary-accent' },
              { label: 'Active Now', value: activeProposals, icon: VoteIcon, color: 'text-tertiary-accent' },
              { label: 'Total Votes Cast', value: totalVotes, icon: Users, color: 'text-warning' },
              { label: 'Unique Voters', value: uniqueVoters, icon: Award, color: 'text-primary-accent' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} hover={false} className="text-center space-y-2 py-5">
                <Icon className={cn('w-6 h-6 mx-auto', color)} />
                <div className="text-2xl font-extrabold">{loading ? '—' : value}</div>
                <div className="text-xs text-text-muted font-bold uppercase tracking-wide">{label}</div>
              </Card>
            ))}
          </div>

          {/* Participation line chart */}
          <Card hover={false} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-highlight rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary-accent" />
                </div>
                <div>
                  <h3 className="font-bold">Participation Rate</h3>
                  <p className="text-xs text-text-muted">Votes cast over 8-week rolling window</p>
                </div>
              </div>
              <Badge variant="default">{totalVotes} total votes</Badge>
            </div>
            <LineChart data={participationLine} color="#1A8C52" />
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>8 weeks ago</span>
              <span>This week</span>
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Quorum donut */}
            <Card hover={false} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-highlight rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-accent" />
                </div>
                <div>
                  <h3 className="font-bold">Quorum Achievement</h3>
                  <p className="text-xs text-text-muted">Proposals that reached quorum</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <DonutChart value={proposalsWithQuorum} total={Math.max(revealedProposals, 1)} />
                <div className="space-y-3 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Reached quorum</span>
                    <span className="font-bold text-primary-accent">{proposalsWithQuorum}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Total revealed</span>
                    <span className="font-bold">{revealedProposals}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Avg votes/proposal</span>
                    <span className="font-bold">{totalProposals > 0 ? (totalVotes / totalProposals).toFixed(1) : '0'}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Proposals by category */}
            <Card hover={false} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-highlight rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary-accent" />
                </div>
                <div>
                  <h3 className="font-bold">By Category</h3>
                  <p className="text-xs text-text-muted">Space proposals per category</p>
                </div>
              </div>
              <BarGroup
                bars={topCategoryIndices.map(c => c.v)}
                labels={topCategoryIndices.map(c => CATEGORY_LABELS[c.i])}
                colors={PALETTE}
              />
            </Card>
          </div>

          {/* Voter Heatmap */}
          <Card hover={false} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-highlight rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-accent" />
              </div>
              <div>
                <h3 className="font-bold">Vote Activity Heatmap</h3>
                <p className="text-xs text-text-muted">Daily voting frequency over last 4 weeks</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                  <div key={d} className="w-5 text-[9px] text-text-muted text-center">{d}</div>
                ))}
              </div>
              {[0, 1, 2, 3].map(week => (
                <div key={week} className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5, 6].map(day => (
                    <div key={day}><HeatmapCell count={heatmapData[week * 7 + day]} /></div>
                  ))}
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] text-text-muted">Less</span>
                {['#E8F5E0', '#A8D5B5', '#4CAF78', '#1A8C52'].map(c => (
                  <div key={c} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
                ))}
                <span className="text-[10px] text-text-muted">More</span>
              </div>
            </div>
          </Card>

          {/* Top Voters Leaderboard */}
          <Card hover={false} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-highlight rounded-xl flex items-center justify-center">
                <Award className="w-5 h-5 text-primary-accent" />
              </div>
              <div>
                <h3 className="font-bold">Top Voters</h3>
                <p className="text-xs text-text-muted">By total proposals participated in</p>
              </div>
            </div>

            {topVoters.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                No votes cast yet
              </div>
            ) : (
              <div className="space-y-3">
                {topVoters.map(([voter, count], i) => (
                  <div key={voter} className="flex items-center gap-4">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0',
                      i === 0 ? 'bg-yellow-100 text-yellow-600' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-surface-highlight text-text-muted'
                    )}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm font-bold truncate">{formatAddress(voter)}</div>
                      <div className="h-1.5 bg-surface-highlight rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-primary-accent rounded-full transition-all duration-700"
                          style={{ width: `${(count / topVoters[0][1]) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-bold shrink-0">{count} votes</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* FHE note */}
          <Card hover={false} className="p-4 bg-surface-highlight border-none flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary-accent shrink-0 mt-0.5" />
            <div className="text-xs text-primary-accent leading-relaxed">
              All analytics computed from public on-chain events (ProposalCreated, VoteCast, ResultsRevealed)
              via <code className="font-mono">getLogs</code> — no backend or indexer required.
              Individual vote choices are never exposed — only participation addresses are visible.
              Future: encrypted governance report uses FHE.add over ciphertext tallies.
            </div>
          </Card>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
