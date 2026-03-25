import React, { useState } from 'react';
import {
  Wallet, Shield, Bell, Key, Copy, Lock, AlertCircle,
  ExternalLink, Globe, Vote as VoteIcon, Eye, EyeOff,
  CheckCircle2, Moon, Sun, Clock, Gauge, Volume2, VolumeX,
} from 'lucide-react';
import { Card, AppLayout, PageWrapper, Button } from '../components/UI';
import { useAccount, useDisconnect, useSwitchChain, useBalance } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useNavigate } from 'react-router-dom';
import { useProposals } from '../hooks/useProposals';
import { etherscanAddress, SHADOWVOTE_ADDRESS, SHADOWSPACE_ADDRESS } from '../config/contract';
import { cn } from '../utils';

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    className={cn(
      'relative w-12 h-7 rounded-full transition-colors shrink-0',
      disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      checked ? 'bg-primary-accent' : 'bg-bg-base border border-default'
    )}
  >
    <div className={cn(
      'absolute top-[3px] w-5 h-5 bg-white rounded-full shadow transition-transform',
      checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
    )} />
  </button>
);

const Select = ({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-2 rounded-input border border-default bg-white text-sm font-medium focus:ring-2 focus:ring-primary-accent/20 focus:border-primary-accent outline-none appearance-none cursor-pointer"
  >
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export const Settings = () => {
  const { address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  const navigate = useNavigate();
  const { proposals } = useProposals();

  const [showBalance, setShowBalance] = useState(false);
  const [copied, setCopied] = useState(false);

  // Voting preferences
  const [autoReveal, setAutoReveal] = useState(true);
  const [confirmBeforeVote, setConfirmBeforeVote] = useState(true);
  const [defaultQuorum, setDefaultQuorum] = useState('10');
  const [defaultDuration, setDefaultDuration] = useState('4320');

  // Privacy
  const [hideBalance, setHideBalance] = useState(true);
  const [autoPermit, setAutoPermit] = useState(true);
  const [showVoteHistory, setShowVoteHistory] = useState(false);

  // Notifications
  const [notifyNewProposal, setNotifyNewProposal] = useState(true);
  const [notifyDeadline, setNotifyDeadline] = useState(true);
  const [notifyResults, setNotifyResults] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Display
  const [compactMode, setCompactMode] = useState(false);
  const [showQuorumPercent, setShowQuorumPercent] = useState(true);
  const [dateFormat, setDateFormat] = useState('relative');

  const wrongNetwork = chainId !== sepolia.id;
  const myProposals = proposals.filter((p) => p.creator.toLowerCase() === address?.toLowerCase());

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Settings</h2>
            <p className="text-text-secondary">Customize your ShadowDAO experience</p>
          </div>

          {/* Account */}
          <Card hover={false} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Account</h3>
                <p className="text-xs text-text-muted">Wallet and network</p>
              </div>
            </div>

            <div className="p-4 bg-bg-base rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Address</div>
                  <div className="font-mono text-sm font-bold text-secondary-accent">{address}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={copyAddress}>
                    {copied ? <CheckCircle2 className="w-4 h-4 text-primary-accent" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <a href={etherscanAddress(address || '')} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="p-2 h-auto"><ExternalLink className="w-4 h-4" /></Button>
                  </a>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-default">
                <div className="space-y-1">
                  <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Balance</div>
                  <div className="font-mono text-sm font-bold">
                    {showBalance ? `${balance ? (Number(balance.value) / 1e18).toFixed(4) : '0.0000'} ${balance?.symbol || 'ETH'}` : '••••••'}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => setShowBalance(!showBalance)}>
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-default">
                {wrongNetwork ? (
                  <button onClick={() => switchChain({ chainId: sepolia.id })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 text-warning rounded-badge text-xs font-bold">
                    <AlertCircle className="w-3 h-3" /> Wrong Network — Switch to Sepolia
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-highlight text-primary-accent rounded-badge text-xs font-bold">
                    <div className="w-2 h-2 bg-primary-accent rounded-full" /> Ethereum Sepolia
                  </div>
                )}
                <div className="text-xs text-text-muted">Chain ID: {chainId}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-bg-base rounded-xl text-center">
                <div className="text-lg font-bold">{myProposals.length}</div>
                <div className="text-[10px] text-text-muted uppercase font-bold">Created</div>
              </div>
              <div className="p-3 bg-bg-base rounded-xl text-center">
                <div className="text-lg font-bold">{proposals.length}</div>
                <div className="text-[10px] text-text-muted uppercase font-bold">Total</div>
              </div>
            </div>

            <Button variant="outline" onClick={() => { disconnect(); navigate('/'); }}
              className="w-full text-danger border-danger/20 hover:bg-danger/5">
              Disconnect Wallet
            </Button>
          </Card>

          {/* Voting Preferences */}
          <Card hover={false} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-full flex items-center justify-center">
                <VoteIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Voting</h3>
                <p className="text-xs text-text-muted">Default proposal settings and behavior</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Confirm before voting</div>
                  <div className="text-xs text-text-muted">Show confirmation dialog before submitting encrypted ballot</div>
                </div>
                <Toggle checked={confirmBeforeVote} onChange={setConfirmBeforeVote} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Auto-reveal after deadline</div>
                  <div className="text-xs text-text-muted">Automatically trigger reveal when deadline passes and quorum met</div>
                </div>
                <Toggle checked={autoReveal} onChange={setAutoReveal} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Default quorum</div>
                  <div className="text-xs text-text-muted">Pre-fill quorum when creating proposals</div>
                </div>
                <Select value={defaultQuorum} onChange={setDefaultQuorum} options={[
                  { value: '1', label: '1 vote' },
                  { value: '5', label: '5 votes' },
                  { value: '10', label: '10 votes' },
                  { value: '25', label: '25 votes' },
                  { value: '50', label: '50 votes' },
                  { value: '100', label: '100 votes' },
                ]} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Default duration</div>
                  <div className="text-xs text-text-muted">Pre-fill voting period when creating proposals</div>
                </div>
                <Select value={defaultDuration} onChange={setDefaultDuration} options={[
                  { value: '10', label: '10 min' },
                  { value: '60', label: '1 hour' },
                  { value: '1440', label: '1 day' },
                  { value: '4320', label: '3 days' },
                  { value: '10080', label: '7 days' },
                  { value: '20160', label: '14 days' },
                  { value: '43200', label: '30 days' },
                ]} />
              </div>
            </div>
          </Card>

          {/* Privacy & FHE */}
          <Card hover={false} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#EDEFFD] text-tertiary-accent rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Privacy</h3>
                <p className="text-xs text-text-muted">FHE encryption and data visibility</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">FHE Shielded Voting</div>
                  <div className="text-xs text-text-muted">All ballots encrypted before on-chain submission</div>
                </div>
                <Toggle checked={true} onChange={() => {}} disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Hide wallet balance</div>
                  <div className="text-xs text-text-muted">Show balance as hidden by default on dashboard</div>
                </div>
                <Toggle checked={hideBalance} onChange={setHideBalance} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Auto-create FHE permit</div>
                  <div className="text-xs text-text-muted">Automatically request EIP-712 permit when decrypting results</div>
                </div>
                <Toggle checked={autoPermit} onChange={setAutoPermit} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Public voting history</div>
                  <div className="text-xs text-text-muted">Show which proposals you participated in (not your choices)</div>
                </div>
                <Toggle checked={showVoteHistory} onChange={setShowVoteHistory} />
              </div>
            </div>
          </Card>

          {/* Display */}
          <Card hover={false} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-full flex items-center justify-center">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Display</h3>
                <p className="text-xs text-text-muted">Interface preferences</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Compact proposal cards</div>
                  <div className="text-xs text-text-muted">Show proposals in a condensed list view</div>
                </div>
                <Toggle checked={compactMode} onChange={setCompactMode} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Show quorum percentage</div>
                  <div className="text-xs text-text-muted">Display quorum as percentage alongside vote count</div>
                </div>
                <Toggle checked={showQuorumPercent} onChange={setShowQuorumPercent} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Date format</div>
                  <div className="text-xs text-text-muted">How deadlines are displayed</div>
                </div>
                <Select value={dateFormat} onChange={setDateFormat} options={[
                  { value: 'relative', label: 'Relative (2d 5h left)' },
                  { value: 'absolute', label: 'Absolute (Mar 25, 18:00)' },
                  { value: 'both', label: 'Both' },
                ]} />
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card hover={false} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FEF3CD] text-warning rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Notifications</h3>
                <p className="text-xs text-text-muted">In-app alerts and reminders</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">New proposals</div>
                  <div className="text-xs text-text-muted">When a new proposal is created</div>
                </div>
                <Toggle checked={notifyNewProposal} onChange={setNotifyNewProposal} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Deadline approaching</div>
                  <div className="text-xs text-text-muted">Reminder 1 hour before voting ends</div>
                </div>
                <Toggle checked={notifyDeadline} onChange={setNotifyDeadline} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Results revealed</div>
                  <div className="text-xs text-text-muted">When encrypted tallies are decrypted</div>
                </div>
                <Toggle checked={notifyResults} onChange={setNotifyResults} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Member activity</div>
                  <div className="text-xs text-text-muted">When someone joins your Space</div>
                </div>
                <Toggle checked={notifyMembers} onChange={setNotifyMembers} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold flex items-center gap-2">
                    Sound effects {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3 text-text-muted" />}
                  </div>
                  <div className="text-xs text-text-muted">Play sound on notifications</div>
                </div>
                <Toggle checked={soundEnabled} onChange={setSoundEnabled} />
              </div>
            </div>
          </Card>

          {/* Contracts */}
          <Card hover={false} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Contracts</h3>
                <p className="text-xs text-text-muted">Deployed on Ethereum Sepolia</p>
              </div>
            </div>

            {[
              { name: 'ShadowVote.sol', address: SHADOWVOTE_ADDRESS, desc: 'FHE-encrypted voting' },
              { name: 'ShadowSpace.sol', address: SHADOWSPACE_ADDRESS, desc: 'DAO registry' },
            ].map((c) => (
              <a key={c.name} href={etherscanAddress(c.address)} target="_blank" rel="noopener noreferrer"
                className="flex justify-between items-center p-4 bg-bg-base rounded-xl hover:bg-surface-tinted transition-colors">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold flex items-center gap-2">{c.name} <ExternalLink className="w-3 h-3 text-text-muted" /></div>
                  <div className="font-mono text-[10px] text-text-muted">{c.address}</div>
                </div>
                <div className="text-xs text-primary-accent font-bold">Deployed</div>
              </a>
            ))}
          </Card>

          <div className="text-center pt-4">
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
              <Lock className="w-3 h-3" /> Settings are session-only and reset on refresh
            </div>
          </div>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
