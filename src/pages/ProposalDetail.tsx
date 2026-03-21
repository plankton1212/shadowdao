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
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, StatusBadge, AppLayout, PageWrapper, Button, QuorumBar } from '../components/UI';
import { useAccount, usePublicClient } from 'wagmi';
import { useProposals } from '../hooks/useProposals';
import { useVote } from '../hooks/useVote';
import { useReveal } from '../hooks/useReveal';
import { formatDistanceToNow } from 'date-fns';
import { cn, formatAddress } from '../utils';

export const ProposalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { proposals, loading, checkHasVoted } = useProposals();
  const { castVote, voteState, txHash, error: voteError, reset: resetVote } = useVote();
  const { revealResults, fetchDecryptedResults, isRevealing, results, error: revealError } = useReveal();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [checkingVote, setCheckingVote] = useState(true);

  const proposalId = BigInt(id || '0');
  const proposal = proposals.find((p) => p.id === proposalId);

  // Check if user has voted
  useEffect(() => {
    const check = async () => {
      if (!proposal) return;
      setCheckingVote(true);
      const voted = await checkHasVoted(proposalId);
      setHasVoted(voted);
      setCheckingVote(false);
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
    if (selectedOption === null) return;
    await castVote(proposalId, selectedOption);
  };

  const handleReveal = async () => {
    await revealResults(proposalId);
  };

  const optionLabels = Array.from({ length: proposal.optionCount }, (_, i) => `Option ${i + 1}`);

  return (
    <AppLayout>
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
                      ? `Ends in ${formatDistanceToNow(proposal.deadline)}`
                      : `Ended ${proposal.deadline.toLocaleDateString()}`}
                  </div>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-secondary-accent leading-tight">{proposal.title}</h1>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-text-muted">
                  <Users className="w-4 h-4" />
                  <span>
                    Proposed by <span className="font-mono text-text-primary">{formatAddress(proposal.creator)}</span>
                  </span>
                </div>
                <div className="text-text-muted font-mono text-xs">Proposal #{proposal.id.toString()}</div>
              </div>
            </div>

            <QuorumBar current={Number(proposal.voterCount)} target={Number(proposal.quorum)} />
          </Card>

          {/* Voting Section */}
          {proposal.status === 'VOTING' && !hasVoted && !checkingVote && voteState === 'idle' && (
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
              <Button onClick={handleVote} disabled={selectedOption === null} className="w-full h-14 text-lg gap-2">
                <Lock className="w-5 h-5" /> Encrypt & Submit Vote
              </Button>
            </Card>
          )}

          {/* Voting Progress */}
          {voteState !== 'idle' && voteState !== 'success' && voteState !== 'error' && (
            <Card hover={false} className="space-y-6">
              <h3 className="text-xl font-bold">Submitting Encrypted Ballot</h3>
              <div className="space-y-4">
                {[
                  { id: 'initializing', label: 'Initializing FHE encryption...' },
                  { id: 'encrypting', label: 'Encrypting your ballot...' },
                  { id: 'submitting', label: 'Submitting to Sepolia...' },
                  { id: 'confirming', label: 'Confirming on-chain...' },
                ].map((step, i) => {
                  const states = ['initializing', 'encrypting', 'submitting', 'confirming'];
                  const currentIdx = states.indexOf(voteState);
                  const stepIdx = states.indexOf(step.id);
                  const isDone = stepIdx < currentIdx;
                  const isActive = voteState === step.id;
                  return (
                    <div key={step.id} className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                          isDone
                            ? 'bg-primary-accent text-white'
                            : isActive
                              ? 'bg-surface-highlight text-primary-accent'
                              : 'bg-bg-base text-text-muted'
                        )}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-text-muted" />
                        )}
                      </div>
                      <span className={cn('font-medium', isActive ? 'text-text-primary' : 'text-text-muted')}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => navigator.clipboard.writeText(txHash)}
                  >
                    <Copy className="w-3 h-3" /> Copy Hash
                  </Button>
                </div>
              )}

              <div className="pt-4">
                <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                  <Lock className="w-4 h-4" /> Results hidden until deadline passes
                </div>
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
                  {results.map((result) => {
                    const total = results.reduce((a, b) => a + b.votes, 0);
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
              ) : (
                <div className="flex items-center justify-center py-8 gap-3 text-text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" /> Decrypting results...
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
