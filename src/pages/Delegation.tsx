import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, Lock, ArrowRight, Users, Shield, AlertCircle,
  CheckCircle2, ExternalLink, Trophy, RefreshCw, X, Zap, Loader2,
} from 'lucide-react';
import { Card, Badge, AppLayout, PageWrapper, Button } from '../components/UI';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import {
  SHADOWDELEGATE_ADDRESS, SHADOWDELEGATE_ABI, etherscanAddress, etherscanTx,
} from '../config/contract';
import { useCofhe } from '../hooks/useCofhe';
import { formatAddress, cn } from '../utils';

const DEPLOYED = true; // contracts deployed on Sepolia

type TopDelegate = { address: string; count: number };

export const Delegation = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [myDelegate, setMyDelegate] = useState<string | null>(null);
  const [myDelegators, setMyDelegators] = useState<string[]>([]);
  const [topDelegates, setTopDelegates] = useState<TopDelegate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [delegateTo, setDelegateTo] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'delegate' | 'leaderboard' | 'my'>('my');
  const [encrypting, setEncrypting] = useState(false);

  const { encrypt, getEncryptable, isInitialized, isLoading: cofheLoading, initialize } = useCofhe();

  const fetchData = useCallback(async () => {
    if (!publicClient || !address || !DEPLOYED) return;
    setDataLoading(true);
    try {
      const [delegate, delegators, topResult] = await Promise.all([
        publicClient.readContract({
          address: SHADOWDELEGATE_ADDRESS,
          abi: SHADOWDELEGATE_ABI,
          functionName: 'getDelegateOf',
          args: [address],
        } as any) as Promise<string>,
        publicClient.readContract({
          address: SHADOWDELEGATE_ADDRESS,
          abi: SHADOWDELEGATE_ABI,
          functionName: 'getDelegators',
          args: [address],
        } as any) as Promise<string[]>,
        publicClient.readContract({
          address: SHADOWDELEGATE_ADDRESS,
          abi: SHADOWDELEGATE_ABI,
          functionName: 'getTopDelegates',
          args: [10],
        } as any) as Promise<[string[], bigint[]]>,
      ]);
      setMyDelegate(delegate === '0x0000000000000000000000000000000000000000' ? null : delegate);
      setMyDelegators(delegators);
      setTopDelegates(
        topResult[0].map((addr, i) => ({ address: addr, count: Number(topResult[1][i]) })).filter(d => d.count > 0)
      );
    } catch (e) {
      console.error('Failed to fetch delegation data:', e);
    } finally {
      setDataLoading(false);
    }
  }, [publicClient, address]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Encrypt voting power = 1 (standard power per voter) using CoFHE SDK
  // For weighted proposals, admin sets power via ShadowVoteV2.setVotingPower()
  // For delegation, we encrypt 1 as the contribution to the delegate's pool
  const encryptPower = async (): Promise<{ ctHash: bigint; securityZone: number; utype: number; signature: `0x${string}` }> => {
    if (!isInitialized) await initialize();
    const Encryptable = getEncryptable();
    if (!Encryptable) throw new Error('CoFHE SDK not ready — refresh the page');
    const [encrypted] = await encrypt([Encryptable.uint32(1)]);
    return encrypted as any;
  };

  const handleDelegate = async () => {
    if (!walletClient || !delegateTo || !publicClient) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(delegateTo)) {
      setError('Invalid Ethereum address');
      return;
    }
    setEncrypting(true);
    setError(null);
    try {
      // Step 1: encrypt voting power via CoFHE SDK
      const power = await encryptPower();
      setEncrypting(false);
      setLoading(true);

      // Step 2: submit delegation on-chain
      const hash = await walletClient.writeContract({
        address: SHADOWDELEGATE_ADDRESS,
        abi: SHADOWDELEGATE_ABI,
        functionName: 'delegate',
        args: [delegateTo as `0x${string}`, power],
      } as any);
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setDelegateTo('');
      await fetchData();
    } catch (e: any) {
      setError(e.shortMessage ?? e.message);
      setEncrypting(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUndelegate = async () => {
    if (!walletClient || !publicClient) return;
    setEncrypting(true);
    setError(null);
    try {
      // Encrypt power = 1 (same value as when delegated, for symmetric subtraction)
      const power = await encryptPower();
      setEncrypting(false);
      setLoading(true);

      const hash = await walletClient.writeContract({
        address: SHADOWDELEGATE_ADDRESS,
        abi: SHADOWDELEGATE_ABI,
        functionName: 'undelegate',
        args: [power],
      } as any);
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await fetchData();
    } catch (e: any) {
      setError(e.shortMessage ?? e.message);
      setEncrypting(false);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-input border border-default bg-bg-base text-sm font-mono font-medium focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-colors';

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">Delegation</h2>
              <Badge variant="success">Wave 4</Badge>
              {DEPLOYED && <Badge variant="default">Live</Badge>}
            </div>
            <p className="text-text-secondary">Delegate your voting power while preserving vote privacy</p>
          </div>

          {!DEPLOYED && (
            <div className="p-4 bg-warning/10 rounded-xl border border-warning/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-warning">ShadowDelegate not deployed yet</p>
                <p className="text-xs text-text-secondary">
                  Run <code className="font-mono bg-surface-tinted px-1 rounded">npm run deploy:delegate</code> then update <code className="font-mono bg-surface-tinted px-1 rounded">SHADOWDELEGATE_ADDRESS</code> in contract.ts
                </p>
              </div>
            </div>
          )}

          {/* Status Banner */}
          {DEPLOYED && isConnected && (
            <Card accent hover={false} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-[#1A3A20]/60 uppercase font-bold tracking-widest">Your Status</div>
                  {myDelegate ? (
                    <>
                      <div className="text-lg font-bold text-[#1A3A20]">Delegating to</div>
                      <div className="font-mono text-sm text-[#1A3A20]/80">{myDelegate}</div>
                    </>
                  ) : (
                    <div className="text-lg font-bold text-[#1A3A20]">Not delegating</div>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs text-[#1A3A20]/60 uppercase font-bold tracking-widest">Your Delegators</div>
                  <div className="text-2xl font-extrabold text-[#1A3A20]">{myDelegators.length}</div>
                </div>
              </div>
              {myDelegate && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUndelegate}
                  disabled={loading || encrypting}
                  className="mt-4 bg-white/40 border-white/20 text-[#1A3A20] hover:bg-white/60"
                >
                  {encrypting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                  {encrypting ? 'Encrypting...' : 'Undelegate'}
                </Button>
              )}
            </Card>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface-tinted rounded-xl">
            {(['my', 'delegate', 'leaderboard'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-2.5 rounded-input text-sm font-bold transition-all',
                  activeTab === tab ? 'bg-white shadow-card text-text-primary' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {tab === 'my' ? '👤 My Status' : tab === 'delegate' ? '🤝 Delegate' : '🏆 Leaderboard'}
              </button>
            ))}
          </div>

          {/* My Status Tab */}
          {activeTab === 'my' && (
            <div className="space-y-4">
              {/* My Delegators */}
              <Card hover={false} className="space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary-accent" />
                  <h3 className="font-bold">Delegating to Me ({myDelegators.length})</h3>
                  <Button variant="ghost" size="sm" className="ml-auto p-2 h-auto" onClick={fetchData}>
                    <RefreshCw className={cn('w-4 h-4', dataLoading && 'animate-spin')} />
                  </Button>
                </div>
                {myDelegators.length === 0 ? (
                  <div className="text-center py-6 text-text-muted text-sm">Nobody has delegated to you yet</div>
                ) : (
                  <div className="space-y-2">
                    {myDelegators.map(addr => (
                      <div key={addr} className="flex items-center justify-between p-3 bg-bg-base rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-surface-highlight rounded-full flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-primary-accent" />
                          </div>
                          <div className="font-mono text-sm">{formatAddress(addr)}</div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary-accent font-bold">
                          <Lock className="w-3 h-3" />
                          Power: encrypted
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* FHE explanation */}
              <Card hover={false} className="p-4 bg-surface-highlight border-none space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-primary-accent">
                  <Lock className="w-4 h-4" />
                  How FHE Delegation Works
                </div>
                <div className="space-y-2 text-xs text-text-secondary leading-relaxed">
                  {[
                    { op: 'FHE.add(delegatePower, myPower)', desc: 'Aggregate delegator power into delegate\'s encrypted pool' },
                    { op: 'FHE.select(solvent, FHE.sub(pool, myPower), zero)', desc: 'Safe undelegate — zeroes out contribution' },
                    { op: 'FHE.mul(vote, delegatedPower)', desc: 'Weighted vote in ShadowVoteV2 using accumulated power' },
                    { op: 'FHE.allowSender(pool)', desc: 'Delegate can decrypt their own aggregate power via permit' },
                  ].map(({ op, desc }) => (
                    <div key={op} className="flex items-start gap-2">
                      <code className="font-mono text-tertiary-accent shrink-0">{op}</code>
                      <span className="text-text-muted">— {desc}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Delegate Tab */}
          {activeTab === 'delegate' && (
            <Card hover={false} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-xl flex items-center justify-center">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Delegate Your Vote</h3>
                  <p className="text-xs text-text-muted">Transfer voting power — delegation is public, amounts are encrypted</p>
                </div>
              </div>

              {myDelegate && (
                <div className="p-3 bg-warning/10 rounded-xl border border-warning/20 flex gap-2 text-xs text-warning">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  You are already delegating to {formatAddress(myDelegate)}. Undelegate first to change.
                </div>
              )}

              <div className="space-y-3">
                <label className="text-sm font-bold">Delegate Address</label>
                <input
                  className={inputClass}
                  type="text"
                  placeholder="0x..."
                  value={delegateTo}
                  onChange={e => setDelegateTo(e.target.value)}
                  disabled={!!myDelegate}
                />
              </div>

              {/* Quick pick from leaderboard */}
              {topDelegates.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-text-muted font-bold">Quick pick from top delegates:</div>
                  <div className="flex flex-wrap gap-2">
                    {topDelegates.slice(0, 4).map(d => (
                      <button
                        key={d.address}
                        onClick={() => setDelegateTo(d.address)}
                        className="px-3 py-1.5 bg-surface-highlight text-xs font-mono rounded-badge hover:bg-surface-tinted transition-colors"
                        disabled={!!myDelegate}
                      >
                        {formatAddress(d.address)} ({d.count})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-surface-highlight rounded-xl flex items-start gap-2 text-xs text-text-secondary">
                <Zap className="w-4 h-4 text-primary-accent shrink-0" />
                <span>
                  Your voting power is encrypted via CoFHE SDK before submission.
                  The delegate votes on your behalf — their ballot remains FHE-encrypted.
                  You can undelegate at any time.
                </span>
              </div>

              {/* CoFHE SDK status */}
              {cofheLoading && (
                <div className="flex items-center gap-2 text-xs text-text-muted p-3 bg-surface-highlight rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Initializing FHE engine...
                </div>
              )}
              {encrypting && (
                <div className="flex items-center gap-2 text-xs text-tertiary-accent p-3 bg-[#EDEFFD] rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Encrypting voting power via CoFHE SDK...
                </div>
              )}

              <Button
                variant="accent"
                className="w-full"
                disabled={!delegateTo || loading || encrypting || !DEPLOYED || !isConnected || !!myDelegate || cofheLoading}
                onClick={handleDelegate}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {encrypting ? 'Encrypting power...' : loading ? 'Delegating...' : 'Delegate Voting Power'}
              </Button>

              {myDelegate && (
                <Button
                  variant="outline"
                  className="w-full border-danger/20 text-danger hover:bg-danger/5"
                  disabled={loading || encrypting || !DEPLOYED || !isConnected}
                  onClick={handleUndelegate}
                >
                  <X className="w-4 h-4 mr-2" />
                  {encrypting ? 'Encrypting...' : loading ? 'Undelegating...' : 'Undelegate'}
                </Button>
              )}
            </Card>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <Card hover={false} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Top Delegates</h3>
                  <p className="text-xs text-text-muted">Ranked by delegation count — voting power amounts are hidden</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto p-2 h-auto" onClick={fetchData}>
                  <RefreshCw className={cn('w-4 h-4', dataLoading && 'animate-spin')} />
                </Button>
              </div>

              {topDelegates.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <Trophy className="w-10 h-10 mx-auto text-text-muted opacity-30" />
                  <p className="text-text-muted text-sm">
                    {DEPLOYED ? 'No delegates yet — be the first!' : 'Deploy contract to see leaderboard'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topDelegates.map((d, i) => (
                    <div key={d.address} className="flex items-center gap-4 p-3 bg-bg-base rounded-xl">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0',
                        i === 0 ? 'bg-yellow-100 text-yellow-600' :
                        i === 1 ? 'bg-gray-100 text-gray-500' :
                        i === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-surface-highlight text-text-muted'
                      )}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-bold">{formatAddress(d.address)}</div>
                        <div className="h-1.5 bg-surface-highlight rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-primary-accent rounded-full transition-all duration-700"
                            style={{ width: `${topDelegates[0].count > 0 ? (d.count / topDelegates[0].count) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold">{d.count}</div>
                        <div className="text-xs text-text-muted">delegators</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Lock className="w-3 h-3" />
                        <span>power hidden</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-surface-highlight rounded-xl flex items-start gap-2 text-xs text-text-secondary">
                <Shield className="w-4 h-4 text-primary-accent shrink-0" />
                Leaderboard shows delegation count (public) — not voting power amounts (encrypted).
                Only the delegate can view their aggregated power via FHE permit.
              </div>
            </Card>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-danger/5 rounded-xl border border-danger/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-danger shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {/* Tx hash */}
          {txHash && (
            <div className="p-4 bg-surface-highlight rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary-accent shrink-0" />
              <div className="space-y-0.5">
                <div className="text-sm font-bold">Transaction confirmed</div>
                <a href={etherscanTx(txHash)} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-mono text-text-muted hover:text-text-primary flex items-center gap-1">
                  {txHash.slice(0, 20)}... <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

        </div>
      </PageWrapper>
    </AppLayout>
  );
};
