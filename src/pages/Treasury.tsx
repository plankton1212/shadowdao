import React from 'react';
import { Shield, Database, Lock, AlertCircle } from 'lucide-react';
import { Card, Badge, AppLayout, PageWrapper } from '../components/UI';

export const Treasury = () => {
  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Treasury</h2>
            <p className="text-text-secondary">Manage DAO assets with FHE privacy</p>
          </div>

          <Card accent hover={false} className="p-8 relative overflow-hidden">
            <div className="relative z-10 space-y-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                <Database className="w-8 h-8 text-[#1A3A20]" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[#1A3A20]">ShadowTreasury</h3>
                <p className="text-sm text-[#1A3A20]/70 max-w-md mx-auto">
                  Encrypted treasury management with FHE-protected balances (euint64), allocation proposals linked to
                  ShadowVote, and on-chain solvency checks via FHE.gte.
                </p>
              </div>

              <Badge variant="warning">Not deployed yet</Badge>

              <div className="flex items-center justify-center gap-2 text-xs text-[#1A3A20]/60">
                <Lock className="w-3 h-3" /> ShadowTreasury.sol — Wave 3
              </div>
            </div>

            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          </Card>

          <Card hover={false} className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary-accent" />
              <h3 className="font-bold">Planned Features</h3>
            </div>
            <ul className="space-y-3 text-sm text-text-secondary">
              <li className="flex items-start gap-2">
                <span className="text-text-muted mt-0.5">1.</span>
                <span>Encrypted balance via euint64 with permit-based reveal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-text-muted mt-0.5">2.</span>
                <span>Deposit ETH via payable function</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-text-muted mt-0.5">3.</span>
                <span>Propose allocations linked to ShadowVote proposals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-text-muted mt-0.5">4.</span>
                <span>Execute allocations after vote passes with FHE.gte solvency check</span>
              </li>
            </ul>
          </Card>

          <div className="p-4 bg-surface-tinted rounded-xl border border-default flex gap-3">
            <AlertCircle className="w-5 h-5 text-tertiary-accent shrink-0" />
            <p className="text-xs text-text-secondary leading-relaxed">
              Treasury functionality requires ShadowTreasury.sol to be deployed. All balance data will come from the
              blockchain via FHE-encrypted reads. No mock data is displayed.
            </p>
          </div>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
