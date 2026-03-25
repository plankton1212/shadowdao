import { UserCheck, Lock, ArrowRight, Users, Shield } from 'lucide-react';
import { Card, Badge, AppLayout, PageWrapper } from '../components/UI';

export const Delegation = () => {
  const features = [
    {
      title: 'Delegate Your Vote',
      description: 'Transfer your voting power to a trusted representative. They vote on your behalf with FHE-encrypted ballots.',
      icon: UserCheck,
    },
    {
      title: 'Override Anytime',
      description: 'Delegated but want to vote yourself? Cast your own ballot to override your delegate on any proposal.',
      icon: ArrowRight,
    },
    {
      title: 'Privacy Preserved',
      description: 'Delegation is public, but the delegate\'s vote remains encrypted. Nobody sees how your power was used.',
      icon: Lock,
    },
    {
      title: 'Delegate Leaderboard',
      description: 'See who the most trusted delegates are based on voting participation and delegation count.',
      icon: Users,
    },
  ];

  return (
    <AppLayout>
      <PageWrapper>
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">Delegation</h2>
              <Badge variant="warning">Wave 4</Badge>
            </div>
            <p className="text-text-secondary">Delegate your voting power while preserving vote privacy</p>
          </div>

          <Card hover={false} className="bg-surface-accent p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto">
              <UserCheck className="w-8 h-8 text-secondary-accent" />
            </div>
            <h3 className="text-xl font-bold text-secondary-accent">Vote Delegation</h3>
            <p className="text-sm text-secondary-accent/70 max-w-md mx-auto">
              Delegate your FHE-encrypted voting power to trusted representatives.
              Your delegate votes on your behalf — but the ballot stays encrypted.
            </p>
            <Badge variant="default">Not deployed yet</Badge>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} hover={false} className="space-y-3">
                  <div className="w-10 h-10 bg-surface-highlight rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-accent" />
                  </div>
                  <h4 className="font-bold">{feature.title}</h4>
                  <p className="text-sm text-text-secondary">{feature.description}</p>
                </Card>
              );
            })}
          </div>

          <Card hover={false} className="p-4 bg-surface-highlight border-none flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary-accent shrink-0 mt-0.5" />
            <p className="text-xs text-primary-accent leading-relaxed">
              Delegation uses on-chain mapping with FHE-compatible vote forwarding.
              The delegate's encrypted ballot counts for both parties, but the vote choice remains hidden from everyone — including the delegator.
            </p>
          </Card>
        </div>
      </PageWrapper>
    </AppLayout>
  );
};
