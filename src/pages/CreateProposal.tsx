import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  X,
  Calendar,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Lock,
  Info,
  Clock,
  Copy,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, AppLayout, PageWrapper, Button } from '../components/UI';
import { useCreateProposal } from '../hooks/useCreateProposal';
import { cn } from '../utils';
import { QRCodeSVG } from 'qrcode.react';

export const CreateProposal = () => {
  const navigate = useNavigate();
  const { createProposal, deployState, txHash, error, reset } = useCreateProposal();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    options: ['', ''],
    durationDays: 3,
    quorum: 10,
  });

  const handleAddOption = () => {
    if (formData.options.length < 10) {
      setFormData({ ...formData, options: [...formData.options, ''] });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData({ ...formData, options: newOptions });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const sanitize = (s: string) => s.trim().replace(/[<>]/g, '');

  const handleDeploy = async () => {
    const title = sanitize(formData.title);
    if (!title || title.length < 3 || title.length > 200) return;
    const validOptions = formData.options.filter((o) => sanitize(o).length > 0);
    if (validOptions.length < 2 || validOptions.length > 10) return;

    const deadlineTimestamp = Math.floor(Date.now() / 1000) + formData.durationDays * 24 * 60 * 60;
    if (formData.quorum < 1) return;

    await createProposal(title, validOptions.length, deadlineTimestamp, formData.quorum);
  };

  const steps = [
    { id: 1, name: 'Details' },
    { id: 2, name: 'Options' },
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
            <h2 className="text-3xl font-bold">Create Proposal</h2>
            <p className="text-text-secondary">Deploy an encrypted vote on Ethereum Sepolia</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between px-4">
            {steps.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all',
                      step > s.id
                        ? 'bg-primary-accent text-white'
                        : step === s.id
                          ? 'bg-surface-highlight text-primary-accent ring-4 ring-primary-accent/10'
                          : 'bg-bg-base text-text-muted'
                    )}
                  >
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
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {step === 1 && (
                  <Card hover={false} className="space-y-6">
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
                        <label className="text-sm font-bold text-text-secondary">Description (Optional)</label>
                        <textarea
                          placeholder="Provide context for your proposal..."
                          rows={4}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                    <Button onClick={() => setStep(2)} disabled={!formData.title} className="w-full gap-2">
                      Next Step <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Card>
                )}

                {step === 2 && (
                  <Card hover={false} className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-text-secondary">Voting Options</label>
                      {formData.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <div className="flex-1 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-sm">
                              {i + 1}
                            </span>
                            <input
                              type="text"
                              placeholder={`Option ${i + 1}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(i, e.target.value)}
                              className="w-full pl-10 pr-4 py-3 rounded-input border border-default focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none transition-all"
                            />
                          </div>
                          {formData.options.length > 2 && (
                            <button
                              onClick={() => handleRemoveOption(i)}
                              className="p-3 text-text-muted hover:text-danger transition-colors"
                            >
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
                      <Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
                        Back
                      </Button>
                      <Button onClick={() => setStep(3)} disabled={formData.options.some((o) => !o)} className="flex-1">
                        Next
                      </Button>
                    </div>
                  </Card>
                )}

                {step === 3 && (
                  <Card hover={false} className="space-y-6">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Voting Duration (days)</label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="1"
                            max="30"
                            step="1"
                            value={formData.durationDays}
                            onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value) })}
                            className="flex-1 h-2 bg-bg-base rounded-full appearance-none cursor-pointer accent-primary-accent"
                          />
                          <div className="w-20 text-center font-bold text-secondary-accent">
                            {formData.durationDays}d
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-text-secondary">Quorum Threshold</label>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            value={formData.quorum}
                            onChange={(e) => setFormData({ ...formData, quorum: parseInt(e.target.value) })}
                            className="flex-1 h-2 bg-bg-base rounded-full appearance-none cursor-pointer accent-primary-accent"
                          />
                          <div className="w-20 text-center font-bold text-secondary-accent">{formData.quorum}</div>
                        </div>
                        <p className="text-[10px] text-text-muted">Minimum votes required for a valid result</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
                        Back
                      </Button>
                      <Button onClick={() => setStep(4)} className="flex-1">
                        Next
                      </Button>
                    </div>
                  </Card>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <Card hover={false} className="space-y-6">
                      <h3 className="text-xl font-bold">Review Proposal</h3>
                      <div className="space-y-4">
                        <div className="pb-4 border-b border-default">
                          <div className="text-xs text-text-muted uppercase font-bold mb-1">Title</div>
                          <div className="font-bold text-lg">{formData.title}</div>
                        </div>
                        <div className="pb-4 border-b border-default">
                          <div className="text-xs text-text-muted uppercase font-bold mb-1">Options</div>
                          <div className="flex flex-wrap gap-2">
                            {formData.options.map((o, i) => (
                              <Badge key={i} variant="info">
                                {o}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-text-muted uppercase font-bold mb-1">Duration</div>
                            <div className="font-bold">{formData.durationDays} Days</div>
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
                          All votes will be FHE-encrypted. Individual choices are never visible on-chain. Results are
                          computed on ciphertext.
                        </p>
                      </div>

                      {error && (
                        <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-danger shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-danger">Transaction Failed</p>
                            <p className="text-xs text-text-secondary mt-1">{error}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <Button variant="secondary" onClick={() => setStep(3)} className="flex-1" disabled={deploying}>
                          Back
                        </Button>
                        <Button onClick={handleDeploy} className="flex-1 gap-2" disabled={deploying}>
                          {deploying ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Deploying...
                            </>
                          ) : (
                            <>
                              Deploy to Sepolia <ArrowRight className="w-4 h-4" />
                            </>
                          )}
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
                            Confirming on-chain...
                          </motion.div>
                        )}
                      </Card>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-8 text-center"
              >
                <Card hover={false} className="py-12 space-y-6">
                  <div className="w-20 h-20 bg-primary-accent text-white rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">Proposal Deployed!</h3>
                    <p className="text-text-secondary">Your private proposal is now live and accepting votes on Sepolia.</p>
                  </div>

                  {txHash && (
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="bg-bg-base p-4 rounded-xl space-y-2">
                        <div className="text-[10px] text-text-muted uppercase font-bold">Transaction Hash</div>
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
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button onClick={() => navigate('/app/proposals')} className="w-full">
                      View Proposals
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        reset();
                        setStep(1);
                        setFormData({
                          title: '',
                          description: '',
                          options: ['', ''],
                          durationDays: 3,
                          quorum: 10,
                        });
                      }}
                      className="w-full"
                    >
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
