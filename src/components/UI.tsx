import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  List,
  PlusCircle,
  Wallet,
  Settings as SettingsIcon,
  ChevronRight,
  Shield,
  Lock,
  Clock,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Search,
  AlertCircle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  TrendingUp,
  Users,
  Vote as VoteIcon,
  Database,
  ChevronDown,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn, formatAddress, formatNumber } from '../utils';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export type ProposalStatus = 'VOTING' | 'ENDED' | 'REVEALED';

export const Logo = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <img src="/logo.svg" alt="ShadowDAO" className={className} />
);


// --- UI Components ---

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent';
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className, variant = 'primary', size = 'md', ...props }, ref) => {
  const variants = {
    primary: 'bg-secondary-accent text-white hover:scale-[1.02] active:scale-[0.98] shadow-button',
    secondary: 'bg-surface-tinted text-text-primary border border-default hover:bg-surface-highlight',
    outline: 'bg-transparent border-1.5 border-secondary-accent text-secondary-accent hover:bg-surface-tinted',
    ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-tinted',
    accent: 'bg-primary-accent text-white hover:scale-[1.02] active:scale-[0.98] shadow-button',
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg font-semibold',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-pill transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});

export const Card = ({
  children,
  className,
  hover = true,
  accent = false,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  accent?: boolean;
  [key: string]: any;
}) => (
  <motion.div
    whileHover={hover ? { y: -3, boxShadow: '0 8px 40px rgba(0,0,0,0.06)' } : {}}
    className={cn(
      'bg-surface-white rounded-card p-6 shadow-card border border-cards transition-shadow duration-250',
      accent && 'bg-surface-accent border-none shadow-none',
      className
    )}
    {...props}
  >
    {children}
  </motion.div>
);

export const Badge = ({
  children,
  variant = 'default',
  ...props
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  [key: string]: any;
}) => {
  const styles = {
    default: 'bg-surface-tinted text-text-secondary',
    success: 'bg-surface-highlight text-primary-accent',
    warning: 'bg-[#FEF3CD] text-warning',
    info: 'bg-[#EDEFFD] text-tertiary-accent',
  };
  return (
    <span
      className={cn('px-3 py-1 rounded-badge text-xs font-semibold uppercase tracking-wider', styles[variant])}
      {...props}
    >
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }: { status: ProposalStatus }) => {
  if (status === 'VOTING')
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-surface-highlight text-primary-accent rounded-badge text-xs font-bold">
        <motion.div
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 bg-primary-accent rounded-full"
        />
        VOTING
      </div>
    );
  if (status === 'ENDED') return <Badge variant="warning">ENDED</Badge>;
  return <Badge variant="info">REVEALED</Badge>;
};

export const QuorumBar = ({ current, target }: { current: number; target: number }) => {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium text-text-secondary">
        <span>Quorum</span>
        <span>
          {current}/{target} ({percentage}%)
        </span>
      </div>
      <div className="h-2 bg-bg-base rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-primary-accent"
        />
      </div>
    </div>
  );
};

// --- App Shell Components ---

// Module-level flag — resets on full page reload, persists across navigations
let hasPreloaded = false;

export const Preloader = () => {
  const [show, setShow] = useState(() => {
    if (hasPreloaded) return false;
    hasPreloaded = true;
    return true;
  });

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 mb-8"
          >
            <Logo className="w-10 h-10" />
            <span className="text-3xl font-extrabold text-secondary-accent tracking-tight">ShadowDAO</span>
          </motion.div>
          <div className="w-48 h-1 bg-bg-base rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="h-full bg-primary-accent"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const Toast = ({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className={cn(
        'fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-white rounded-xl shadow-elevated px-6 py-4 flex items-center gap-3 min-w-[300px]',
        type === 'error' ? 'border-l-4 border-danger' : 'border-l-4 border-primary-accent'
      )}
    >
      <CheckCircle2 className={cn('w-5 h-5', type === 'error' ? 'text-danger' : 'text-primary-accent')} />
      <span className="text-sm font-bold text-secondary-accent">{message}</span>
      <button onClick={onClose} className="ml-auto text-text-muted hover:text-text-primary">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export const Accordion = ({ items }: { items: { title: string; content: string }[] }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <div key={i} className="border border-default rounded-2xl overflow-hidden bg-white">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-tinted transition-colors"
          >
            <span className="font-bold text-secondary-accent">{item.title}</span>
            <motion.div animate={{ rotate: openIndex === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-5 h-5 text-text-muted" />
            </motion.div>
          </button>
          <AnimatePresence>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="px-6 pb-4 text-sm text-text-secondary leading-relaxed">{item.content}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { isConnected, address, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const navigate = useNavigate();

  const wrongNetwork = isConnected && chainId !== sepolia.id;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleConnect = () => {
    const connector = connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  const handleSwitchNetwork = () => {
    switchChain({ chainId: sepolia.id });
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4 flex items-center justify-between',
        scrolled ? 'glass-nav py-3' : 'bg-transparent'
      )}
    >
      <Link to="/" className="flex items-center gap-2">
        <Logo className="w-8 h-8" />
        <span className="text-xl font-bold text-secondary-accent">ShadowDAO</span>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <Link to="/how-it-works" className="text-text-secondary hover:text-text-primary font-medium transition-colors">
          How It Works
        </Link>
        <Link to="/features" className="text-text-secondary hover:text-text-primary font-medium transition-colors">
          Features
        </Link>
        <a href="#" className="text-text-secondary hover:text-text-primary font-medium transition-colors">
          Docs
        </a>
      </div>

      <div className="flex items-center gap-4">
        {wrongNetwork ? (
          <Button onClick={handleSwitchNetwork} variant="accent" size="sm">
            Switch to Sepolia
          </Button>
        ) : isConnected ? (
          <Button onClick={() => navigate('/app/dashboard')} variant="primary" size="sm" className="flex gap-2">
            Launch App <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleConnect} variant="primary" size="sm">
            Connect Wallet
          </Button>
        )}
      </div>
    </nav>
  );
};

export const AppTopBar = () => {
  const { address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const location = useLocation();
  const navigate = useNavigate();

  const wrongNetwork = chainId !== sepolia.id;

  const tabs = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutGrid },
    { name: 'Proposals', path: '/app/proposals', icon: List },
    { name: 'Create', path: '/app/create', icon: PlusCircle, highlight: true },
    { name: 'Treasury', path: '/app/treasury', icon: Database },
    { name: 'Settings', path: '/app/settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-black/5 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/app/dashboard" className="flex items-center gap-2">
          <Logo className="w-7 h-7" />
          <span className="text-lg font-bold text-secondary-accent hidden sm:inline">ShadowDAO</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-pill transition-all duration-200 font-medium text-sm',
                  tab.highlight
                    ? 'bg-primary-accent text-white ml-2'
                    : isActive
                      ? 'bg-surface-highlight text-primary-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-tinted'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {wrongNetwork && (
            <button
              onClick={() => switchChain({ chainId: sepolia.id })}
              className="bg-warning/10 text-warning px-3 py-1.5 rounded-pill text-xs font-bold"
            >
              Wrong Network
            </button>
          )}
          <div className="bg-secondary-accent text-white px-4 py-2 rounded-pill flex items-center gap-2 text-sm font-mono cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-2 h-2 bg-primary-accent rounded-full" />
            {formatAddress(address ?? null)}
          </div>
          <button
            onClick={() => {
              disconnect();
              navigate('/');
            }}
            className="p-2 text-text-muted hover:text-danger transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export const MobileTabBar = () => {
  const location = useLocation();
  const tabs = [
    { path: '/app/dashboard', icon: LayoutGrid },
    { path: '/app/proposals', icon: List },
    { path: '/app/create', icon: PlusCircle },
    { path: '/app/treasury', icon: Database },
    { path: '/app/settings', icon: SettingsIcon },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              'p-2 rounded-xl transition-colors',
              isActive ? 'text-primary-accent bg-surface-highlight' : 'text-text-muted'
            )}
          >
            <Icon className="w-6 h-6" />
          </Link>
        );
      })}
    </div>
  );
};

// --- Page Layouts ---

export const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="w-full"
  >
    {children}
  </motion.div>
);

export const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen pb-24 md:pb-8">
    <AppTopBar />
    <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    <MobileTabBar />
  </div>
);
