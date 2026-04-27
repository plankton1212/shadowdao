import React, { useState, useEffect } from 'react';
import {
  Wallet, Shield, Bell, Key, Copy, Lock, AlertCircle,
  ExternalLink, Globe, Vote as VoteIcon, Eye, EyeOff,
  CheckCircle2, Moon, Sun, Clock, Gauge, Volume2, VolumeX, Palette,
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

const SETTINGS_KEY = 'shadowdao-settings';

interface SavedSettings {
  autoReveal: boolean;
  confirmBeforeVote: boolean;
  defaultQuorum: string;
  defaultDuration: string;
  hideBalance: boolean;
  autoPermit: boolean;
  showVoteHistory: boolean;
  notifyNewProposal: boolean;
  notifyDeadline: boolean;
  notifyResults: boolean;
  notifyMembers: boolean;
  soundEnabled: boolean;
  compactMode: boolean;
  showQuorumPercent: boolean;
  dateFormat: string;
}

const DEFAULTS: SavedSettings = {
  autoReveal: true,
  confirmBeforeVote: true,
  defaultQuorum: '10',
  defaultDuration: '4320',
  hideBalance: true,
  autoPermit: true,
  showVoteHistory: false,
  notifyNewProposal: true,
  notifyDeadline: true,
  notifyResults: true,
  notifyMembers: false,
  soundEnabled: false,
  compactMode: false,
  showQuorumPercent: true,
  dateFormat: 'relative',
};

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export const Settings = () => {
  const { address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  const navigate = useNavigate();
  const { proposals } = useProposals();

  const [showBalance, setShowBalance] = useState(false);
  const [copied, setCopied] = useState(false);

  // Theme — stored separately (used in main.tsx on boot)
  const [darkMode, setDarkMode] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('shadowdao-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // All other settings — loaded from & persisted to localStorage
  const [settings, setSettings] = useState<SavedSettings>(loadSettings);

  const set = <K extends keyof SavedSettings>(key: K, value: SavedSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const {
    autoReveal, confirmBeforeVote, defaultQuorum, defaultDuration,
    hideBalance, autoPermit, showVoteHistory,
    notifyNewProposal, notifyDeadline, notifyResults, notifyMembers, soundEnabled,
    compactMode, showQuorumPercent, dateFormat,
  } = settings;

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
                <Toggle checked={confirmBeforeVote} onChange={v => set('confirmBeforeVote', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Auto-reveal after deadline</div>
                  <div className="text-xs text-text-muted">Automatically trigger reveal when deadline passes and quorum met</div>
                </div>
                <Toggle checked={autoReveal} onChange={v => set('autoReveal', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Default quorum</div>
                  <div className="text-xs text-text-muted">Pre-fill quorum when creating proposals</div>
                </div>
                <Select value={defaultQuorum} onChange={v => set('defaultQuorum', v)} options={[
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
                <Select value={defaultDuration} onChange={v => set('defaultDuration', v)} options={[
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
              <div className="flex items-center justify-between p-3 bg-surface-highlight rounded-xl">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary-accent" />
                    FHE Shielded Voting
                  </div>
                  <div className="text-xs text-text-muted">Always on — all ballots encrypted via Fhenix CoFHE before submission</div>
                </div>
                <span className="px-2 py-1 bg-primary-accent/10 text-primary-accent text-[10px] font-bold rounded-badge uppercase">Always On</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Hide wallet balance</div>
                  <div className="text-xs text-text-muted">Show balance as hidden by default on dashboard</div>
                </div>
                <Toggle checked={hideBalance} onChange={v => set('hideBalance', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Auto-create FHE permit</div>
                  <div className="text-xs text-text-muted">Automatically request EIP-712 permit when decrypting results</div>
                </div>
                <Toggle checked={autoPermit} onChange={v => set('autoPermit', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Public voting history</div>
                  <div className="text-xs text-text-muted">Show which proposals you participated in (not your choices)</div>
                </div>
                <Toggle checked={showVoteHistory} onChange={v => set('showVoteHistory', v)} />
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
                <Toggle checked={compactMode} onChange={v => set('compactMode', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Show quorum percentage</div>
                  <div className="text-xs text-text-muted">Display quorum as percentage alongside vote count</div>
                </div>
                <Toggle checked={showQuorumPercent} onChange={v => set('showQuorumPercent', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Date format</div>
                  <div className="text-xs text-text-muted">How deadlines are displayed</div>
                </div>
                <Select value={dateFormat} onChange={v => set('dateFormat', v)} options={[
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
                <Toggle checked={notifyNewProposal} onChange={v => set('notifyNewProposal', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Deadline approaching</div>
                  <div className="text-xs text-text-muted">Reminder 1 hour before voting ends</div>
                </div>
                <Toggle checked={notifyDeadline} onChange={v => set('notifyDeadline', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Results revealed</div>
                  <div className="text-xs text-text-muted">When encrypted tallies are decrypted</div>
                </div>
                <Toggle checked={notifyResults} onChange={v => set('notifyResults', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold">Member activity</div>
                  <div className="text-xs text-text-muted">When someone joins your Space</div>
                </div>
                <Toggle checked={notifyMembers} onChange={v => set('notifyMembers', v)} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold flex items-center gap-2">
                    Sound effects {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3 text-text-muted" />}
                  </div>
                  <div className="text-xs text-text-muted">Play sound on notifications</div>
                </div>
                <Toggle checked={soundEnabled} onChange={v => set('soundEnabled', v)} />
              </div>
            </div>
          </Card>

          {/* Theme */}
          <Card hover={false} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-full flex items-center justify-center">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Theme</h3>
                <p className="text-xs text-text-muted">Visual appearance</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-bold flex items-center gap-2">
                  {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  {darkMode ? 'Dark mode' : 'Light mode'}
                </div>
                <div className="text-xs text-text-muted">Saved in browser, persists across sessions</div>
              </div>
              <Toggle checked={darkMode} onChange={setDarkMode} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Light', value: false, bg: 'bg-[#F0F7F2]', text: 'text-[#161616]', border: '' },
                { label: 'Dark', value: true, bg: 'bg-[#0E1512]', text: 'text-[#EDF5F0]', border: '' },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setDarkMode(opt.value)}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all text-left',
                    opt.bg,
                    darkMode === opt.value ? 'border-primary-accent' : 'border-transparent'
                  )}
                >
                  <div className={cn('text-sm font-bold', opt.text)}>{opt.label}</div>
                  <div className="flex gap-1 mt-2">
                    {[opt.value ? '#4ACA82' : '#1A8C52', opt.value ? '#1A2420' : '#FFFFFF', opt.value ? '#0E1512' : '#F0F7F2'].map(c => (
                      <div key={c} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </button>
              ))}
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
              <CheckCircle2 className="w-3 h-3 text-primary-accent" /> Settings saved automatically to your browser
            </div>
          </div>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
