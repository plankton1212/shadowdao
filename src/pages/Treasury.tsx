import React, { useState, useEffect } from 'react';
import {
  Database, Lock, AlertCircle, Wallet, Send, ArrowUpRight,
  ArrowDownLeft, CheckCircle2, Clock, ShieldCheck, Zap, ExternalLink,
  Loader2,
} from 'lucide-react';
import { Card, Badge, AppLayout, PageWrapper, Button } from '../components/UI';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData, decodeFunctionResult } from 'viem';
import {
  SHADOWTREASURY_ADDRESS, SHADOWVOTEV2_ADDRESS,
  SHADOWTREASURY_ABI, etherscanAddress, etherscanTx,
} from '../config/contract';
import { useCofhe } from '../hooks/useCofhe';
import { cn } from '../utils';

const DEPLOYED = true; // contracts deployed on Sepolia

type Allocation = {
  id: number;
  proposalId: bigint;
  amountWei: bigint;
  recipient: string;
  executed: boolean;
  cancelled: boolean;
};

const FheStep = ({ label, active, done }: { label: string; active: boolean; done: boolean }) => (
  <div className={cn(
    'flex items-center gap-2 px-3 py-1.5 rounded-badge text-xs font-mono font-bold transition-all',
    done ? 'bg-primary-accent/10 text-primary-accent' :
    active ? 'bg-tertiary-accent/10 text-tertiary-accent animate-pulse' :
    'bg-surface-highlight text-text-muted'
  )}>
    {done ? <CheckCircle2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
    {label}
  </div>
);

export const Treasury = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [ethBalance, setEthBalance] = useState<bigint>(0n);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [allocationCount, setAllocationCount] = useState(0);

  // Forms
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawTo, setWithdrawTo] = useState('');
  const [allocProposal, setAllocProposal] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocRecipient, setAllocRecipient] = useState('');

  // FHE reveal state
  const [revealSteps, setRevealSteps] = useState<string[]>([]);
  const [revealedBalance, setRevealedBalance] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'allocate'>('deposit');

  const { encrypt, decrypt, getOrCreateSelfPermit, initialize, isInitialized, isLoading: cofheLoading } = useCofhe();

  useEffect(() => {
    if (!DEPLOYED || !publicClient) return;
    fetchData();
  }, [publicClient]);

  const fetchData = async () => {
    if (!publicClient) return;
    try {
      const [balance, count] = await Promise.all([
        publicClient.readContract({
          address: SHADOWTREASURY_ADDRESS,
          abi: SHADOWTREASURY_ABI,
          functionName: 'getEthBalance',
        } as any) as Promise<bigint>,
        publicClient.readContract({
          address: SHADOWTREASURY_ADDRESS,
          abi: SHADOWTREASURY_ABI,
          functionName: 'allocationCount',
        } as any) as Promise<bigint>,
      ]);
      setEthBalance(balance);
      setAllocationCount(Number(count));

      const allocs: Allocation[] = [];
      for (let i = 0; i < Number(count); i++) {
        const a = await publicClient.readContract({
          address: SHADOWTREASURY_ADDRESS,
          abi: SHADOWTREASURY_ABI,
          functionName: 'getAllocation',
          args: [BigInt(i)],
        } as any) as [bigint, bigint, string, boolean, boolean];
        allocs.push({
          id: i,
          proposalId: a[0],
          amountWei: a[1],
          recipient: a[2],
          executed: a[3],
          cancelled: a[4],
        });
      }
      setAllocations(allocs);
    } catch (e) {
      console.error('Failed to fetch treasury data:', e);
    }
  };

  const handleDeposit = async () => {
    if (!walletClient || !depositAmount || !publicClient) return;
    setLoading(true);
    setError(null);
    try {
      const hash = await walletClient.writeContract({
        address: SHADOWTREASURY_ADDRESS,
        abi: SHADOWTREASURY_ABI,
        functionName: 'deposit',
        value: parseEther(depositAmount),
      } as any);
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setDepositAmount('');
      await fetchData();
    } catch (e: any) {
      setError(e.shortMessage ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!walletClient || !withdrawAmount || !withdrawTo || !publicClient) return;
    setLoading(true);
    setError(null);
    try {
      const hash = await walletClient.writeContract({
        address: SHADOWTREASURY_ADDRESS,
        abi: SHADOWTREASURY_ABI,
        functionName: 'withdraw',
        args: [parseEther(withdrawAmount), withdrawTo as `0x${string}`],
      } as any);
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setWithdrawAmount('');
      setWithdrawTo('');
      await fetchData();
    } catch (e: any) {
      setError(e.shortMessage ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProposeAllocation = async () => {
    if (!walletClient || !allocProposal || !allocAmount || !allocRecipient || !publicClient) return;
    setLoading(true);
    setError(null);
    try {
      const hash = await walletClient.writeContract({
        address: SHADOWTREASURY_ADDRESS,
        abi: SHADOWTREASURY_ABI,
        functionName: 'proposeAllocation',
        args: [BigInt(allocProposal), parseEther(allocAmount), allocRecipient as `0x${string}`],
      } as any);
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      setAllocProposal('');
      setAllocAmount('');
      setAllocRecipient('');
      await fetchData();
    } catch (e: any) {
      setError(e.shortMessage ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAllocation = async (id: number) => {
    if (!walletClient || !publicClient) return;
    setLoading(true);
    setError(null);
    try {
      const hash = await walletClient.writeContract({
        address: SHADOWTREASURY_ADDRESS,
        abi: SHADOWTREASURY_ABI,
        functionName: 'executeAllocation',
        args: [BigInt(id)],
      } as any);
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await fetchData();
    } catch (e: any) {
      setError(e.shortMessage ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const REVEAL_STEPS = [
    'getTreasuryBalance() tx',
    'FHE.allowSender(balance)',
    'EIP-712 permit',
    'decryptForView(euint32)',
  ];

  const pushStep = (step: string) => setRevealSteps(prev => [...prev, step]);

  const handleRevealBalance = async () => {
    if (!walletClient || !publicClient || !address) return;
    setRevealSteps([]);
    setRevealedBalance(null);
    setDecrypting(true);
    setError(null);
    try {
      // Step 1: Simulate getTreasuryBalance() to get the FHE handle (ctHash)
      // This is a dry-run that returns the euint32 handle without mining a tx
      const callData = encodeFunctionData({
        abi: SHADOWTREASURY_ABI,
        functionName: 'getTreasuryBalance',
      });
      const rawResult = await publicClient.call({
        to: SHADOWTREASURY_ADDRESS,
        data: callData,
        account: address,
      });
      const ctHash = rawResult.data
        ? (decodeFunctionResult({
            abi: SHADOWTREASURY_ABI,
            functionName: 'getTreasuryBalance',
            data: rawResult.data,
          }) as bigint)
        : null;

      // Step 2: Mine the real tx — this sets FHE.allowSender so we can decrypt
      pushStep(REVEAL_STEPS[0]);
      const hash = await walletClient.writeContract({
        address: SHADOWTREASURY_ADDRESS,
        abi: SHADOWTREASURY_ABI,
        functionName: 'getTreasuryBalance',
      } as any);
      await publicClient.waitForTransactionReceipt({ hash });
      pushStep(REVEAL_STEPS[1]);

      if (!ctHash) throw new Error('Could not read FHE handle from contract');

      // Step 3: Initialize CoFHE SDK if needed
      if (!isInitialized) await initialize();

      // Step 4: Create EIP-712 permit (user signs)
      pushStep(REVEAL_STEPS[2]);
      await getOrCreateSelfPermit();

      // Step 5: Decrypt the euint32 balance
      pushStep(REVEAL_STEPS[3]);
      const { FheTypes } = await import('@cofhe/sdk');
      const result = await decrypt(ctHash, FheTypes.Uint32);
      const decryptedUnits = Number(result.decryptedValue ?? result ?? 0);

      // Convert units back to ETH (1 unit = 0.001 ETH = 1e15 wei)
      const UNIT = 1_000_000_000_000_000n; // 1e15
      const balanceWei = BigInt(decryptedUnits) * UNIT;
      setRevealedBalance(formatEther(balanceWei));
    } catch (e: any) {
      setError('Decrypt failed: ' + (e.shortMessage ?? e.message));
    } finally {
      setDecrypting(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-input border border-default bg-bg-base text-sm font-medium focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-colors';

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">Treasury</h2>
              <Badge variant="success">Wave 3</Badge>
              {DEPLOYED && <Badge variant="default">Live</Badge>}
            </div>
            <p className="text-text-secondary">DAO assets with FHE-encrypted balance — invisible on Etherscan</p>
          </div>

          {!DEPLOYED && (
            <div className="p-4 bg-warning/10 rounded-xl border border-warning/20 flex gap-3">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-warning">ShadowTreasury not deployed yet</p>
                <p className="text-xs text-text-secondary">Run <code className="font-mono bg-surface-tinted px-1 rounded">npm run deploy:treasury</code> then update <code className="font-mono bg-surface-tinted px-1 rounded">SHADOWTREASURY_ADDRESS</code> in contract.ts</p>
              </div>
            </div>
          )}

          {/* Balance Card */}
          <Card accent hover={false} className="p-8 relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-[#1A3A20]/60 uppercase font-bold tracking-widest">Treasury Balance</div>
                  <div className="flex items-center gap-3">
                    {revealedBalance !== null ? (
                      <div className="text-4xl font-extrabold text-[#1A3A20]">{revealedBalance} ETH</div>
                    ) : (
                      <div className="text-4xl font-extrabold text-[#1A3A20] font-mono tracking-wider">
                        ████████
                      </div>
                    )}
                    <Lock className="w-5 h-5 text-[#1A3A20]/40" />
                  </div>
                  <div className="text-xs text-[#1A3A20]/60">
                    {DEPLOYED ? `Encrypted on-chain via euint32 — FHE.allowSender permit required` : 'Not deployed'}
                  </div>
                </div>
                <Database className="w-10 h-10 text-[#1A3A20]/30" />
              </div>

              {/* FHE Steps */}
              {revealSteps.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(['FHE.allowSender(balance)', 'EIP-712 permit', 'decryptForView()', 'Decrypting...'] as string[]).map((step, i) => (
                    <div key={step}>
                      <FheStep
                        label={step}
                        active={revealSteps.length === i + 1}
                        done={revealSteps.length > i + 1 || (revealSteps.length === i + 1 && revealedBalance !== null)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRevealBalance}
                  disabled={!DEPLOYED || !isConnected || decrypting || cofheLoading}
                  className="bg-white/40 border-white/20 text-[#1A3A20] hover:bg-white/60"
                >
                  {decrypting
                    ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    : <Lock className="w-4 h-4 mr-2" />
                  }
                  {decrypting ? 'Decrypting...' : revealedBalance !== null ? 'Refresh Decrypt' : 'Decrypt Balance'}
                </Button>
                {DEPLOYED && (
                  <a href={etherscanAddress(SHADOWTREASURY_ADDRESS)} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" size="sm" className="bg-white/40 border-white/20 text-[#1A3A20] hover:bg-white/60">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Etherscan
                    </Button>
                  </a>
                )}
              </div>

              <div className="text-xs text-[#1A3A20]/50 font-mono">
                Actual ETH in contract (public): {formatEther(ethBalance)} ETH
              </div>
            </div>
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </Card>

          {/* Action Tabs */}
          <div className="flex gap-1 p-1 bg-surface-tinted rounded-xl">
            {(['deposit', 'withdraw', 'allocate'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-2.5 rounded-input text-sm font-bold capitalize transition-all',
                  activeTab === tab ? 'bg-white shadow-card text-text-primary' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {tab === 'deposit' ? '↓ Deposit' : tab === 'withdraw' ? '↑ Withdraw' : '📋 Allocate'}
              </button>
            ))}
          </div>

          {/* Deposit Form */}
          {activeTab === 'deposit' && (
            <Card hover={false} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-xl flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Deposit ETH</h3>
                  <p className="text-xs text-text-muted">FHE.add updates encrypted balance — Etherscan shows no amount</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold">Amount (ETH)</label>
                <input
                  className={inputClass}
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.01"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                />
                <div className="flex gap-2">
                  {['0.01', '0.05', '0.1', '0.5'].map(v => (
                    <button key={v} onClick={() => setDepositAmount(v)}
                      className="px-3 py-1.5 bg-surface-highlight text-xs font-bold rounded-badge hover:bg-surface-tinted transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-surface-highlight rounded-xl flex items-center gap-2 text-xs text-primary-accent">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                FHE.add(encryptedBalance, FHE.asEuint32(amount)) — balance grows on ciphertext
              </div>

              <Button
                variant="accent"
                className="w-full"
                disabled={!depositAmount || loading || !DEPLOYED || !isConnected}
                onClick={handleDeposit}
              >
                {loading ? 'Depositing...' : `Deposit ${depositAmount || '0'} ETH`}
              </Button>
            </Card>
          )}

          {/* Withdraw Form */}
          {activeTab === 'withdraw' && (
            <Card hover={false} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-xl flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Withdraw ETH</h3>
                  <p className="text-xs text-text-muted">FHE.gte solvency check + FHE.select safe subtraction</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold">Amount (ETH)</label>
                  <input className={cn(inputClass, 'mt-2')} type="number" step="0.001" placeholder="0.01"
                    value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-bold">Recipient Address</label>
                  <input className={cn(inputClass, 'mt-2 font-mono')} type="text" placeholder="0x..."
                    value={withdrawTo} onChange={e => setWithdrawTo(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-surface-highlight rounded-xl flex items-center gap-2 text-xs text-primary-accent">
                  <Zap className="w-4 h-4 shrink-0" />
                  FHE.gte(balance, amount) → encrypted solvency check
                </div>
                <div className="p-3 bg-surface-highlight rounded-xl flex items-center gap-2 text-xs text-primary-accent">
                  <Lock className="w-4 h-4 shrink-0" />
                  FHE.select(solvent, FHE.sub(balance, amount), balance) → safe subtract
                </div>
              </div>

              <Button variant="outline" className="w-full border-danger/20 text-danger hover:bg-danger/5"
                disabled={!withdrawAmount || !withdrawTo || loading || !DEPLOYED || !isConnected}
                onClick={handleWithdraw}>
                {loading ? 'Withdrawing...' : `Withdraw ${withdrawAmount || '0'} ETH`}
              </Button>
            </Card>
          )}

          {/* Allocate Form */}
          {activeTab === 'allocate' && (
            <Card hover={false} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-xl flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Propose Budget Allocation</h3>
                  <p className="text-xs text-text-muted">Link an encrypted budget to a ShadowVote proposal</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold">Proposal ID</label>
                  <input className={cn(inputClass, 'mt-2')} type="number" placeholder="0"
                    value={allocProposal} onChange={e => setAllocProposal(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-bold">Allocation Amount (ETH)</label>
                  <input className={cn(inputClass, 'mt-2')} type="number" step="0.001" placeholder="0.1"
                    value={allocAmount} onChange={e => setAllocAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-bold">Recipient Address</label>
                  <input className={cn(inputClass, 'mt-2 font-mono')} type="text" placeholder="0x..."
                    value={allocRecipient} onChange={e => setAllocRecipient(e.target.value)} />
                </div>
              </div>

              <div className="p-3 bg-surface-highlight rounded-xl flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
                <AlertCircle className="w-4 h-4 text-primary-accent shrink-0 mt-0.5" />
                Allocation executes automatically when: proposal deadline passed + results revealed + quorum met.
                FHE.sub updates encrypted balance on execution.
              </div>

              <Button variant="accent" className="w-full"
                disabled={!allocProposal || !allocAmount || !allocRecipient || loading || !DEPLOYED || !isConnected}
                onClick={handleProposeAllocation}>
                {loading ? 'Proposing...' : 'Propose Allocation'}
              </Button>
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

          {/* Allocations List */}
          {DEPLOYED && allocations.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Allocations</h3>
              {allocations.map((a) => (
                <Card key={a.id} hover={false} className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">Allocation #{a.id}</span>
                        <Badge variant={a.executed ? 'success' : a.cancelled ? 'warning' : 'info'}>
                          {a.executed ? 'Executed' : a.cancelled ? 'Cancelled' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="text-xs text-text-muted font-mono">Proposal #{a.proposalId.toString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatEther(a.amountWei)} ETH</div>
                      <div className="text-xs text-text-muted font-mono">{a.recipient.slice(0, 12)}...</div>
                    </div>
                  </div>

                  {!a.executed && !a.cancelled && (
                    <Button variant="accent" size="sm" onClick={() => handleExecuteAllocation(a.id)}
                      disabled={loading || !isConnected}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Execute Allocation
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* FHE Operations Reference */}
          <Card hover={false} className="space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary-accent" />
              <h3 className="font-bold">FHE Operations in This Contract</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { op: 'FHE.asEuint32(amount)', desc: 'Convert deposit units to encrypted type' },
                { op: 'FHE.add(balance, units)', desc: 'Homomorphic addition — balance grows on ciphertext' },
                { op: 'FHE.gte(balance, amount)', desc: 'Encrypted solvency check on withdraw' },
                { op: 'FHE.select(solvent, sub, balance)', desc: 'Conditional subtraction — no-op if insolvent' },
                { op: 'FHE.sub(balance, units)', desc: 'Subtract allocation from encrypted balance' },
                { op: 'FHE.allowSender(balance)', desc: 'Grant caller FHE permit to decrypt their own balance view' },
              ].map(({ op, desc }) => (
                <div key={op} className="flex items-start gap-3 p-3 bg-surface-highlight rounded-xl">
                  <code className="text-xs font-mono text-tertiary-accent shrink-0">{op}</code>
                  <span className="text-xs text-text-secondary">{desc}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </PageWrapper>
    </AppLayout>
  );
};
