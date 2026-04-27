import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Shield,
  Lock,
  CheckCircle2,
  Users,
  Vote as VoteIcon,
  ExternalLink,
  Copy,
  AlertCircle,
  Loader2,
  Crown,
  XCircle,
  Clock,
  CalendarPlus,
  Eye,
  Download,
  MessageSquare,
  Send,
  Zap,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, StatusBadge, AppLayout, PageWrapper, Button, QuorumBar, Confetti, FheBadge, CategoryEmoji } from '../components/UI';
import { useAccount } from 'wagmi';
import { useProposals } from '../hooks/useProposals';
import { useVote } from '../hooks/useVote';
import { useGaslessVote } from '../hooks/useGaslessVote';
import { useReveal } from '../hooks/useReveal';
import { useProposalAdmin } from '../hooks/useProposalAdmin';
import { useVerifyVote } from '../hooks/useVerifyVote';
import { useSpaces } from '../hooks/useSpaces';
import { etherscanTx, SHADOWVOTE_ADDRESS, SHADOWVOTEV2_ADDRESS, SHADOWVOTEV2_ABI } from '../config/contract';
import { usePublicClient, useWalletClient, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { cn, formatAddress } from '../utils';

function useCountdown(deadline: Date) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);
  return timeLeft;
}

export const ProposalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { proposals, loading, checkHasVoted, refetch } = useProposals();
  const { castVote, voteState, txHash, error: voteError, reset: resetVote } = useVote();
  const { gaslessVote, state: gaslessState, txHash: gaslessTxHash, error: gaslessError, reset: resetGasless } = useGaslessVote();
  const { revealResults, fetchDecryptedResults, clearDecryptError, isRevealing, results, error: revealError, isPermitError: revealPermitError } = useReveal();
  const { cancelProposal, extendDeadline, isLoading: adminLoading, error: adminError } = useProposalAdmin();
  const { verifyMyVote, verifiedOption, isVerifying, error: verifyError, isPermitError: verifyPermitError, reset: resetVerify } = useVerifyVote();
  const { spaces, checkIsMember } = useSpaces();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [checkingVote, setCheckingVote] = useState(true);
  const [isSpaceMember, setIsSpaceMember] = useState<boolean | null>(null);
  const [showExtend, setShowExtend] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const isVotingRef = useRef(false); // synchronous guard against double-click
  const [showConfetti, setShowConfetti] = useState(false);
  const [useGasless, setUseGasless] = useState(false);

  // Validate URL param before BigInt conversion — BigInt('abc') throws SyntaxError
  const proposalId: bigint | null = (() => {
    try { return id ? BigInt(id) : null; } catch { return null; }
  })();
  const proposal = proposalId !== null ? proposals.find((p) => p.id === proposalId) : undefined;

  // Reset verify state when navigating between proposals
  useEffect(() => { resetVerify(); }, [proposalId]); // eslint-disable-line react-hooks/exhaustive-deps
  const countdown = useCountdown(proposal?.deadline || new Date());

  // Check if user has voted + space membership
  useEffect(() => {
    const check = async () => {
      if (!proposal || proposalId === null) return;
      try {
        setCheckingVote(true);
        const [voted, memberStatus] = await Promise.all([
          checkHasVoted(proposalId),
          proposal.spaceGated ? checkIsMember(proposal.spaceId) : Promise.resolve(null),
        ]);
        setHasVoted(voted);
        setIsSpaceMember(memberStatus);
      } catch (err) {
        console.warn('[ShadowDAO] Failed to check vote status:', err);
      } finally {
        setCheckingVote(false);
      }
    };
    check();
  }, [proposal, proposalId, checkHasVoted, checkIsMember]);

  // Fetch decrypted results if revealed
  useEffect(() => {
    if (proposal?.revealed && results.length === 0 && proposalId !== null) {
      fetchDecryptedResults(proposalId, proposal.optionCount);
    }
  }, [proposal?.revealed, proposalId, proposal?.optionCount, fetchDecryptedResults, results.length]);

  // Invalid URL param (non-numeric) — show 404 immediately
  if (proposalId === null) {
    return (
      <AppLayout>
        <PageWrapper>
          <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
            <h2 className="text-2xl font-bold">Invalid proposal ID</h2>
            <p className="text-text-secondary">The URL contains an invalid proposal identifier.</p>
            <Button variant="outline" onClick={() => navigate('/app/proposals')}>
              Back to Proposals
            </Button>
          </div>
        </PageWrapper>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <PageWrapper>
          <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading proposal...
          </div>
        </PageWrapper>
      </AppLayout>
    );
  }

  if (!proposal) {
    return (
      <AppLayout>
        <PageWrapper>
          <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
            <h2 className="text-2xl font-bold">Proposal not found</h2>
            <p className="text-text-secondary">This proposal may not exist on the contract yet.</p>
            <Button variant="outline" onClick={() => navigate('/app/proposals')}>
              Back to Proposals
            </Button>
          </div>
        </PageWrapper>
      </AppLayout>
    );
  }

  const handleVote = async () => {
    // isVotingRef is a synchronous guard; isVoting state guard only kicks in after re-render
    if (selectedOption === null || isVotingRef.current) return;
    isVotingRef.current = true;
    setIsVoting(true);
    try {
      const success = await castVote(proposalId!, selectedOption);
      if (success) {
        setHasVoted(true);
        setShowConfetti(true);
        await refetch();
      }
    } finally {
      isVotingRef.current = false;
      setIsVoting(false);
    }
  };

  const handleGaslessVote = async () => {
    if (selectedOption === null || isVotingRef.current) return;
    isVotingRef.current = true;
    setIsVoting(true);
    try {
      const success = await gaslessVote(proposalId!, selectedOption);
      if (success) {
        setHasVoted(true);
        setShowConfetti(true);
        await refetch();
      }
    } finally {
      isVotingRef.current = false;
      setIsVoting(false);
    }
  };

  const handleReveal = async () => {
    await revealResults(proposalId);
    // Refetch proposals to update revealed status, then decrypt
    await refetch();
    if (proposal) {
      await fetchDecryptedResults(proposalId, proposal.optionCount);
    }
  };

  const isCreator = address?.toLowerCase() === proposal.creator.toLowerCase();
  const spaceInfo = proposal.spaceGated ? spaces.find((s) => s.id === proposal.spaceId) : null;
  const blockedBySpace = proposal.spaceGated && isSpaceMember === false;
  const canVote = proposal.status === 'VOTING' && !hasVoted && !checkingVote && voteState === 'idle' && !blockedBySpace;
  const optionLabels = Array.from({ length: proposal.optionCount }, (_, i) => `Option ${i + 1}`);

  const handleCancel = async () => {
    if (Number(proposal.voterCount) > 0) return;
    const success = await cancelProposal(proposalId);
    if (success) await refetch();
  };

  const handleExtend = async () => {
    if (!extendDate) return;
    const newDeadline = Math.floor(new Date(extendDate).getTime() / 1000);
    const currentDeadline = Math.floor(proposal.deadline.getTime() / 1000);
    const nowSec = Math.floor(Date.now() / 1000);
    if (newDeadline <= currentDeadline || newDeadline <= nowSec) return;
    const success = await extendDeadline(proposalId, newDeadline);
    if (success) {
      setShowExtend(false);
      await refetch();
    }
  };

  return (
    <AppLayout>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      <PageWrapper>
        <div className="max-w-3xl mx-auto space-y-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Proposals
          </button>

          <Card hover={false} className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <StatusBadge status={proposal.status} />
                <div className="text-right">
                  <div className="text-xs text-text-muted font-medium uppercase tracking-wider">Deadline</div>
                  <div
                    className={cn(
                      'text-sm font-bold',
                      proposal.status === 'VOTING' ? 'text-warning' : 'text-text-muted'
                    )}
                  >
                    {proposal.status === 'VOTING'
                      ? countdown
                      : `Ended ${proposal.deadline.toLocaleDateString()}`}
                  </div>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-secondary-accent leading-tight">{proposal.title}</h1>

              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1 text-text-muted">
                  <Users className="w-4 h-4" />
                  <span>
                    Proposed by <span className="font-mono text-text-primary">{formatAddress(proposal.creator)}</span>
                  </span>
                  {isCreator && (
                    <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 bg-surface-accent text-secondary-accent rounded-badge text-[10px] font-bold uppercase">
                      <Crown className="w-3 h-3" /> Creator
                    </span>
                  )}
                </div>
                <div className="text-text-muted font-mono text-xs">Proposal #{proposal.id.toString()}</div>
              </div>
            </div>

            <QuorumBar current={Number(proposal.voterCount)} target={Number(proposal.quorum)} />
          </Card>

          {/* Space Gating Banner */}
          {proposal.spaceGated && (
            <Card hover={false} className={cn(
              'p-4 flex items-start gap-3',
              isSpaceMember === false
                ? 'bg-danger/5 border-danger/20'
                : 'bg-surface-highlight border-primary-accent/20'
            )}>
              <Lock className={cn('w-5 h-5 shrink-0 mt-0.5', isSpaceMember === false ? 'text-danger' : 'text-primary-accent')} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-sm font-bold', isSpaceMember === false ? 'text-danger' : 'text-primary-accent')}>
                    Space-Gated Voting
                  </span>
                  {spaceInfo && (
                    <button
                      onClick={() => navigate(`/app/spaces/${proposal.spaceId.toString()}`)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/80 rounded-badge text-[10px] font-bold text-secondary-accent border border-default hover:border-primary-accent/40 transition-colors"
                    >
                      <CategoryEmoji label={spaceInfo.categoryLabel} className="text-[10px]" />
                      {spaceInfo.name}
                    </button>
                  )}
                </div>
                {isSpaceMember === false ? (
                  <p className="text-xs text-danger">
                    You are not a member of this Space. Join the Space to cast your vote.
                  </p>
                ) : isSpaceMember === true ? (
                  <p className="text-xs text-primary-accent">
                    You are a member of this Space and can vote on this proposal.
                  </p>
                ) : (
                  <p className="text-xs text-text-muted">Checking Space membership...</p>
                )}
              </div>
            </Card>
          )}

          {/* Creator Admin Panel */}
          {isCreator && proposal.status !== 'CANCELLED' && proposal.status !== 'REVEALED' && (
            <Card hover={false} className="space-y-4">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary-accent" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">Creator Controls</h3>
              </div>

              {adminError && (
                <p className="text-danger text-sm">{adminError}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {/* Cancel — only if no votes yet */}
                {Number(proposal.voterCount) === 0 && proposal.status === 'VOTING' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={adminLoading}
                    className="gap-2 border-danger/30 text-danger hover:bg-danger/5"
                  >
                    {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Cancel Proposal
                  </Button>
                )}

                {/* Extend Deadline */}
                {!proposal.revealed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExtend(!showExtend)}
                    className="gap-2"
                  >
                    <CalendarPlus className="w-4 h-4" /> Extend Deadline
                  </Button>
                )}
              </div>

              {showExtend && (
                <div className="space-y-3 pt-2">
                  {(() => {
                    const parsed = extendDate ? new Date(extendDate) : new Date(proposal.deadline.getTime() + 86400000);
                    const now = new Date();
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    const daysInMonth = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0).getDate();
                    const sel = 'px-3 py-2 rounded-input border border-default bg-white text-sm font-medium focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none appearance-none cursor-pointer';
                    const p = (n: number) => String(n).padStart(2, '0');
                    const build = (d: number, mo: number, y: number, h: number, m: number) => {
                      setExtendDate(`${y}-${p(mo + 1)}-${p(d)}T${p(h)}:${p(m)}`);
                    };
                    // Time slots every 30 min
                    const timeSlots: { h: number; m: number; label: string }[] = [];
                    for (let h = 0; h < 24; h++) {
                      for (const m of [0, 30]) {
                        timeSlots.push({ h, m, label: `${p(h)}:${p(m)}` });
                      }
                    }
                    const curTimeVal = parsed.getHours() * 60 + parsed.getMinutes();
                    return (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <select value={parsed.getDate()} onChange={(e) => build(Number(e.target.value), parsed.getMonth(), parsed.getFullYear(), parsed.getHours(), parsed.getMinutes())} className={sel}>
                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <select value={parsed.getMonth()} onChange={(e) => build(parsed.getDate(), Number(e.target.value), parsed.getFullYear(), parsed.getHours(), parsed.getMinutes())} className={sel}>
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                          </select>
                          <select value={parsed.getFullYear()} onChange={(e) => build(parsed.getDate(), parsed.getMonth(), Number(e.target.value), parsed.getHours(), parsed.getMinutes())} className={sel}>
                            {[now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <select value={curTimeVal} onChange={(e) => { const v = Number(e.target.value); build(parsed.getDate(), parsed.getMonth(), parsed.getFullYear(), Math.floor(v / 60), v % 60); }} className={sel + ' w-full'}>
                          {timeSlots.map((t) => { const val = t.h * 60 + t.m; return <option key={val} value={val}>{t.label}</option>; })}
                        </select>
                      </div>
                    );
                  })()}
                  <Button
                    size="sm"
                    onClick={handleExtend}
                    disabled={!extendDate || adminLoading}
                    className="gap-2"
                  >
                    {adminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                    Confirm
                  </Button>
                </div>
              )}

              {Number(proposal.voterCount) > 0 && proposal.status === 'VOTING' && (
                <p className="text-[10px] text-text-muted">
                  Cancel is disabled because votes have already been cast. You can still extend the deadline.
                </p>
              )}
            </Card>
          )}

          {/* Cancelled State */}
          {proposal.status === 'CANCELLED' && (
            <Card hover={false} className="bg-bg-base border-none text-center py-10 space-y-3">
              <XCircle className="w-12 h-12 text-text-muted mx-auto" />
              <h3 className="text-xl font-bold text-text-muted">Proposal Cancelled</h3>
              <p className="text-sm text-text-secondary">This proposal was cancelled by its creator before any votes were cast.</p>
            </Card>
          )}

          {/* Voting Section */}
          {canVote && (
            <Card hover={false} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Cast Your Vote</h3>
                {/* Gasless toggle */}
                <button
                  onClick={() => setUseGasless(g => !g)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-badge text-xs font-bold border transition-all',
                    useGasless
                      ? 'bg-tertiary-accent/10 border-tertiary-accent/30 text-tertiary-accent'
                      : 'bg-surface-highlight border-default text-text-muted hover:text-text-primary'
                  )}
                  title="Gasless voting — you sign, relayer pays gas (EIP-712 meta-tx)"
                >
                  <Zap className="w-3 h-3" />
                  {useGasless ? 'Gasless ON' : 'Gasless OFF'}
                </button>
              </div>

              {useGasless && (
                <div className="p-3 bg-tertiary-accent/5 border border-tertiary-accent/20 rounded-xl text-xs text-tertiary-accent flex items-start gap-2">
                  <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>You sign an EIP-712 message — the relayer submits the transaction and pays gas. Your vote is still FHE-encrypted before signing.</span>
                </div>
              )}

              <div className="space-y-3">
                {optionLabels.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedOption(i)}
                    className={cn(
                      'w-full p-4 rounded-input border-2 text-left transition-all flex items-center justify-between',
                      selectedOption === i
                        ? 'border-primary-accent bg-surface-highlight'
                        : 'border-default bg-white hover:border-primary-accent/30'
                    )}
                  >
                    <span className="font-semibold">{option}</span>
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        selectedOption === i ? 'border-primary-accent' : 'border-default'
                      )}
                    >
                      {selectedOption === i && <div className="w-2.5 h-2.5 bg-primary-accent rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
              <Button
                onClick={useGasless ? handleGaslessVote : handleVote}
                disabled={selectedOption === null || isVoting}
                className="w-full h-14 text-lg gap-2"
              >
                {useGasless ? <Zap className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                {useGasless ? 'Sign & Submit (Gasless)' : 'Encrypt & Submit Vote'}
              </Button>
            </Card>
          )}

          {/* Voting Progress — FHE step visualizer */}
          {voteState !== 'idle' && voteState !== 'success' && voteState !== 'error' && (
            <Card hover={false} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Submitting Encrypted Ballot</h3>
                <FheBadge op="Fhenix CoFHE" />
              </div>
              <div className="space-y-4">
                {[
                  {
                    id: 'initializing',
                    label: 'Initializing FHE engine',
                    sub: 'CoFHE WASM worker + WagmiAdapter',
                    fhe: null,
                  },
                  {
                    id: 'encrypting',
                    label: 'Encrypting your ballot',
                    sub: 'Encryptable.uint32 → ZK proof generation',
                    fhe: 'FHE.asEuint32',
                  },
                  {
                    id: 'submitting',
                    label: 'Submitting to Sepolia',
                    sub: 'Broadcasting encrypted {ctHash, signature} tuple',
                    fhe: 'FHE.eq + FHE.select + FHE.add',
                  },
                  {
                    id: 'confirming',
                    label: 'Confirming on-chain',
                    sub: 'Waiting for block finality',
                    fhe: 'FHE.allowSender',
                  },
                ].map((step) => {
                  const states = ['initializing', 'encrypting', 'submitting', 'confirming'];
                  const currentIdx = states.indexOf(voteState);
                  const stepIdx = states.indexOf(step.id);
                  const isDone = stepIdx < currentIdx;
                  const isActive = voteState === step.id;
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0.5 }}
                      animate={{ opacity: isDone || isActive ? 1 : 0.4 }}
                      className="flex items-start gap-4"
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 mt-0.5',
                          isDone
                            ? 'bg-primary-accent text-white shadow-button'
                            : isActive
                              ? 'bg-surface-highlight text-primary-accent ring-2 ring-primary-accent/30'
                              : 'bg-bg-base text-text-muted'
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn('font-semibold', isActive ? 'text-text-primary' : 'text-text-muted')}>
                          {step.label}
                        </div>
                        {(isDone || isActive) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-1 mt-1"
                          >
                            <div className="text-xs text-text-muted">{step.sub}</div>
                            {step.fhe && <FheBadge op={step.fhe} className="text-[9px]" />}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-default">
                <p className="text-[10px] text-text-muted flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Individual vote choice never leaves your browser in plaintext
                </p>
              </div>
            </Card>
          )}

          {/* Gasless vote progress */}
          {gaslessState !== 'idle' && gaslessState !== 'success' && gaslessState !== 'error' && (
            <Card hover={false} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Submitting Gasless Ballot</h3>
                <FheBadge op="EIP-712 meta-tx" />
              </div>
              <div className="space-y-3">
                {([
                  { id: 'initializing', label: 'Initializing FHE engine', sub: 'CoFHE WASM worker + WagmiAdapter' },
                  { id: 'encrypting', label: 'Encrypting your ballot', sub: 'Encryptable.uint32 → ZK proof' },
                  { id: 'signing', label: 'Signing EIP-712 message', sub: 'MetaMask typed-data signature — no gas needed' },
                  { id: 'relaying', label: 'Relayer submitting on-chain', sub: 'voteWithSignature() — relayer pays gas' },
                ] as const).map((step) => {
                  const states = ['initializing', 'encrypting', 'signing', 'relaying'] as const;
                  const currentIdx = states.indexOf(gaslessState as any);
                  const stepIdx = states.indexOf(step.id);
                  const isDone = stepIdx < currentIdx;
                  const isActive = gaslessState === step.id;
                  return (
                    <div key={step.id} className={cn('flex items-start gap-3', !isDone && !isActive && 'opacity-40')}>
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                        isDone ? 'bg-primary-accent text-white' : isActive ? 'bg-surface-highlight text-tertiary-accent ring-2 ring-tertiary-accent/30' : 'bg-bg-base text-text-muted'
                      )}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />}
                      </div>
                      <div>
                        <div className={cn('text-sm font-semibold', isActive ? 'text-text-primary' : 'text-text-muted')}>{step.label}</div>
                        {(isDone || isActive) && <div className="text-xs text-text-muted mt-0.5">{step.sub}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Gasless vote error */}
          {gaslessState === 'error' && gaslessError && (
            <Card hover={false} className="bg-danger/5 border-danger/20 space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-danger" />
                <h3 className="text-lg font-bold text-danger">Gasless Vote Failed</h3>
              </div>
              <p className="text-sm text-text-secondary">{gaslessError}</p>
              <Button variant="outline" size="sm" onClick={resetGasless}>Try Again</Button>
            </Card>
          )}

          {/* Vote Error */}
          {voteState === 'error' && voteError && (
            <Card hover={false} className="bg-danger/5 border-danger/20 space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-danger" />
                <h3 className="text-lg font-bold text-danger">Vote Failed</h3>
              </div>
              <p className="text-sm text-text-secondary">{voteError}</p>
              <Button variant="outline" size="sm" onClick={resetVote}>
                Try Again
              </Button>
            </Card>
          )}

          {/* Success State */}
          {(hasVoted || voteState === 'success' || gaslessState === 'success') && proposal.status === 'VOTING' && (
            <Card hover={false} className="bg-surface-highlight border-none space-y-6 text-center py-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-primary-accent text-white rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-primary-accent">Vote Recorded</h3>
                <p className="text-text-secondary">
                  Your encrypted ballot has been successfully submitted to the Ethereum Sepolia blockchain.
                </p>
              </div>

              {(txHash || gaslessTxHash) && (
                <div className="bg-white/50 p-4 rounded-xl space-y-3 max-w-sm mx-auto">
                  {gaslessTxHash && (
                    <div className="flex items-center justify-center gap-1 text-xs text-tertiary-accent font-bold">
                      <Zap className="w-3 h-3" /> Submitted gaslessly — relayer paid gas
                    </div>
                  )}
                  <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Transaction Hash</div>
                  <div className="font-mono text-xs break-all text-text-primary">{gaslessTxHash ?? txHash}</div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => navigator.clipboard.writeText((gaslessTxHash ?? txHash)!)}
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </Button>
                    <a
                      href={etherscanTx((gaslessTxHash ?? txHash)!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="ghost" size="sm" className="w-full gap-2">
                        <ExternalLink className="w-3 h-3" /> Etherscan
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                  <Lock className="w-4 h-4" /> Results will be available after the deadline. Come back to reveal and see the outcome.
                </div>

                {/* Verify My Vote */}
                {hasVoted && verifiedOption === null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => verifyMyVote(proposalId)}
                    disabled={isVerifying}
                    className="w-full gap-2"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    Verify My Vote (FHE Decrypt)
                  </Button>
                )}
                {verifiedOption !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-surface-highlight rounded-xl text-center space-y-1"
                  >
                    <div className="text-xs text-text-muted uppercase font-bold">Your Encrypted Vote</div>
                    <div className="font-bold text-primary-accent">
                      Option {verifiedOption + 1}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-text-muted">
                      <Shield className="w-3 h-3" /> Decrypted via FHE permit — only you can see this
                    </div>
                  </motion.div>
                )}
                {verifyError && (
                  verifyPermitError ? (
                    <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl space-y-2 text-left">
                      <p className="text-xs text-warning font-medium">{verifyError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyMyVote(proposalId)}
                        disabled={isVerifying}
                        className="gap-2 text-warning border-warning/40 hover:bg-warning/10"
                      >
                        {isVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                        Re-sign &amp; Retry
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-danger text-center">{verifyError}</p>
                  )
                )}
              </div>
            </Card>
          )}

          {/* Reveal Button (for ENDED proposals) */}
          {proposal.status === 'ENDED' && !proposal.revealed && (
            <Card hover={false} className="space-y-4">
              <h3 className="text-xl font-bold">Reveal Results</h3>
              <p className="text-text-secondary text-sm">
                The voting deadline has passed and quorum has been met. Anyone can trigger the reveal.
              </p>
              {revealError && <p className="text-danger text-sm">{revealError}</p>}
              <Button onClick={handleReveal} disabled={isRevealing} className="w-full gap-2">
                {isRevealing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Revealing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" /> Reveal Results
                  </>
                )}
              </Button>
            </Card>
          )}

          {/* Results Section */}
          {proposal.revealed && (
            <Card hover={false} className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Final Results</h3>
                <Badge variant="success">Verified</Badge>
              </div>
              {results.length > 0 ? (
                <div className="space-y-6">
                  {(() => {
                    const total = results.reduce((a, b) => a + b.votes, 0);
                    if (total === 0) return (
                      <div className="text-center py-6 text-text-muted">
                        <p className="font-medium">No votes were cast</p>
                        <p className="text-xs mt-1">This proposal ended without any participation.</p>
                      </div>
                    );
                    return null;
                  })()}
                  {results.map((result) => {
                    const total = results.reduce((a, b) => a + b.votes, 0);
                    if (total === 0) return null;
                    const percentage = total > 0 ? Math.round((result.votes / total) * 100) : 0;
                    const isWinner = result.votes === Math.max(...results.map((r) => r.votes));

                    return (
                      <div key={result.optionIndex} className="space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="flex items-center gap-2">
                            Option {result.optionIndex + 1} {isWinner && <Badge variant="success">Winner</Badge>}
                          </span>
                          <span>
                            {percentage}% ({result.votes} votes)
                          </span>
                        </div>
                        <div className="h-3 bg-bg-base rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={cn('h-full', isWinner ? 'bg-primary-accent' : 'bg-text-muted/30')}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : revealPermitError && revealError ? (
                <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-warning font-medium">{revealError}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDecryptedResults(proposalId!, proposal.optionCount)}
                      className="gap-2 text-warning border-warning/40 hover:bg-warning/10"
                    >
                      <Shield className="w-4 h-4" /> Re-sign &amp; Decrypt
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDecryptError}
                      className="text-text-muted hover:text-text-primary"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 gap-3 text-text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" /> Decrypting results...
                </div>
              )}
              {results.length > 0 && results.reduce((a, b) => a + b.votes, 0) > 0 && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const data = {
                        proposalId: proposal.id.toString(),
                        title: proposal.title,
                        creator: proposal.creator,
                        deadline: proposal.deadline.toISOString(),
                        quorum: Number(proposal.quorum),
                        voterCount: Number(proposal.voterCount),
                        results: results.map((r) => ({
                          option: `Option ${r.optionIndex + 1}`,
                          votes: r.votes,
                          percentage: Math.round((r.votes / results.reduce((a, b) => a + b.votes, 0)) * 100),
                        })),
                        network: 'Ethereum Sepolia',
                        contract: SHADOWVOTE_ADDRESS,
                        exportedAt: new Date().toISOString(),
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `shadowdao-proposal-${proposal.id}-results.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-4 h-4" /> Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const total = results.reduce((a, b) => a + b.votes, 0);
                      const csvEscape = (s: string) => `"${s.replace(/"/g, '""')}"`;
                      const csv = [
                        'Option,Votes,Percentage',
                        ...results.map((r) => [
                          csvEscape(`Option ${r.optionIndex + 1}`),
                          r.votes,
                          `${Math.round((r.votes / total) * 100)}%`,
                        ].join(',')),
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `shadowdao-proposal-${proposal.id}-results.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-4 h-4" /> Export CSV
                  </Button>
                </div>
              )}
              <div className="pt-4 border-t border-default flex justify-between items-center text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Verified on Sepolia
                </span>
                <span className="font-mono">Proposal #{proposal.id.toString()}</span>
              </div>
            </Card>
          )}

          {/* Discussion */}
          <DiscussionSection proposalId={proposal.id} />

        </div>
      </PageWrapper>
    </AppLayout>
  );
};

// ─── Discussion component ─────────────────────────────────────────────────────

import { pinCommentToIPFS, fetchCommentFromIPFS, cidToIpfsUrl } from '../utils/ipfs';

type OnChainComment = { author: string; ipfsHash: string; blockNumber: bigint };
type ResolvedComment = OnChainComment & { text: string | null; loading: boolean };

const V2_DEPLOYED = true; // contracts deployed on Sepolia

function DiscussionSection({ proposalId }: { proposalId: bigint }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [comments, setComments] = useState<ResolvedComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postStep, setPostStep] = useState<'idle' | 'pinning' | 'onchain'>('idle');

  // Fetch on-chain comment records, then resolve IPFS content for each
  const fetchComments = useCallback(async () => {
    if (!publicClient || !V2_DEPLOYED) return;
    setLoadingComments(true);
    try {
      const count = await publicClient.readContract({
        address: SHADOWVOTEV2_ADDRESS,
        abi: SHADOWVOTEV2_ABI,
        functionName: 'getCommentCount',
        args: [proposalId],
      } as any) as bigint;

      // Load on-chain records first (show immediately with loading state)
      const onChain: OnChainComment[] = [];
      for (let i = 0n; i < count; i++) {
        const [author, ipfsHash, blockNumber] = await publicClient.readContract({
          address: SHADOWVOTEV2_ADDRESS,
          abi: SHADOWVOTEV2_ABI,
          functionName: 'getComment',
          args: [proposalId, i],
        } as any) as [string, string, bigint];
        onChain.push({ author, ipfsHash, blockNumber });
      }

      // Show records immediately with loading state for text
      setComments(onChain.map(c => ({ ...c, text: null, loading: true })));
      setLoadingComments(false);

      // Resolve IPFS content in parallel (visible to all users via public IPFS gateways)
      const resolved = await Promise.all(
        onChain.map(async (c) => {
          const text = await fetchCommentFromIPFS(c.ipfsHash);
          return { ...c, text, loading: false };
        })
      );
      setComments(resolved);
    } catch (e) {
      console.error('Failed to fetch comments:', e);
      setLoadingComments(false);
    }
  }, [publicClient, proposalId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handlePost = async () => {
    if (!walletClient || !commentText.trim() || !publicClient || !address) return;
    if (chainId !== sepolia.id) { setPostError('Wrong network — switch to Ethereum Sepolia'); return; }
    setPosting(true);
    setPostError(null);
    try {
      const text = commentText.trim();

      // Step 1: Pin content to Pinata IPFS → publicly accessible by anyone via IPFS gateway
      setPostStep('pinning');
      const { cid, bytes32 } = await pinCommentToIPFS({
        text,
        author: address,
        proposalId: proposalId.toString(),
      });

      // Step 2: Store IPFS CID (as bytes32 SHA-256 digest) on-chain
      setPostStep('onchain');
      const hash = await walletClient.writeContract({
        address: SHADOWVOTEV2_ADDRESS,
        abi: SHADOWVOTEV2_ABI,
        functionName: 'postComment',
        args: [proposalId, bytes32],
      } as any);
      await publicClient.waitForTransactionReceipt({ hash });

      setCommentText('');
      setPostStep('idle');
      await fetchComments();
    } catch (e: any) {
      setPostError(e.shortMessage ?? e.message);
      setPostStep('idle');
    } finally {
      setPosting(false);
    }
  };

  const postLabel =
    postStep === 'pinning' ? 'Pinning to IPFS...' :
    postStep === 'onchain' ? 'Storing on-chain...' :
    'Post';

  return (
    <Card hover={false} className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-xl flex items-center justify-center">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold">Discussion</h3>
          <p className="text-xs text-text-muted">
            {V2_DEPLOYED
              ? 'Comments pinned to IPFS (Pinata) · CID stored on-chain · visible to all users'
              : 'Available on ShadowVoteV2 proposals'}
          </p>
        </div>
        {comments.length > 0 && (
          <span className="ml-auto px-2 py-0.5 bg-surface-highlight text-xs font-bold rounded-badge">
            {comments.length}
          </span>
        )}
      </div>

      {!V2_DEPLOYED && (
        <div className="text-center py-6 text-text-muted text-sm space-y-2">
          <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
          <p>Discussion is available for proposals created on <strong>ShadowVoteV2</strong>.</p>
          <p className="text-xs">Run <code className="font-mono bg-surface-tinted px-1 rounded">npm run deploy:v2</code> to enable.</p>
        </div>
      )}

      {/* Pinata configured server-side — no client-side check needed */}

      {V2_DEPLOYED && (
        <>
          {/* Comment list */}
          {loadingComments ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary-accent" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-sm">
              No comments yet — be the first to start the discussion
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((c, i) => (
                <div key={i} className="flex gap-3 p-3 bg-bg-base rounded-xl">
                  <div className="w-8 h-8 bg-surface-highlight rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">{c.author.slice(2, 4).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                      <span className="font-mono font-bold text-text-primary">{formatAddress(c.author)}</span>
                      <span>·</span>
                      <span>Block #{c.blockNumber.toString()}</span>
                      {c.text !== null && (
                        <span className="px-1.5 py-0.5 bg-surface-highlight text-primary-accent rounded-badge text-[9px] font-bold">
                          IPFS
                        </span>
                      )}
                    </div>
                    {c.loading ? (
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Fetching from IPFS...
                      </div>
                    ) : c.text !== null ? (
                      <div className="text-sm text-text-secondary leading-relaxed">{c.text}</div>
                    ) : (
                      <div className="break-all space-y-1">
                        <div className="text-sm text-text-secondary">
                          <Lock className="w-3 h-3 inline mr-1 text-primary-accent" />
                          <code className="font-mono text-xs">{c.ipfsHash.slice(0, 20)}...</code>
                        </div>
                        {cidToIpfsUrl(c.ipfsHash) && (
                          <a
                            href={cidToIpfsUrl(c.ipfsHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary-accent underline hover:opacity-80"
                          >
                            View on IPFS ↗
                          </a>
                        )}
                        <div className="text-[10px] text-text-muted">
                          Gateway timeout — content is pinned on IPFS, reload to retry
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Post comment */}
          {address && (
            <div className="space-y-3 pt-3 border-t border-default">
              <textarea
                className="w-full px-4 py-3 rounded-input border border-default bg-bg-base text-sm resize-none focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-colors"
                rows={3}
                placeholder="Write a comment... (pinned to IPFS, CID stored on-chain)"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                disabled={posting}
              />
              {postError && (
                <div className="flex gap-2 text-xs text-danger">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{postError}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-text-muted flex items-center gap-1 min-w-0">
                  {postStep === 'pinning' && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                  {postStep === 'onchain' && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                  {postStep === 'idle' && <Lock className="w-3 h-3 shrink-0" />}
                  <span className="truncate">
                    {postStep === 'pinning' && 'Pinning to Pinata IPFS...'}
                    {postStep === 'onchain' && 'Writing CID on-chain...'}
                    {postStep === 'idle' && 'Text → Pinata IPFS → bytes32 CID on-chain'}
                  </span>
                </div>
                <Button
                  variant="accent" size="sm"
                  onClick={handlePost}
                  disabled={!commentText.trim() || posting}
                  className="gap-2 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  {posting ? postLabel : 'Post'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
