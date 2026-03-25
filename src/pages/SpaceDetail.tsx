import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Globe, Users, Vote as VoteIcon, Shield, Lock, Plus,
  Clock, Loader2, CheckCircle2, Crown,
} from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, Badge, AppLayout, PageWrapper, Button } from '../components/UI';
import { useSpaces } from '../hooks/useSpaces';
import { useCreateSpace } from '../hooks/useCreateSpace';
import { useAccount } from 'wagmi';
import { CATEGORY_LABELS } from '../config/contract';
import { formatAddress } from '../utils';

export const SpaceDetail = () => {
  const navigate = useNavigate();
  const { spaceId } = useParams();
  const { address } = useAccount();
  const { spaces, loading, refetch, checkIsMember, getMembers } = useSpaces();
  const { joinSpace } = useCreateSpace();

  const [isMember, setIsMember] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const [checkingMember, setCheckingMember] = useState(true);
  const [joining, setJoining] = useState(false);

  const id = BigInt(spaceId || '0');
  const space = spaces.find((s) => s.id === id);

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
        <div className="max-w-5xl mx-auto space-y-8">
          <button onClick={() => navigate('/app/spaces')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Spaces
          </button>

          {/* Space Header */}
          <Card hover={false} className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-surface-highlight rounded-2xl flex items-center justify-center shrink-0">
                  <Globe className="w-8 h-8 text-primary-accent" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold">{space.name}</h1>
                    <Badge variant="info">{space.categoryLabel}</Badge>
                    {!space.isPublic && <Badge variant="warning">Invite Only</Badge>}
                  </div>
                  <p className="text-sm text-text-secondary max-w-lg">{space.description || 'No description'}</p>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>Created by</span>
                    <span className="font-mono text-text-primary">{formatAddress(space.creator)}</span>
                    {isCreator && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-accent text-secondary-accent rounded-badge text-[10px] font-bold uppercase">
                        <Crown className="w-3 h-3" /> Creator
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!checkingMember && !isMember && space.isPublic && (
                <Button onClick={handleJoin} disabled={joining} className="gap-2 shrink-0">
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Join Space
                </Button>
              )}
              {isMember && (
                <Badge variant="success">Member</Badge>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-default">
              {[
                { label: 'Members', value: Number(space.memberCount), icon: Users },
                { label: 'Proposals', value: Number(space.proposalCount), icon: VoteIcon },
                { label: 'Quorum', value: Number(space.defaultQuorum), icon: Shield },
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
            {Number(space.proposalCount) === 0 ? (
              <div className="text-center py-10 space-y-3">
                <VoteIcon className="w-10 h-10 text-text-muted mx-auto" />
                <p className="text-text-muted font-medium">No proposals yet</p>
                <p className="text-xs text-text-muted">Create the first proposal in this Space</p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{Number(space.proposalCount)} proposals created in this Space</p>
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
              {members.map((addr, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-bg-base rounded-xl">
                  <span className="font-mono text-sm">{formatAddress(addr)}</span>
                  <div className="flex gap-2">
                    {addr.toLowerCase() === space.creator.toLowerCase() && <Badge variant="success">Admin</Badge>}
                    {addr.toLowerCase() === address?.toLowerCase() && <Badge variant="info">You</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* FHE Info */}
          <Card hover={false} className="p-4 bg-surface-highlight border-none flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary-accent shrink-0 mt-0.5" />
            <p className="text-xs text-primary-accent leading-relaxed">
              All proposals in this Space use FHE-encrypted voting via ShadowVote.sol. Individual votes are encrypted with Fhenix CoFHE — nobody can see how you voted, not even the Space creator.
            </p>
          </Card>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
