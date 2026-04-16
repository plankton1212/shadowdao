import React, { useEffect, useState, useMemo } from 'react';
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
  BarChart3,
  UserCheck,
  Bell,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn, formatAddress, formatNumber } from '../utils';
import { useNotifications } from '../hooks/useNotifications';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';

export type ProposalStatus = 'VOTING' | 'ENDED' | 'REVEALED' | 'CANCELLED';

export const Logo = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <img src="/logo.svg" alt="ShadowDAO" className={className} />
);



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
  if (status === 'CANCELLED') return <Badge variant="default">CANCELLED</Badge>;
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


export const Skeleton = ({ className, count = 1, ...props }: { className?: string; count?: number; [key: string]: any }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={cn('animate-pulse bg-bg-base rounded-xl', className)} />
    ))}
  </div>
);

export const ProposalSkeleton = () => (
  <div className="bg-surface-white rounded-card p-6 shadow-card border border-cards space-y-4">
    <div className="flex items-center gap-3">
      <div className="animate-pulse bg-bg-base rounded-badge w-20 h-6" />
      <div className="animate-pulse bg-bg-base rounded-badge w-12 h-5" />
    </div>
    <div className="animate-pulse bg-bg-base rounded-xl h-7 w-3/4" />
    <div className="flex gap-4">
      <div className="animate-pulse bg-bg-base rounded-xl h-4 w-24" />
      <div className="animate-pulse bg-bg-base rounded-xl h-4 w-20" />
      <div className="animate-pulse bg-bg-base rounded-xl h-4 w-32" />
    </div>
    <div className="animate-pulse bg-bg-base rounded-full h-1.5 w-full" />
  </div>
);

export const StatSkeleton = () => (
  <div className="bg-surface-white rounded-card p-6 shadow-card border border-cards space-y-2">
    <div className="animate-pulse bg-bg-base rounded-xl h-4 w-24" />
    <div className="animate-pulse bg-bg-base rounded-xl h-8 w-16" />
    <div className="animate-pulse bg-bg-base rounded-xl h-3 w-20" />
  </div>
);

export const CountUp = ({ end, duration = 1.5, suffix = '' }: { end: number; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          const start = Date.now();
          const step = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// Module-level flag — resets on full page reload, persists across navigations
let hasPreloaded = false;
const isLandingPage = () => window.location.pathname === '/' || window.location.pathname === '';

// SVG paths from logo, split into groups for staggered assembly
const LOGO_PATHS = [
  { d: 'm27.61 58.81 100.7-47.81 100.6 47.12-28.52 128.9-72.16 56.73-72.64-56.29-28-128.6z', fill: '#34CC99' },
  { d: 'm129.5 14.15 42.44 65.26 54.87-18.46-26.74 121.1-70.46 58.99 63.68-71.07-14.46-25.24 11.19 8.46 9.06 16.62 10.66-113.9-55.99-29.03-24.25-12.76z', fill: '#268E6A' },
  { d: 'm128.3 6.36 105 50.38-29.58 132.2-75.57 61.02-75.79-60.73-29.64-132.7 105.5-50.25zm0.1 8.26-95.06 46.24 23.73 109.2 6.79-17.08 12.49-9.2-19.35 41.4 67.54 52.57 74.36-52.57-18.09-40.8 13.57 9.7 5.16 15.17 23.01-106.7-46.15 4.61-23.16-31.27-24.84-21.34z', fill: '#000' },
  { d: 'm124.1 13.71h7.71v66.21h-7.79l0.08-66.21z', fill: '#000' },
  { d: 'm132.1 14.29 28.91 14.1 20.4 29.67 31.8-2.76 9.81 1.99-47.23 7.33-43.69-50.33z', fill: '#34CC99', stroke: '#000', strokeWidth: 8.077 },
  { d: 'm124.3 170.6h7.71v69.65h-7.79l0.08-69.65z', fill: '#000' },
  { d: 'm178.5 170.2-6.33-48.4 17.6 40.31 7.05 24.16-65.55 52.72 50.36-68.95-3.13 0.16z', fill: '#268E6A' },
  { d: 'm84.47 121.7-13.57 70.07-13.82-7.5 18.45-40.48 0.68 0.64 8.26-22.73z', fill: '#268E6A' },
  { d: 'm94.98 92.02h66.04v66.4h-66.04v-66.4z', fill: '#fff', stroke: '#000', strokeWidth: 7.881 },
  { d: 'm102.2 124.2 8.99-13.49 13.84 14.33 38.72-41.95 13.19 13.19-51.67 55.81-23.07-27.89z', fill: '#34CC99', stroke: '#000', strokeWidth: 7.881 },
];

// Random offsets for each path fragment
const FRAGMENT_OFFSETS = [
  { x: -120, y: -80, r: -25 },
  { x: 100, y: -60, r: 30 },
  { x: 0, y: -100, r: -15 },
  { x: -80, y: 90, r: 20 },
  { x: 130, y: 40, r: -35 },
  { x: -60, y: 120, r: 25 },
  { x: 90, y: -90, r: -20 },
  { x: -140, y: 30, r: 15 },
  { x: 50, y: 110, r: -30 },
  { x: -30, y: -130, r: 35 },
];

export const HashScramble = ({ text, className }: { text: string; className?: string }) => {
  const [display, setDisplay] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const chars = '0123456789abcdef';

  useEffect(() => {
    if (!isHovering) {
      setDisplay(text);
      return;
    }
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(prev =>
        text.split('').map((char, i) => {
          if (i < iteration || char === '.' || char === '0' && i < 2) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('')
      );
      iteration += 1;
      if (iteration >= text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [isHovering, text]);

  return (
    <span
      className={cn('font-mono cursor-default', className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); setDisplay(text); }}
    >
      {display}
    </span>
  );
};

export const Preloader = () => {
  const [show, setShow] = useState(() => {
    if (hasPreloaded) return false;
    if (!isLandingPage()) return false;
    hasPreloaded = true;
    return true;
  });
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!show) return;
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setPhase(3), 2200);
    const t4 = setTimeout(() => setShow(false), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, #0f1f15 0%, #070b09 50%, #000000 100%)' }}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(52,204,153,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(52,204,153,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          {/* Hexagonal rings */}
          <div className="relative w-[280px] h-[280px] flex items-center justify-center">
            {/* Outer hex ring */}
            <motion.div
              initial={{ opacity: 0, scale: 1.5, rotate: 30 }}
              animate={phase >= 1 ? { opacity: 0.15, scale: 1, rotate: 0 } : {}}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <svg viewBox="0 0 280 280" className="w-full h-full">
                <polygon points="140,10 250,75 250,205 140,270 30,205 30,75" fill="none" stroke="#34CC99" strokeWidth="1" strokeDasharray="4 8" />
              </svg>
            </motion.div>

            {/* Inner hex ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.3, rotate: -30 }}
              animate={phase >= 1 ? { opacity: 0.25, scale: 1, rotate: 0 } : {}}
              transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute"
              style={{ width: 200, height: 200 }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <polygon points="100,8 180,54 180,146 100,192 20,146 20,54" fill="none" stroke="#34CC99" strokeWidth="0.8" opacity="0.5" />
              </svg>
            </motion.div>

            {/* Corner nodes */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const r = 120;
              const x = 140 + r * Math.cos((angle - 90) * Math.PI / 180);
              const y = 140 + r * Math.sin((angle - 90) * Math.PI / 180);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  className="absolute w-2 h-2 bg-[#34CC99] rounded-full"
                  style={{ left: x * (280 / 280) - 4, top: y * (280 / 280) - 4, boxShadow: '0 0 12px rgba(52,204,153,0.6)' }}
                />
              );
            })}

            {/* Connection lines animating in */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 280">
              {[
                { x1: 140, y1: 20, x2: 140, y2: 100 },
                { x1: 245, y1: 80, x2: 180, y2: 110 },
                { x1: 245, y1: 200, x2: 180, y2: 170 },
                { x1: 35, y1: 80, x2: 100, y2: 110 },
                { x1: 35, y1: 200, x2: 100, y2: 170 },
                { x1: 140, y1: 260, x2: 140, y2: 180 },
              ].map((line, i) => (
                <motion.line
                  key={i}
                  x1={line.x1} y1={line.y1} x2={line.x1} y2={line.y1}
                  animate={phase >= 1 ? { x2: line.x2, y2: line.y2 } : {}}
                  transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                  stroke="#34CC99" strokeWidth="0.5" opacity="0.3"
                />
              ))}
            </svg>

            {/* Logo — scales up from center */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={phase >= 1 ? { scale: 1, opacity: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                animate={phase >= 2 ? { filter: ['brightness(1)', 'brightness(1.8)', 'brightness(1)'] } : {}}
                transition={{ duration: 0.6 }}
              >
                <svg width="90" height="90" viewBox="0 0 256 256">
                  {LOGO_PATHS.map((path, i) => (
                    <motion.path
                      key={i}
                      d={path.d}
                      fill={path.fill}
                      stroke={path.stroke}
                      strokeWidth={path.strokeWidth}
                      initial={{ opacity: 0 }}
                      animate={phase >= 1 ? { opacity: 1 } : {}}
                      transition={{ delay: 0.4 + i * 0.05, duration: 0.4 }}
                    />
                  ))}
                </svg>
              </motion.div>
            </motion.div>

            {/* Pulse ring on phase 2 */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={phase >= 2 ? { scale: [0.5, 2.5], opacity: [0.5, 0] } : {}}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute w-[120px] h-[120px] border border-[#34CC99] rounded-full pointer-events-none"
            />
          </div>

          {/* Text + tagline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="mt-6 text-center space-y-3"
          >
            <div className="text-2xl font-extrabold tracking-tight">
              <span className="text-white">Shadow</span><span className="text-[#34CC99]">DAO</span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-[#34CC99]/40 font-medium">
              Private Governance Protocol
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export type ToastType = 'success' | 'error' | 'warning' | 'info';

const toastConfig: Record<ToastType, { icon: React.ElementType; border: string; iconColor: string; duration: number }> = {
  success: { icon: CheckCircle2, border: 'border-primary-accent', iconColor: 'text-primary-accent', duration: 3000 },
  error:   { icon: AlertCircle,  border: 'border-danger',        iconColor: 'text-danger',        duration: 5000 },
  warning: { icon: AlertTriangle, border: 'border-warning',      iconColor: 'text-warning',       duration: 4000 },
  info:    { icon: Info,          border: 'border-tertiary-accent', iconColor: 'text-tertiary-accent', duration: 3000 },
};

export const Toast = ({
  message,
  type = 'success',
  onClose,
}: {
  message: string;
  type?: ToastType;
  onClose: () => void;
}) => {
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, config.duration);
    return () => clearTimeout(timer);
  }, [onClose, config.duration]);

  return (
    <motion.div
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'fixed top-6 right-6 z-[100] bg-white rounded-xl shadow-elevated px-6 py-4 flex items-center gap-3 min-w-[300px] border-l-4',
        config.border
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', config.iconColor)} />
      <span className="text-sm font-bold text-secondary-accent">{message}</span>
      <button onClick={onClose} className="ml-auto text-text-muted hover:text-text-primary">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export const CopyButton = ({ text, label, className }: { text: string; label?: string; className?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={cn('inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors', className)}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-primary-accent" />
          {label ? <span className="text-primary-accent">Copied!</span> : null}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          {label ? <span>{label}</span> : null}
        </>
      )}
    </button>
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
        <a href="https://github.com/plankton1212/shadowdao#readme" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-text-primary font-medium transition-colors">
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

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) {
            // Will mark read on close
          }
        }}
        className="relative p-2 text-text-muted hover:text-text-primary transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); markAllRead(); }} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-80 bg-white rounded-card shadow-elevated border border-black/5 z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-default flex justify-between items-center">
                <span className="font-bold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[10px] text-primary-accent font-bold hover:underline">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markRead(n.id);
                        if (n.proposalId !== undefined) {
                          navigate(`/app/proposal/${n.proposalId.toString()}`);
                          setOpen(false);
                        }
                      }}
                      className={cn(
                        'px-4 py-3 border-b border-default last:border-0 hover:bg-surface-tinted transition-colors cursor-pointer',
                        !n.read && 'bg-surface-highlight/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-1.5 shrink-0',
                          !n.read ? (n.type === 'proposal' ? 'bg-primary-accent' : n.type === 'vote' ? 'bg-tertiary-accent' : 'bg-warning') : 'bg-transparent'
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.text}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-text-muted text-sm">
                    No activity yet
                  </div>
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-default">
                <button
                  onClick={() => { setOpen(false); navigate('/app/settings'); }}
                  className="text-xs text-primary-accent font-medium hover:underline w-full text-center"
                >
                  Notification Settings
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
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
    { name: 'Spaces', path: '/app/spaces', icon: Users },
    { name: 'Treasury', path: '/app/treasury', icon: Database },
    { name: 'Delegation', path: '/app/delegation', icon: UserCheck },
    { name: 'Analytics', path: '/app/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/app/settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-black/5 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/app/dashboard" className="flex items-center gap-2 shrink-0">
          <Logo className="w-7 h-7" />
          <span className="text-lg font-bold text-secondary-accent hidden sm:inline">ShadowDAO</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            if ((tab as any).disabled) {
              return (
                <span
                  key={tab.name}
                  className="flex items-center gap-2 px-4 py-2 rounded-pill text-sm font-medium text-text-muted/40 cursor-not-allowed select-none"
                  title="Coming soon"
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </span>
              );
            }
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

        <div className="flex items-center gap-2">
          {wrongNetwork && (
            <button
              onClick={() => switchChain({ chainId: sepolia.id })}
              className="bg-warning/10 text-warning px-3 py-1.5 rounded-pill text-xs font-bold"
            >
              Wrong Network
            </button>
          )}

          {/* Notifications Bell */}
          <NotificationBell />

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
    { path: '/app/dashboard', icon: LayoutGrid, label: 'Home' },
    { path: '/app/proposals', icon: List, label: 'Votes' },
    { path: '/app/create', icon: PlusCircle, label: 'Create', highlight: true },
    { path: '/app/spaces', icon: Users, label: 'Spaces' },
    { path: '/app/settings', icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-black/5 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
        const Icon = tab.icon;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200',
              (tab as any).highlight
                ? 'bg-primary-accent text-white shadow-button'
                : isActive
                  ? 'text-primary-accent bg-surface-highlight'
                  : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
};


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

/* ─────────────────────────── Confetti ─────────────────────────── */

const CONFETTI_COLORS = ['#D4F542', '#34CC99', '#5B6DEC', '#FF6B6B', '#FFE066', '#FF9F1C', '#2EC4B6', '#A78BFA'];

export const Confetti = ({ active, onDone }: { active: boolean; onDone?: () => void }) => {
  const particles = useMemo(() => Array.from({ length: 48 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    startX: 20 + Math.random() * 60,       // vw — spread across middle 60%
    driftX: (Math.random() - 0.5) * 30,    // vw horizontal drift
    duration: 1.4 + Math.random() * 0.9,
    delay: Math.random() * 0.5,
    rotation: Math.random() * 800 - 400,
    size: Math.random() * 7 + 5,
    shape: i % 3,                           // 0=square 1=circle 2=rect
  })), []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
      {particles.map((p, idx) => (
        <motion.div
          key={p.id}
          className={cn(
            'absolute',
            p.shape === 1 ? 'rounded-full' : p.shape === 2 ? 'rounded-sm' : 'rounded'
          )}
          style={{
            backgroundColor: p.color,
            width: p.shape === 2 ? p.size * 2 : p.size,
            height: p.size,
            left: `${p.startX}vw`,
            top: '45vh',
          }}
          initial={{ y: 0, x: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{
            y: ['0vh', '90vh'],
            x: [`0vw`, `${p.driftX}vw`],
            opacity: [1, 1, 0.6, 0],
            scale: [1, 1.3, 0.7, 0.2],
            rotate: p.rotation,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.22, 0, 0.58, 1],
          }}
          onAnimationComplete={idx === 0 ? onDone : undefined}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────── SpaceCategoryIcon ─────────────────────────── */

const CATEGORY_EMOJIS: Record<string, string> = {
  DeFi: '💰',
  NFT: '🎨',
  Infrastructure: '⚙️',
  Gaming: '🎮',
  Privacy: '🔒',
  L2: '⚡',
  'DAO Tooling': '🛠️',
  Social: '👥',
};

export const CategoryEmoji = ({ label, className }: { label: string; className?: string }) => (
  <span className={cn('text-xl select-none', className)} role="img" aria-label={label}>
    {CATEGORY_EMOJIS[label] ?? '🌐'}
  </span>
);

/* ─────────────────────────── FheBadge ─────────────────────────── */

export const FheBadge = ({ op, className }: { op: string; className?: string }) => (
  <span className={cn(
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold',
    'bg-secondary-accent/90 text-primary-accent border border-primary-accent/20',
    className
  )}>
    🔐 {op}
  </span>
);
