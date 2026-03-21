import React from 'react';
import { Wallet, Shield, Bell, Key, ExternalLink, Copy, Trash2, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { Card, Badge, AppLayout, PageWrapper, Button } from '../components/UI';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { formatAddress } from '../utils';
import { useNavigate } from 'react-router-dom';

export const Settings = () => {
  const { address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const navigate = useNavigate();

  const wrongNetwork = chainId !== sepolia.id;

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Settings</h2>
            <p className="text-text-secondary">Manage your account and privacy preferences</p>
          </div>

          {/* Wallet Section */}
          <Card hover={false} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-highlight text-primary-accent rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold">Wallet Connection</h3>
            </div>

            <div className="p-4 bg-bg-base rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-xs text-text-muted uppercase font-bold tracking-widest">Connected Address</div>
                  <div className="font-mono text-sm font-bold text-secondary-accent">{address}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 h-auto"
                    onClick={() => address && navigator.clipboard.writeText(address)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                {wrongNetwork ? (
                  <button
                    onClick={() => switchChain({ chainId: sepolia.id })}
                    className="flex items-center gap-2 px-3 py-1 bg-warning/10 text-warning rounded-badge text-xs font-bold"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Wrong Network — Click to Switch
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-surface-highlight text-primary-accent rounded-badge text-xs font-bold">
                    <div className="w-2 h-2 bg-primary-accent rounded-full" />
                    Ethereum Sepolia
                  </div>
                )}
                <div className="text-xs text-text-muted">Chain ID: {chainId}</div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                disconnect();
                navigate('/');
              }}
              className="w-full text-danger border-danger/20 hover:bg-danger/5"
            >
              Disconnect Wallet
            </Button>
          </Card>

          {/* Privacy & Permits */}
          <Card hover={false} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#EDEFFD] text-tertiary-accent rounded-full flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold">FHE Permits</h3>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed">
              Permits allow you to view your own encrypted data (like your votes) without submitting a transaction. They
              use EIP-712 signatures and are managed by the CoFHE SDK.
            </p>

            <div className="p-4 bg-surface-highlight rounded-xl text-sm text-primary-accent">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Shield className="w-4 h-4" /> CoFHE Managed
              </div>
              <p className="text-xs text-primary-accent/70">
                FHE permits are automatically managed by the CoFHE SDK when you interact with encrypted data.
              </p>
            </div>
          </Card>

          {/* Notifications */}
          <Card hover={false} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FEF3CD] text-warning rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold">Notifications</h3>
            </div>

            <div className="space-y-4">
              {[
                { label: 'New Proposals', desc: 'Get notified when a new proposal is created' },
                { label: 'Voting Deadlines', desc: 'Reminders for proposals ending soon' },
                { label: 'Results Revealed', desc: 'Alerts when aggregate results are decrypted' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold">{item.label}</div>
                    <div className="text-xs text-text-muted">{item.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                    <div className="w-11 h-6 bg-bg-base peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-accent"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>

          {/* Security Info */}
          <div className="text-center space-y-4 pt-4">
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
              <Lock className="w-3 h-3" /> All settings are stored locally
            </div>
            <p className="text-[10px] text-text-muted max-w-xs mx-auto">
              ShadowDAO uses Fhenix FHE encryption to ensure your privacy. Your vote choices are mathematically
              protected from all parties.
            </p>
          </div>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
