import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, StatusBadge, AppLayout, PageWrapper, Button, QuorumBar, Confetti, FheBadge } from '../components/UI';
import { useAccount } from 'wagmi';
import { useProposals } from '../hooks/useProposals';
import { useVote } from '../hooks/useVote';
import { useReveal } from '../hooks/useReveal';
import { useProposalAdmin } from '../hooks/useProposalAdmin';
import { useVerifyVote } from '../hooks/useVerifyVote';
import { etherscanTx, SHADOWVOTE_ADDRESS } from '../config/contract';
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
  const { revealResults, fetchDecryptedResults, isRevealing, results, error: revealError, isPermitError: revealPermitError } = useReveal();
  const { cancelProposal, extendDeadline, isLoading: adminLoading, error: adminError } = useProposalAdmin();
  const { verifyMyVote, verifiedOption, isVerifying, error: verifyError, isPermitError: verifyPermitError } = useVerifyVote();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [checkingVote, setCheckingVote] = useState(true);
  const [showExtend, setShowExtend] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [isVoting, setIsVoting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const proposalId = BigInt(id || '0');
  const proposal = proposals.find((p) => p.id === proposalId);
  const countdown = useCountdown(proposal?.deadline || new Date());

  // Check if user has voted
  useEffect(() => {
    const check = async () => {
      if (!proposal) return;
      try {
        setCheckingVote(true);
        const voted = await checkHasVoted(proposalId);
        setHasVoted(voted);
      } catch (err) {
        console.warn('[ShadowDAO] Failed to check vote status:', err);
      } finally {
        setCheckingVote(false);
      }
    };
    check();
  }, [proposal, proposalId, checkHasVoted]);

  // Fetch decrypted results if revealed
  useEffect(() => {
    if (proposal?.revealed && results.length === 0) {
      fetchDecryptedResults(proposalId, proposal.optionCount);
    }
  }, [proposal?.revealed, proposalId, proposal?.optionCount, fetchDecryptedResults, results.length]);

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
    if (selectedOption === null || isVoting) return;
    setIsVoting(true);
    await castVote(proposalId, selectedOption);
    setHasVoted(true);
    setShowConfetti(true);
    await refetch();
    setIsVoting(false);
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
  const canVote = proposal.status === 'VOTING' && !hasVoted && !checkingVote && voteState === 'idle';
  const optionLabels = Array.from({ length: proposal.optionCount }, (_, i) => `Option ${i + 1}`);

  const handleCancel = async () => {
    if (Number(proposal.voterCount) > 0) return;
    const success = await cancelProposal(proposalId);
    if (success) window.location.reload();
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
      window.location.reload();
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
              <h3 className="text-xl font-bold">Cast Your Vote</h3>
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
              <Button onClick={handleVote} disabled={selectedOption === null || isVoting} className="w-full h-14 text-lg gap-2">
                <Lock className="w-5 h-5" /> Encrypt & Submit Vote
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
          {(hasVoted || voteState === 'success') && proposal.status === 'VOTING' && (
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

              {txHash && (
                <div className="bg-white/50 p-4 rounded-xl space-y-3 max-w-sm mx-auto">
                  <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Transaction Hash</div>
                  <div className="font-mono text-xs break-all text-text-primary">{txHash}</div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => navigator.clipboard.writeText(txHash)}
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </Button>
                    <a
                      href={etherscanTx(txHash)}
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
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                    <p className="text-sm text-warning font-medium">{revealError}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDecryptedResults(proposalId, proposal.optionCount)}
                    className="gap-2 text-warning border-warning/40 hover:bg-warning/10"
                  >
                    <Shield className="w-4 h-4" /> Re-sign &amp; Decrypt
                  </Button>
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
                      const csv = ['Option,Votes,Percentage', ...results.map((r) => `Option ${r.optionIndex + 1},${r.votes},${Math.round((r.votes / total) * 100)}%`)].join('\n');
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
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
