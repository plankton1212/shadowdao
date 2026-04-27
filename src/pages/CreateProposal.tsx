import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, X, Calendar, Users, CheckCircle2, ArrowRight, ArrowLeft,
  Shield, Lock, Info, Clock, Copy, AlertCircle, Loader2, ExternalLink,
  Link2, Globe, Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, AppLayout, PageWrapper, Button, CategoryEmoji } from '../components/UI';
import { useCreateProposal } from '../hooks/useCreateProposal';
import { useSpaces } from '../hooks/useSpaces';
import { useAccount } from 'wagmi';
import { cn } from '../utils';
import { QRCodeSVG } from 'qrcode.react';
import { etherscanTx } from '../config/contract';

export const CreateProposal = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { createProposal, deployState, txHash, proposalId, error, reset, useV2, setUseV2, v2Available } = useCreateProposal();
  const { spaces, loading: spacesLoading, getUserSpaceIds } = useSpaces();

  const [step, setStep] = useState(1);
  const [mySpaceIds, setMySpaceIds] = useState<bigint[]>([]);

  useEffect(() => {
    if (!address) return;
    getUserSpaceIds().then(setMySpaceIds);
  }, [address, getUserSpaceIds]);

  const mySpaces = spaces.filter((s) => mySpaceIds.includes(s.id) && s.active);

  const DURATION_OPTIONS = [
    { label: '10 min', minutes: 10 },
    { label: '1 hour', minutes: 60 },
    { label: '12 hours', minutes: 720 },
    { label: '1 day', minutes: 1440 },
    { label: '3 days', minutes: 4320 },
    { label: '7 days', minutes: 10080 },
    { label: '14 days', minutes: 20160 },
    { label: '30 days', minutes: 43200 },
  ];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ipfsCid: '',            // IPFS CID or URL — stored as bytes32 on V2
    options: ['', ''],
    durationMinutes: 4320,
    customDate: '',
    quorum: 10,
    weighted: false,        // V2 only: FHE.mul weighted voting
    spaceId: null as bigint | null,
    spaceGated: false,
  });

  const handleAddOption = () => {
    if (formData.options.length < 10) {
      setFormData({ ...formData, options: [...formData.options, ''] });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData({ ...formData, options: formData.options.filter((_, i) => i !== index) });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  // Strip only HTML angle brackets — React escapes everything else automatically.
  // Removing &, ', " breaks legitimate titles like "A & B" or "Don't".
  const sanitize = (s: string) => s.trim().replace(/[<>]/g, '');

  const [deployError, setDeployError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setDeployError(null);

    const title = sanitize(formData.title);
    if (!title || title.length < 3) { setDeployError('Title must be at least 3 characters'); return; }
    if (title.length > 200) { setDeployError('Title must be under 200 characters'); return; }

    const validOptions = formData.options.map((o) => sanitize(o)).filter((o) => o.length > 0);
    if (validOptions.length < 2) { setDeployError('At least 2 non-empty options required'); return; }
    if (validOptions.length > 10) { setDeployError('Maximum 10 options allowed'); return; }
    const uniqueOptions = new Set(validOptions.map((o) => o.toLowerCase()));
    if (uniqueOptions.size !== validOptions.length) { setDeployError('Duplicate options are not allowed'); return; }
    if (validOptions.some((o) => o.length > 100)) { setDeployError('Each option must be under 100 characters'); return; }

    const nowSec = Math.floor(Date.now() / 1000);
    let deadlineTimestamp: number;
    if (formData.customDate) {
      deadlineTimestamp = Math.floor(new Date(formData.customDate).getTime() / 1000);
    } else {
      deadlineTimestamp = nowSec + formData.durationMinutes * 60;
    }
    if (deadlineTimestamp <= nowSec) { setDeployError('Deadline must be in the future'); return; }
    if (formData.quorum < 1) { setDeployError('Quorum must be at least 1'); return; }

    // Build bytes32 description hash from IPFS CID (if provided)
    let descriptionHash: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000';
    if (formData.ipfsCid.trim()) {
      const cid = formData.ipfsCid.trim();
      const encoder = new TextEncoder();
      const bytes = encoder.encode(cid.slice(0, 32).padEnd(32, '\0'));
      descriptionHash = ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
    }

    await createProposal(
      title,
      validOptions.length,
      deadlineTimestamp,
      formData.quorum,
      formData.spaceGated && formData.spaceId !== null ? formData.spaceId : 0n,
      formData.spaceGated && formData.spaceId !== null,
      descriptionHash,
      formData.weighted,
    );
  };

  const steps = [
    { id: 1, name: 'Details' },
    { id: 2, name: 'Space' },
    { id: 3, name: 'Options' },
    { id: 4, name: 'Config' },
    { id: 5, name: 'Review' },
  ];

  const deployed = deployState === 'success';
  const deploying = deployState === 'submitting' || deployState === 'confirming';

  const selectedSpace = formData.spaceId !== null ? mySpaces.find((s) => s.id === formData.spaceId) : null;

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Create Proposal</h2>
            <p className="text-text-secondary">Deploy an FHE-encrypted vote on Ethereum Sepolia</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between px-2">
            {steps.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all',
                    step > s.id ? 'bg-primary-accent text-white' :
                    step === s.id ? 'bg-surface-highlight text-primary-accent ring-4 ring-primary-accent/10' :
                    'bg-bg-base text-text-muted'
                  )}>
                    {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={cn('text-[10px] font-bold hidden sm:block', step === s.id ? 'text-primary-accent' : 'text-text-muted')}>
                    {s.name}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('flex-1 h-0.5 mx-2 rounded-full', step > s.id ? 'bg-primary-accent' : 'bg-bg-base')} />
                )}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {!deployed ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* ── Step 1: Details ── */}
                {step === 1 && (
                  <Card hover={false} className="space-y-6">
                    {/* Contract version selector */}
                    {v2Available && (
                      <div className="flex items-center justify-between p-3 bg-surface-highlight rounded-xl">
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold flex items-center gap-2">
                            <Badge variant={useV2 ? 'success' : 'default'}>{useV2 ? 'ShadowVoteV2' : 'ShadowVote V1'}</Badge>
                          </div>
                          <div className="text-xs text-text-muted">
                            {useV2 ? 'Weighted voting + IPFS desc + discussion + gasless' : 'Classic FHE voting'}
                          </div>
                        </div>
                        <button
                          onClick={() => setUseV2(!useV2)}
                          className={cn(
                            'relative w-12 h-7 rounded-full transition-colors shrink-0',
                            useV2 ? 'bg-primary-accent' : 'bg-bg-base border border-default'
                          )}
                        >
                          <div className={cn(
                            'absolute top-[3px] w-5 h-5 bg-white rounded-full shadow transition-transform',
                            useV2 ? 'translate-x-[22px]' : 'translate-x-[3px]'
                          )} />
                        </button>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Proposal Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Increase staking rewards to 8%"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Description <span className="font-normal text-text-muted">(optional, shown in proposal detail)</span></label>
                        <textarea
                          placeholder="Provide context for your proposal..."
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-all resize-none"
                        />
                      </div>

                      {/* V2 only: IPFS CID */}
                      {useV2 && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-text-secondary flex items-center gap-2">
                            IPFS Description Hash
                            <span className="font-normal text-text-muted">(optional, V2 only)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Qm... or bafyrei... (IPFS CID of full proposal text)"
                            value={formData.ipfsCid}
                            onChange={(e) => setFormData({ ...formData, ipfsCid: e.target.value })}
                            className="w-full px-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-all font-mono text-sm"
                          />
                          <div className="text-xs text-text-muted">
                            CID encoded as bytes32 and stored on-chain — fetch content from ipfs.io at any time
                          </div>
                        </div>
                      )}
                    </div>
                    <Button onClick={() => setStep(2)} disabled={!formData.title.trim()} className="w-full gap-2">
                      Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Card>
                )}

                {/* ── Step 2: Space selector ── */}
                {step === 2 && (
                  <Card hover={false} className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg">Link to a Space</h3>
                      <p className="text-sm text-text-secondary">
                        Space-gated proposals restrict voting to Space members only. Or leave it global — anyone can vote.
                      </p>
                    </div>

                    {/* Global option */}
                    <button
                      onClick={() => setFormData({ ...formData, spaceId: null, spaceGated: false })}
                      className={cn(
                        'w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4',
                        !formData.spaceGated
                          ? 'border-primary-accent bg-surface-highlight'
                          : 'border-default bg-white hover:border-primary-accent/30'
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-bg-base flex items-center justify-center shrink-0">
                        <Globe className="w-6 h-6 text-text-muted" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold">Global Proposal</div>
                        <div className="text-sm text-text-secondary">Anyone with a wallet can vote</div>
                      </div>
                      {!formData.spaceGated && (
                        <CheckCircle2 className="w-5 h-5 text-primary-accent shrink-0" />
                      )}
                    </button>

                    {/* Space list */}
                    {spacesLoading ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-text-muted">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading your spaces...
                      </div>
                    ) : mySpaces.length === 0 ? (
                      <div className="p-4 bg-bg-base rounded-2xl text-sm text-text-muted text-center space-y-2">
                        <Layers className="w-8 h-8 mx-auto opacity-40" />
                        <p>You haven't joined any Spaces yet.</p>
                        <button
                          className="text-primary-accent underline text-xs"
                          onClick={() => navigate('/app/spaces')}
                        >
                          Browse Spaces →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Your Spaces</div>
                        {mySpaces.map((space) => (
                          <button
                            key={space.id.toString()}
                            onClick={() => setFormData({ ...formData, spaceId: space.id, spaceGated: true })}
                            className={cn(
                              'w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4',
                              formData.spaceGated && formData.spaceId === space.id
                                ? 'border-secondary-accent bg-surface-accent/5'
                                : 'border-default bg-white hover:border-secondary-accent/30'
                            )}
                          >
                            <div className="w-12 h-12 rounded-xl bg-surface-highlight flex items-center justify-center shrink-0 text-2xl">
                              <CategoryEmoji label={space.categoryLabel} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold truncate">{space.name}</div>
                              <div className="text-xs text-text-muted flex items-center gap-2">
                                <Users className="w-3 h-3" /> {Number(space.memberCount)} members
                                <span>·</span>
                                <span>{space.categoryLabel}</span>
                              </div>
                            </div>
                            {formData.spaceGated && formData.spaceId === space.id && (
                              <CheckCircle2 className="w-5 h-5 text-secondary-accent shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {formData.spaceGated && formData.spaceId !== null && (
                      <div className="p-3 bg-secondary-accent/5 border border-secondary-accent/20 rounded-xl text-xs text-secondary-accent flex items-center gap-2">
                        <Lock className="w-4 h-4 shrink-0" />
                        Only members of <strong>{selectedSpace?.name}</strong> will be able to vote on this proposal.
                      </div>
                    )}

                    <div className="flex gap-4">
                      <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
                      <Button onClick={() => setStep(3)} className="flex-1 gap-2">
                        Next <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                )}

                {/* ── Step 3: Options ── */}
                {step === 3 && (
                  <Card hover={false} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Quick Templates</div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { name: 'Yes / No', options: ['Yes', 'No'] },
                            { name: 'Approve / Reject / Abstain', options: ['Approve', 'Reject', 'Abstain'] },
                            { name: 'Multiple Choice (A-D)', options: ['Option A', 'Option B', 'Option C', 'Option D'] },
                            { name: 'Priority (High-Low)', options: ['High Priority', 'Medium Priority', 'Low Priority'] },
                          ].map((t) => (
                            <button
                              key={t.name}
                              onClick={() => setFormData((prev) => ({ ...prev, options: [...t.options] }))}
                              className="p-3 rounded-xl border border-default bg-white hover:border-primary-accent/30 hover:bg-surface-highlight transition-all text-left space-y-1"
                            >
                              <div className="text-sm font-bold">{t.name}</div>
                              <div className="text-[10px] text-text-muted">{t.options.join(' · ')}</div>
                            </button>
                          ))}
                        </div>
                        <div className="text-xs text-text-muted uppercase font-bold tracking-widest pt-2">Or custom options</div>
                      </div>
                      {formData.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <div className="flex-1 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">{i + 1}</span>
                            <input
                              type="text"
                              placeholder={`Option ${i + 1}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(i, e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-all"
                            />
                          </div>
                          {formData.options.length > 2 && (
                            <button onClick={() => handleRemoveOption(i)} className="p-3 text-text-muted hover:text-danger transition-colors">
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {formData.options.length < 10 && (
                        <Button variant="outline" onClick={handleAddOption} className="w-full gap-2 border-dashed">
                          <Plus className="w-4 h-4" /> Add Option
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">Back</Button>
                      <Button onClick={() => setStep(4)} disabled={formData.options.some((o) => !o)} className="flex-1">Next</Button>
                    </div>
                  </Card>
                )}

                {/* ── Step 4: Config ── */}
                {step === 4 && (
                  <Card hover={false} className="space-y-6">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Voting Duration</label>
                        <div className="grid grid-cols-4 gap-2">
                          {DURATION_OPTIONS.map((opt) => (
                            <button
                              key={opt.minutes}
                              onClick={() => {
                                const endDate = new Date(Date.now() + opt.minutes * 60000);
                                const p = (n: number) => String(n).padStart(2, '0');
                                const dateStr = `${endDate.getFullYear()}-${p(endDate.getMonth() + 1)}-${p(endDate.getDate())}T${p(endDate.getHours())}:${p(endDate.getMinutes())}`;
                                setDeployError(null);
                                setFormData((prev) => ({ ...prev, durationMinutes: opt.minutes, customDate: dateStr }));
                              }}
                              className={cn(
                                'py-2.5 px-3 rounded-xl border-2 font-semibold text-sm transition-all',
                                formData.durationMinutes === opt.minutes
                                  ? 'border-primary-accent bg-surface-highlight text-primary-accent'
                                  : 'border-default bg-white hover:border-primary-accent/30 text-text-secondary'
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {/* Custom date */}
                        <div className="pt-2 space-y-2">
                          <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Or pick a custom end date</label>
                          {(() => {
                            const now = new Date();
                            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0);
                            const current = formData.customDate ? new Date(formData.customDate) : tomorrow;
                            const selDay = current.getDate(); const selMonth = current.getMonth();
                            const selYear = current.getFullYear(); const selHour = current.getHours(); const selMinute = current.getMinutes();
                            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
                            const pad = (n: number) => String(n).padStart(2, '0');
                            const buildLocal = (d: number, mo: number, y: number, h: number, m: number) => `${y}-${pad(mo + 1)}-${pad(d)}T${pad(h)}:${pad(m)}`;
                            const update = (d: number, mo: number, y: number, h: number, m: number) => {
                              const dt = new Date(y, mo, d, h, m);
                              if (dt.getTime() <= Date.now()) setDeployError('Selected date is in the past');
                              else setDeployError(null);
                              setFormData((prev) => ({ ...prev, customDate: buildLocal(d, mo, y, h, m), durationMinutes: -1 }));
                            };
                            const roundedMin = selMinute < 15 ? 0 : selMinute < 45 ? 30 : 0;
                            const roundedHour = selMinute >= 45 ? (selHour + 1) % 24 : selHour;
                            const currentTimeVal = roundedHour * 60 + roundedMin;
                            const selectClass = 'px-3 py-2.5 rounded-input border border-default bg-white text-sm font-medium focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none appearance-none cursor-pointer';
                            const isPast = current.getTime() <= Date.now();
                            return (
                              <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                  <select value={selDay} onChange={(e) => update(Number(e.target.value), selMonth, selYear, selHour, selMinute)} className={selectClass}>
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (<option key={d} value={d}>{d}</option>))}
                                  </select>
                                  <select value={selMonth} onChange={(e) => update(selDay, Number(e.target.value), selYear, selHour, selMinute)} className={selectClass}>
                                    {months.map((m, i) => (<option key={i} value={i}>{m}</option>))}
                                  </select>
                                  <select value={selYear} onChange={(e) => update(selDay, selMonth, Number(e.target.value), selHour, selMinute)} className={selectClass}>
                                    {[now.getFullYear(), now.getFullYear() + 1].map((y) => (<option key={y} value={y}>{y}</option>))}
                                  </select>
                                </div>
                                <select value={currentTimeVal} onChange={(e) => { const v = Number(e.target.value); update(selDay, selMonth, selYear, Math.floor(v / 60), v % 60); }} className={selectClass + ' w-full'}>
                                  {Array.from({ length: 48 }, (_, i) => { const h = Math.floor(i / 2); const m = (i % 2) * 30; const val = h * 60 + m; return <option key={val} value={val}>{pad(h)}:{pad(m)}</option>; })}
                                </select>
                                <div className="flex items-center justify-between">
                                  <span className={cn('text-xs', isPast ? 'text-danger font-bold' : 'text-text-secondary')}>
                                    {isPast ? 'This date is in the past!' : <>Ends: <span className="font-bold text-text-primary">{current.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></>}
                                  </span>
                                  {formData.customDate && (
                                    <button onClick={() => { setDeployError(null); setFormData((prev) => ({ ...prev, customDate: '', durationMinutes: 4320 })); }} className="text-xs text-danger hover:underline">Clear</button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Quorum Threshold</label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range" min="1" max="100" step="1"
                            value={formData.quorum}
                            onChange={(e) => setFormData({ ...formData, quorum: parseInt(e.target.value) })}
                            className="flex-1 h-2 bg-bg-base rounded-full appearance-none cursor-pointer accent-primary-accent"
                          />
                          <div className="w-20 text-center font-bold text-secondary-accent">{formData.quorum}</div>
                        </div>
                        <p className="text-[10px] text-text-muted">Minimum votes required for a valid result</p>
                      </div>

                      {/* V2 only: Weighted voting toggle */}
                      {useV2 && (
                        <div className="flex items-center justify-between p-4 bg-surface-tinted rounded-xl border border-default">
                          <div className="space-y-0.5">
                            <div className="text-sm font-bold flex items-center gap-2">
                              Weighted Voting
                              <Badge variant="info" className="text-[10px]">V2 · FHE.mul</Badge>
                            </div>
                            <div className="text-xs text-text-muted">
                              Votes multiplied by encrypted power per address (set by admin via setVotingPower)
                            </div>
                          </div>
                          <button
                            onClick={() => setFormData(f => ({ ...f, weighted: !f.weighted }))}
                            className={cn(
                              'relative w-12 h-7 rounded-full transition-colors shrink-0',
                              formData.weighted ? 'bg-tertiary-accent' : 'bg-bg-base border border-default'
                            )}
                          >
                            <div className={cn(
                              'absolute top-[3px] w-5 h-5 bg-white rounded-full shadow transition-transform',
                              formData.weighted ? 'translate-x-[22px]' : 'translate-x-[3px]'
                            )} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4">
                      <Button variant="secondary" onClick={() => setStep(3)} className="flex-1">Back</Button>
                      <Button onClick={() => setStep(5)} className="flex-1">Next</Button>
                    </div>
                  </Card>
                )}

                {/* ── Step 5: Review ── */}
                {step === 5 && (
                  <div className="space-y-6">
                    <Card hover={false} className="space-y-6">
                      <h3 className="text-xl font-bold">Review Proposal</h3>
                      <div className="space-y-4">
                        <div className="pb-4 border-b border-default">
                          <div className="text-xs text-text-muted uppercase font-bold mb-1">Title</div>
                          <div className="font-bold text-lg">{formData.title}</div>
                          {formData.description && <p className="text-sm text-text-secondary mt-1">{formData.description}</p>}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant={useV2 ? 'success' : 'default'}>{useV2 ? 'ShadowVoteV2' : 'ShadowVote V1'}</Badge>
                            {formData.weighted && <Badge variant="info">Weighted (FHE.mul)</Badge>}
                            {formData.ipfsCid && <Badge variant="default">IPFS CID set</Badge>}
                          </div>
                        </div>

                        {/* Space info */}
                        <div className="pb-4 border-b border-default">
                          <div className="text-xs text-text-muted uppercase font-bold mb-2">Voting Access</div>
                          {formData.spaceGated && selectedSpace ? (
                            <div className="flex items-center gap-3 p-3 bg-secondary-accent/5 border border-secondary-accent/20 rounded-xl">
                              <div className="text-2xl"><CategoryEmoji label={selectedSpace.categoryLabel} /></div>
                              <div>
                                <div className="font-bold text-sm">{selectedSpace.name}</div>
                                <div className="text-xs text-text-muted">Members only · {Number(selectedSpace.memberCount)} eligible voters</div>
                              </div>
                              <Badge variant="warning" className="ml-auto">Space-Gated</Badge>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-bg-base rounded-xl">
                              <Globe className="w-5 h-5 text-text-muted" />
                              <div>
                                <div className="font-bold text-sm">Global Proposal</div>
                                <div className="text-xs text-text-muted">Open to all wallet holders</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pb-4 border-b border-default">
                          <div className="text-xs text-text-muted uppercase font-bold mb-1">Options</div>
                          <div className="flex flex-wrap gap-2">
                            {formData.options.map((o, i) => <Badge key={i} variant="info">{o}</Badge>)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-text-muted uppercase font-bold mb-1">Duration</div>
                            <div className="font-bold">
                              {formData.customDate
                                ? new Date(formData.customDate).toLocaleString()
                                : DURATION_OPTIONS.find((o) => o.minutes === formData.durationMinutes)?.label || `${formData.durationMinutes} min`}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-text-muted uppercase font-bold mb-1">Quorum</div>
                            <div className="font-bold">{formData.quorum} votes</div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-surface-highlight rounded-xl flex gap-3">
                        <Shield className="w-5 h-5 text-primary-accent shrink-0" />
                        <p className="text-xs text-primary-accent leading-relaxed">
                          All votes will be FHE-encrypted via Fhenix CoFHE. Individual choices are never visible on-chain.
                          Results are computed on ciphertext and revealed only after the deadline.
                        </p>
                      </div>

                      {(error || deployError) && (
                        <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-danger">{deployError ? 'Validation Error' : 'Transaction Failed'}</p>
                            <p className="text-xs text-text-secondary mt-1">{deployError || error}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Button variant="secondary" onClick={() => setStep(4)} className="flex-1" disabled={deploying}>Back</Button>
                        <Button onClick={handleDeploy} className="flex-1 gap-2" disabled={deploying}>
                          {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <>Deploy to Sepolia <ArrowRight className="w-4 h-4" /></>}
                        </Button>
                      </div>
                    </Card>

                    {deploying && (
                      <Card hover={false} className="bg-secondary-accent text-white font-mono text-xs p-6 space-y-2">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                          Initializing FHE encrypted tallies... {deployState === 'confirming' ? '✓' : '...'}
                        </motion.div>
                        {deployState === 'confirming' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {formData.spaceGated ? `Linking to Space #${formData.spaceId?.toString()}... ` : ''}
                            Confirming on-chain...
                          </motion.div>
                        )}
                      </Card>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              /* Success screen */
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-8 text-center">
                <Card hover={false} className="py-12 space-y-6">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                    className="w-20 h-20 bg-primary-accent text-white rounded-full flex items-center justify-center mx-auto"
                  >
                    <CheckCircle2 className="w-10 h-10" />
                  </motion.div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Proposal Deployed!</h3>
                    <p className="text-text-secondary">
                      Your FHE-encrypted proposal is live on Sepolia.
                      {formData.spaceGated && selectedSpace && ` Voting restricted to ${selectedSpace.name} members.`}
                    </p>
                  </div>

                  {txHash && (
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="bg-bg-base p-4 rounded-xl space-y-2">
                        <div className="text-[10px] text-text-muted uppercase font-bold">Transaction Hash</div>
                        <div className="font-mono text-xs break-all text-text-primary">{txHash}</div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="flex-1 gap-2" onClick={() => navigator.clipboard.writeText(txHash)}>
                            <Copy className="w-3 h-3" /> Copy
                          </Button>
                          <a href={etherscanTx(txHash)} target="_blank" rel="noopener noreferrer" className="flex-1">
                            <Button variant="ghost" size="sm" className="w-full gap-2"><ExternalLink className="w-3 h-3" /> Etherscan</Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {proposalId !== null && (
                    <div className="max-w-xs mx-auto">
                      <div className="bg-surface-highlight p-4 rounded-xl space-y-2">
                        <div className="text-[10px] text-text-muted uppercase font-bold">Voting Link</div>
                        <div className="font-mono text-xs break-all text-primary-accent">
                          {window.location.origin}/app/proposal/{proposalId.toString()}
                        </div>
                        <Button variant="ghost" size="sm" className="w-full gap-2"
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/app/proposal/${proposalId.toString()}`)}>
                          <Link2 className="w-3 h-3" /> Copy Voting Link
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button onClick={() => navigate(proposalId !== null ? `/app/proposal/${proposalId.toString()}` : '/app/proposals')} className="w-full">
                      {proposalId !== null ? 'Go to Proposal' : 'View Proposals'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      reset(); setStep(1);
                      setFormData({ title: '', description: '', options: ['', ''], durationMinutes: 4320, customDate: '', quorum: 10, spaceId: null, spaceGated: false });
                    }} className="w-full">
                      Create Another
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
