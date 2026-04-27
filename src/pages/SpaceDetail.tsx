import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Globe, Users, Vote as VoteIcon, Shield, Lock, Plus,
  Loader2, Crown, LogOut, Archive, UserMinus, ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, Badge, StatusBadge, AppLayout, PageWrapper, Button, CategoryEmoji, CopyButton } from '../components/UI';
import { useSpaces } from '../hooks/useSpaces';
import { useProposals, Proposal } from '../hooks/useProposals';
import { useCreateSpace } from '../hooks/useCreateSpace';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { CATEGORY_LABELS, SHADOWSPACE_ADDRESS, SHADOWSPACE_ABI, etherscanAddress } from '../config/contract';
import { formatAddress } from '../utils';
import { formatDistanceToNow } from 'date-fns';

export const SpaceDetail = () => {
  const navigate = useNavigate();
  const { spaceId } = useParams();
  const { address } = useAccount();
  const { spaces, loading, refetch, checkIsMember, getMembers } = useSpaces();
  const { proposals: allProposals, getProposalIdsBySpace } = useProposals();
  const { joinSpace, leaveSpace, archiveSpace } = useCreateSpace();

  const [isMember, setIsMember] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const [checkingMember, setCheckingMember] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [spaceProposals, setSpaceProposals] = useState<Proposal[]>([]);

  // Remove member
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const id: bigint | null = (() => {
    try { return spaceId ? BigInt(spaceId) : null; } catch { return null; }
  })();
  const space = id !== null ? spaces.find((s) => s.id === id) : undefined;

  useEffect(() => {
    const check = async () => {
      if (!space) return;
      try {
        setCheckingMember(true);
        const [memberStatus, memberList] = await Promise.all([
          checkIsMember(id),
          getMembers(id),
        ]);
        setIsMember(memberStatus);
        setMembers(memberList);
      } catch (err) {
        console.warn('[ShadowDAO] Failed to check membership:', err);
      } finally {
        setCheckingMember(false);
      }
    };
    check();
  }, [space, id, checkIsMember, getMembers]);

  // Fetch proposals for this space
  useEffect(() => {
    const fetchSpaceProposals = async () => {
      if (!space) return;
      const ids = await getProposalIdsBySpace(id);
      const matched = allProposals.filter((p) => ids.some((pid) => pid === p.id));
      setSpaceProposals(matched);
    };
    fetchSpaceProposals();
  }, [space, id, allProposals, getProposalIdsBySpace]);

  const handleJoin = async () => {
    setJoining(true);
    const success = await joinSpace(id);
    if (success) {
      setIsMember(true);
      await refetch();
      const updatedMembers = await getMembers(id);
      setMembers(updatedMembers);
    }
    setJoining(false);
  };

  const handleLeave = async () => {
    setLeaving(true);
    const success = await leaveSpace(id);
    if (success) {
      setIsMember(false);
      await refetch();
      const updatedMembers = await getMembers(id);
      setMembers(updatedMembers);
    }
    setLeaving(false);
  };

  const handleArchive = async () => {
    setArchiving(true);
    const success = await archiveSpace(id);
    if (success) {
      navigate('/app/spaces');
    }
    setArchiving(false);
    setShowArchiveConfirm(false);
  };

  const handleRemoveMember = async (memberAddr: string) => {
    if (!publicClient) return;
    try {
      setRemovingMember(memberAddr);
      const hash = await writeContractAsync({
        address: SHADOWSPACE_ADDRESS,
        abi: SHADOWSPACE_ABI,
        functionName: 'removeMember',
        args: [id, memberAddr as `0x${string}`],
      } as any);
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();
      const updatedMembers = await getMembers(id);
      setMembers(updatedMembers);
    } catch (err) {
      console.warn('Remove member failed:', err);
    } finally {
      setRemovingMember(null);
    }
  };

  if (id === null) {
    return (
      <AppLayout><PageWrapper>
        <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
          <h2 className="text-2xl font-bold">Invalid Space ID</h2>
          <p className="text-text-secondary">The URL contains an invalid space identifier.</p>
          <Button variant="outline" onClick={() => navigate('/app/spaces')}>Back to Spaces</Button>
        </div>
      </PageWrapper></AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout><PageWrapper>
        <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading space...
        </div>
      </PageWrapper></AppLayout>
    );
  }

  if (!space) {
    return (
      <AppLayout><PageWrapper>
        <div className="max-w-3xl mx-auto text-center py-20 space-y-4">
          <h2 className="text-2xl font-bold">Space not found</h2>
          <p className="text-text-secondary">This space may not exist on the contract yet.</p>
          <Button variant="outline" onClick={() => navigate('/app/spaces')}>Back to Spaces</Button>
        </div>
      </PageWrapper></AppLayout>
    );
  }

  const isCreator = address?.toLowerCase() === space.creator.toLowerCase();

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-5xl mx-auto space-y-6">
          <button onClick={() => navigate('/app/spaces')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Spaces
          </button>

          {/* Space Header */}
          <Card hover={false} className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-start gap-4">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="w-16 h-16 bg-surface-highlight rounded-2xl flex items-center justify-center shrink-0 text-3xl shadow-card"
                >
                  <CategoryEmoji label={space.categoryLabel} />
                </motion.div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold">{space.name}</h1>
                    <Badge variant="info">{space.categoryLabel}</Badge>
                    {!space.isPublic && <Badge variant="warning">Invite Only</Badge>}
                    {isCreator && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-accent text-secondary-accent rounded-badge text-[10px] font-bold uppercase">
                        <Crown className="w-3 h-3" /> Creator
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary max-w-lg">{space.description || 'No description'}</p>
                  <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                    <span>Created by</span>
                    <span className="font-mono text-text-primary">{formatAddress(space.creator)}</span>
                    <a href={etherscanAddress(space.creator)} target="_blank" rel="noopener noreferrer"
                      className="text-primary-accent hover:underline">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {!checkingMember && !isMember && space.isPublic && (
                  <Button onClick={handleJoin} disabled={joining} className="gap-2">
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Join Space
                  </Button>
                )}
                {!checkingMember && isMember && !isCreator && (
                  <Button variant="outline" onClick={handleLeave} disabled={leaving}
                    className="gap-2 border-danger/30 text-danger hover:bg-danger/5">
                    {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Leave
                  </Button>
                )}
                {isMember && !isCreator && <Badge variant="success">Member</Badge>}
                {isCreator && (
                  <Button variant="ghost" size="sm" onClick={() => setShowArchiveConfirm(true)}
                    className="gap-2 text-text-muted hover:text-danger">
                    <Archive className="w-4 h-4" /> Archive Space
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-default">
              {[
                { label: 'Members', value: Number(space.memberCount), icon: Users },
                { label: 'Proposals', value: Number(space.proposalCount), icon: VoteIcon },
                { label: 'Default Quorum', value: Number(space.defaultQuorum), icon: Shield },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center">
                    <Icon className="w-4 h-4 text-text-muted mx-auto mb-1" />
                    <div className="font-bold text-lg">{stat.value}</div>
                    <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Archive confirm modal */}
          <AnimatePresence>
            {showArchiveConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={() => setShowArchiveConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-card p-8 max-w-sm w-full mx-4 space-y-6 shadow-elevated"
                >
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto">
                      <Archive className="w-6 h-6 text-danger" />
                    </div>
                    <h3 className="text-xl font-bold">Archive Space?</h3>
                    <p className="text-sm text-text-secondary">
                      This will permanently deactivate <strong>{space.name}</strong>. Members will no longer be able to join or create proposals. This cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowArchiveConfirm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleArchive} disabled={archiving}
                      className="flex-1 bg-danger text-white hover:opacity-90">
                      {archiving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Archive'}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Proposals Section */}
          <Card hover={false} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Proposals</h3>
              {isMember && (
                <Link to="/app/create">
                  <Button size="sm" className="gap-2">
                    <Plus className="w-3 h-3" /> New Proposal
                  </Button>
                </Link>
              )}
            </div>
            {spaceProposals.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <VoteIcon className="w-10 h-10 text-text-muted mx-auto" />
                <p className="text-text-muted font-medium">No proposals yet</p>
                {isMember && (
                  <p className="text-xs text-text-muted">Create the first proposal in this Space</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {spaceProposals.map((proposal, i) => (
                  <motion.div
                    key={proposal.id.toString()}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <button
                      onClick={() => navigate(`/app/proposal/${proposal.id.toString()}`)}
                      className="w-full text-left p-4 rounded-xl border border-default bg-bg-base hover:border-primary-accent/30 hover:bg-surface-tinted transition-all group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={proposal.status} />
                            <span className="text-xs text-text-muted font-mono">#{proposal.id.toString()}</span>
                          </div>
                          <p className="font-semibold text-secondary-accent truncate">{proposal.title}</p>
                          <div className="flex gap-3 text-xs text-text-muted flex-wrap">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {proposal.voterCount.toString()} votes
                            </span>
                            <span>
                              {proposal.status === 'VOTING'
                                ? `Ends in ${formatDistanceToNow(proposal.deadline)}`
                                : `Ended ${proposal.deadline.toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary-accent group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>

          {/* Members */}
          <Card hover={false} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Users className="w-4 h-4" /> Members ({Number(space.memberCount)})
              </h3>
            </div>
            <div className="space-y-2">
              {members.filter((addr) => {
                // Re-check isMember status isn't easy here; rely on memberList being accurate
                return true;
              }).map((addr, i) => {
                const isSelf = addr.toLowerCase() === address?.toLowerCase();
                const isCreatorAddr = addr.toLowerCase() === space.creator.toLowerCase();
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between p-3 bg-bg-base rounded-xl hover:bg-surface-tinted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-surface-highlight rounded-full flex items-center justify-center text-xs font-bold text-primary-accent">
                        {addr.slice(2, 4).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-mono text-sm">{formatAddress(addr)}</div>
                        <div className="flex gap-1 mt-0.5">
                          {isCreatorAddr && <Badge variant="success">Admin</Badge>}
                          {isSelf && <Badge variant="info">You</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton text={addr} />
                      <a href={etherscanAddress(addr)} target="_blank" rel="noopener noreferrer"
                        className="text-text-muted hover:text-primary-accent transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {isCreator && !isCreatorAddr && (
                        <button
                          onClick={() => handleRemoveMember(addr)}
                          disabled={removingMember === addr}
                          className="p-1 text-text-muted hover:text-danger transition-colors disabled:opacity-50"
                          title="Remove member"
                        >
                          {removingMember === addr
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <UserMinus className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {/* FHE Info */}
          <Card hover={false} className="p-4 bg-surface-highlight border-none flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary-accent shrink-0 mt-0.5" />
            <p className="text-xs text-primary-accent leading-relaxed">
              All proposals in this Space use FHE-encrypted voting via ShadowVote.sol. Individual votes are encrypted with Fhenix CoFHE — nobody can see how you voted, not even the Space creator. Membership is public; only ballots are private.
            </p>
          </Card>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
