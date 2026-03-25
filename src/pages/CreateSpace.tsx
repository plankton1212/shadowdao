import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, Users, Shield, Lock, CheckCircle2, ArrowRight,
  Plus, X, AlertCircle, Loader2, Copy, Link2, ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, AppLayout, PageWrapper, Button } from '../components/UI';
import { useCreateSpace } from '../hooks/useCreateSpace';
import { CATEGORY_LABELS, etherscanTx } from '../config/contract';
import { cn } from '../utils';

export const CreateSpace = () => {
  const navigate = useNavigate();
  const { createSpace, deployState, txHash, spaceId, error, reset } = useCreateSpace();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: -1,
    isPublic: true,
    defaultQuorum: 5,
    memberAddresses: [''],
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const sanitize = (s: string) => s.trim().replace(/[<>&"'/]/g, '');

  const handleDeploy = async () => {
    setValidationError(null);
    const name = sanitize(formData.name);
    if (!name || name.length < 2) {
      setValidationError('Name must be at least 2 characters');
      return;
    }
    if (formData.category < 0) {
      setValidationError('Please select a category');
      return;
    }

    const validMembers = formData.memberAddresses
      .map((a) => a.trim())
      .filter((a) => a && a.startsWith('0x') && a.length === 42);

    await createSpace(name, sanitize(formData.description), formData.category, formData.isPublic, formData.defaultQuorum, validMembers);
  };

  const handleAddMember = () => {
    setFormData((prev) => ({ ...prev, memberAddresses: [...prev.memberAddresses, ''] }));
  };

  const handleRemoveMember = (index: number) => {
    if (formData.memberAddresses.length > 1) {
      setFormData((prev) => ({ ...prev, memberAddresses: prev.memberAddresses.filter((_, i) => i !== index) }));
    }
  };

  const steps = [
    { id: 1, name: 'Identity' },
    { id: 2, name: 'Members' },
    { id: 3, name: 'Config' },
    { id: 4, name: 'Review' },
  ];

  const deployed = deployState === 'success';
  const deploying = deployState === 'submitting' || deployState === 'confirming';

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Create Space</h2>
            <p className="text-text-secondary">Deploy a private DAO on Ethereum Sepolia</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between px-4">
            {steps.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all',
                    step > s.id ? 'bg-primary-accent text-white'
                      : step === s.id ? 'bg-surface-highlight text-primary-accent ring-4 ring-primary-accent/10'
                        : 'bg-bg-base text-text-muted'
                  )}>
                    {step > s.id ? <CheckCircle2 className="w-6 h-6" /> : s.id}
                  </div>
                  <span className={cn('text-xs font-bold', step === s.id ? 'text-primary-accent' : 'text-text-muted')}>
                    {s.name}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('flex-1 h-1 mx-4 rounded-full', step > s.id ? 'bg-primary-accent' : 'bg-bg-base')} />
                )}
              </React.Fragment>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {!deployed ? (
              <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Step 1: Identity */}
                {step === 1 && (
                  <Card hover={false} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Space Name</label>
                        <input type="text" placeholder="e.g. Fhenix Governance" value={formData.name}
                          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Description</label>
                        <textarea placeholder="What is this DAO about?" rows={3} value={formData.description}
                          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                          className="w-full px-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none resize-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Category</label>
                        <div className="grid grid-cols-4 gap-2">
                          {CATEGORY_LABELS.map((cat, i) => (
                            <button key={cat} onClick={() => setFormData((prev) => ({ ...prev, category: i }))}
                              className={cn(
                                'py-2.5 px-3 rounded-input border-2 text-sm font-medium transition-all',
                                formData.category === i
                                  ? 'border-primary-accent bg-surface-highlight text-primary-accent'
                                  : 'border-default bg-white text-text-secondary hover:border-primary-accent/30'
                              )}>
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => setStep(2)} disabled={!formData.name || formData.category < 0} className="w-full gap-2">
                      Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Card>
                )}

                {/* Step 2: Members */}
                {step === 2 && (
                  <Card hover={false} className="space-y-6">
                    <div className="space-y-4">
                      <div className="p-3 bg-surface-tinted rounded-xl flex gap-3 items-center">
                        <Globe className="w-4 h-4 text-primary-accent shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm font-medium">Membership</span>
                          <p className="text-xs text-text-muted">Who can join this Space?</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setFormData((prev) => ({ ...prev, isPublic: true }))}
                            className={cn('px-3 py-1.5 rounded-pill text-xs font-bold', formData.isPublic ? 'bg-primary-accent text-white' : 'bg-bg-base text-text-muted')}>
                            Open
                          </button>
                          <button onClick={() => setFormData((prev) => ({ ...prev, isPublic: false }))}
                            className={cn('px-3 py-1.5 rounded-pill text-xs font-bold', !formData.isPublic ? 'bg-primary-accent text-white' : 'bg-bg-base text-text-muted')}>
                            Invite Only
                          </button>
                        </div>
                      </div>
                      <label className="text-sm font-bold text-text-secondary">Initial Members (optional)</label>
                      {formData.memberAddresses.map((addr, i) => (
                        <div key={i} className="flex gap-2">
                          <input type="text" placeholder="0x..." value={addr}
                            onChange={(e) => {
                              const updated = [...formData.memberAddresses];
                              updated[i] = e.target.value;
                              setFormData((prev) => ({ ...prev, memberAddresses: updated }));
                            }}
                            className="flex-1 px-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none font-mono text-sm" />
                          {formData.memberAddresses.length > 1 && (
                            <button onClick={() => handleRemoveMember(i)} className="p-3 text-text-muted hover:text-danger"><X className="w-5 h-5" /></button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" onClick={handleAddMember} className="w-full gap-2 border-dashed">
                        <Plus className="w-4 h-4" /> Add Member
                      </Button>
                    </div>
                    <div className="flex gap-4">
                      <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">Back</Button>
                      <Button onClick={() => setStep(3)} className="flex-1">Next</Button>
                    </div>
                  </Card>
                )}

                {/* Step 3: Config */}
                {step === 3 && (
                  <Card hover={false} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-text-secondary">Default Quorum</label>
                      <div className="flex items-center gap-4">
                        <input type="range" min="1" max="100" value={formData.defaultQuorum}
                          onChange={(e) => setFormData((prev) => ({ ...prev, defaultQuorum: parseInt(e.target.value) }))}
                          className="flex-1 h-2 bg-bg-base rounded-full appearance-none cursor-pointer accent-primary-accent" />
                        <div className="w-16 text-center font-bold">{formData.defaultQuorum}</div>
                      </div>
                      <p className="text-[10px] text-text-muted">Default minimum votes for proposals in this Space</p>
                    </div>
                    <div className="p-4 bg-surface-highlight rounded-xl flex gap-3">
                      <Shield className="w-5 h-5 text-primary-accent shrink-0" />
                      <p className="text-xs text-primary-accent leading-relaxed">
                        All proposals in this Space use FHE-encrypted voting. Individual votes are never visible on-chain.
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">Back</Button>
                      <Button onClick={() => setStep(4)} className="flex-1">Next</Button>
                    </div>
                  </Card>
                )}

                {/* Step 4: Review */}
                {step === 4 && (
                  <div className="space-y-6">
                    <Card hover={false} className="space-y-6">
                      <h3 className="text-xl font-bold">Review Space</h3>
                      <div className="space-y-4">
                        <div className="pb-4 border-b border-default">
                          <div className="text-xs text-text-muted uppercase font-bold mb-1">Name</div>
                          <div className="font-bold text-lg">{formData.name}</div>
                        </div>
                        {formData.description && (
                          <div className="pb-4 border-b border-default">
                            <div className="text-xs text-text-muted uppercase font-bold mb-1">Description</div>
                            <div className="text-sm text-text-secondary">{formData.description}</div>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <div className="text-xs text-text-muted uppercase font-bold mb-1">Category</div>
                            <Badge variant="info">{CATEGORY_LABELS[formData.category]}</Badge>
                          </div>
                          <div>
                            <div className="text-xs text-text-muted uppercase font-bold mb-1">Access</div>
                            <div className="font-bold">{formData.isPublic ? 'Open' : 'Invite Only'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-text-muted uppercase font-bold mb-1">Quorum</div>
                            <div className="font-bold">{formData.defaultQuorum}</div>
                          </div>
                        </div>
                      </div>

                      {(error || validationError) && (
                        <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-danger">{validationError ? 'Validation Error' : 'Transaction Failed'}</p>
                            <p className="text-xs text-text-secondary mt-1">{validationError || error}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Button variant="secondary" onClick={() => setStep(3)} className="flex-1" disabled={deploying}>Back</Button>
                        <Button onClick={handleDeploy} className="flex-1 gap-2" disabled={deploying}>
                          {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <>Deploy Space <ArrowRight className="w-4 h-4" /></>}
                        </Button>
                      </div>
                    </Card>

                    {deploying && (
                      <Card hover={false} className="bg-secondary-accent text-white font-mono text-xs p-6 space-y-2">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          Creating ShadowSpace on Ethereum Sepolia...
                        </motion.div>
                        {deployState === 'confirming' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Confirming on-chain...</motion.div>
                        )}
                      </Card>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-8 text-center">
                <Card hover={false} className="py-12 space-y-6">
                  <div className="w-20 h-20 bg-primary-accent text-white rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Space Created!</h3>
                    <p className="text-text-secondary">Your private DAO is now live on Ethereum Sepolia.</p>
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

                  {spaceId !== null && (
                    <div className="max-w-xs mx-auto">
                      <div className="bg-surface-highlight p-4 rounded-xl space-y-2">
                        <div className="text-[10px] text-text-muted uppercase font-bold">Space Link</div>
                        <div className="font-mono text-xs break-all text-primary-accent">
                          {window.location.origin}/app/space/{spaceId.toString()}
                        </div>
                        <Button variant="ghost" size="sm" className="w-full gap-2"
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/app/space/${spaceId.toString()}`)}>
                          <Link2 className="w-3 h-3" /> Copy Link
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button onClick={() => navigate(spaceId !== null ? `/app/space/${spaceId.toString()}` : '/app/spaces')} className="w-full">
                      {spaceId !== null ? 'Go to Space' : 'View Spaces'}
                    </Button>
                    <Button variant="outline" onClick={() => { reset(); setStep(1); setFormData({ name: '', description: '', category: -1, isPublic: true, defaultQuorum: 5, memberAddresses: [''] }); }} className="w-full">
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
