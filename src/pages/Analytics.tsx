import { BarChart3, TrendingUp, Users, Vote as VoteIcon, Shield, Lock } from 'lucide-react';
import { Card, Badge, AppLayout, PageWrapper } from '../components/UI';

export const Analytics = () => {
  const metrics = [
    {
      title: 'Participation Rate',
      description: 'Track voter turnout across all proposals. See how engagement changes over time.',
      icon: Users,
    },
    {
      title: 'Quorum Achievement',
      description: 'Percentage of proposals that successfully reach their quorum threshold.',
      icon: TrendingUp,
    },
    {
      title: 'Voting History',
      description: 'Your personal voting timeline — which proposals you voted on and when.',
      icon: VoteIcon,
    },
    {
      title: 'Encrypted Governance Report',
      description: 'Aggregate DAO statistics computed on encrypted data — totals without revealing individual votes.',
      icon: Lock,
    },
  ];

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">Analytics</h2>
              <Badge variant="warning">Wave 4</Badge>
            </div>
            <p className="text-text-secondary">Governance insights powered by on-chain data and FHE</p>
          </div>

          <Card hover={false} className="bg-surface-accent p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8 text-secondary-accent" />
            </div>
            <h3 className="text-xl font-bold text-secondary-accent">Governance Analytics</h3>
            <p className="text-sm text-secondary-accent/70 max-w-md mx-auto">
              Real-time participation metrics, quorum tracking, and encrypted governance reports —
              all derived from on-chain events via getLogs.
            </p>
            <Badge variant="default">Not deployed yet</Badge>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.title} hover={false} className="space-y-3">
                  <div className="w-10 h-10 bg-surface-highlight rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-accent" />
                  </div>
                  <h4 className="font-bold">{metric.title}</h4>
                  <p className="text-sm text-text-secondary">{metric.description}</p>
                </Card>
              );
            })}
          </div>

          <Card hover={false} className="p-4 bg-surface-highlight border-none flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary-accent shrink-0 mt-0.5" />
            <p className="text-xs text-primary-accent leading-relaxed">
              Analytics are computed entirely from public on-chain events (ProposalCreated, VoteCast, ResultsRevealed).
              Individual vote choices are never exposed — only aggregate participation data is shown.
              Future encrypted governance reports will use FHE to compute statistics on encrypted tallies.
            </p>
          </Card>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
