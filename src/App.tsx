import React, { lazy, Suspense, useEffect, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useAccount } from 'wagmi';
import { Preloader } from './components/UI';
import { useStore } from './store/useStore';

// Lazy-loaded routes for code splitting (Wave 5)
const Home          = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Dashboard     = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Proposals     = lazy(() => import('./pages/Proposals').then(m => ({ default: m.Proposals })));
const ProposalDetail= lazy(() => import('./pages/ProposalDetail').then(m => ({ default: m.ProposalDetail })));
const CreateProposal= lazy(() => import('./pages/CreateProposal').then(m => ({ default: m.CreateProposal })));
const Treasury      = lazy(() => import('./pages/Treasury').then(m => ({ default: m.Treasury })));
const Settings      = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Delegation    = lazy(() => import('./pages/Delegation').then(m => ({ default: m.Delegation })));
const Analytics     = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Spaces        = lazy(() => import('./pages/Spaces').then(m => ({ default: m.Spaces })));
const CreateSpace   = lazy(() => import('./pages/CreateSpace').then(m => ({ default: m.CreateSpace })));
const SpaceDetail   = lazy(() => import('./pages/SpaceDetail').then(m => ({ default: m.SpaceDetail })));
const HowItWorks    = lazy(() => import('./pages/HowItWorks').then(m => ({ default: m.HowItWorks })));
const Features      = lazy(() => import('./pages/Features').then(m => ({ default: m.Features })));

// Route-level loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-3 border-primary-accent border-t-transparent animate-spin" />
  </div>
);

// Error boundary for production crash recovery
interface EBProps { children: React.ReactNode }
interface EBState { hasError: boolean; error?: Error }
class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    (this as any).state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): EBState { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ShadowDAO error:', error, info); }
  render() {
    const s = (this as any).state as EBState;
    if (s.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-text-secondary text-sm">{s.error?.message || 'An unexpected error occurred'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => (this as any).setState({ hasError: false })}
                className="px-6 py-3 bg-primary-accent text-white rounded-pill font-bold text-sm">
                Try again
              </button>
              <a href="/" className="px-6 py-3 border border-default rounded-pill font-bold text-sm">
                Go home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// 404 Not Found page
const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center p-8">
    <div className="max-w-md text-center space-y-8">
      {/* Animated lock icon */}
      <div className="relative w-32 h-32 mx-auto">
        <div className="absolute inset-0 bg-surface-highlight rounded-full animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-16 h-16 text-primary-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
      <div className="space-y-3">
        <div className="font-mono text-6xl font-extrabold text-primary-accent">404</div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-text-secondary text-sm leading-relaxed">
          This page is encrypted — or it doesn't exist.<br />
          The FHE coprocessor couldn't locate the ciphertext.
        </p>
      </div>
      <div className="flex gap-3 justify-center">
        <Link to="/" className="px-6 py-3 bg-secondary-accent text-white rounded-pill font-bold text-sm hover:opacity-90 transition-opacity">
          Go Home
        </Link>
        <Link to="/app/dashboard" className="px-6 py-3 border border-default rounded-pill font-bold text-sm hover:bg-surface-tinted transition-colors">
          Dashboard
        </Link>
      </div>
      <div className="font-mono text-xs text-text-muted">
        Error: 0x404 · FHE.decrypt(undefined) → null
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isConnected } = useAccount();
  if (!isConnected) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Sync wagmi account state to zustand store
const WalletSync = () => {
  const { address, isConnected } = useAccount();
  const setWallet = useStore((s) => s.setWallet);

  useEffect(() => {
    setWallet(isConnected ? (address ?? null) : null);
  }, [address, isConnected, setWallet]);

  return null;
};

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <WalletSync />
        <Preloader />
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/features" element={<Features />} />

              <Route path="/app/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/app/proposals" element={
                <ProtectedRoute><Proposals /></ProtectedRoute>
              } />
              <Route path="/app/proposal/:id" element={
                <ProtectedRoute><ProposalDetail /></ProtectedRoute>
              } />
              <Route path="/app/create" element={
                <ProtectedRoute><CreateProposal /></ProtectedRoute>
              } />
              <Route path="/app/spaces" element={
                <ProtectedRoute><Spaces /></ProtectedRoute>
              } />
              <Route path="/app/create-space" element={
                <ProtectedRoute><CreateSpace /></ProtectedRoute>
              } />
              <Route path="/app/space/:spaceId" element={
                <ProtectedRoute><SpaceDetail /></ProtectedRoute>
              } />
              <Route path="/app/treasury" element={
                <ProtectedRoute><Treasury /></ProtectedRoute>
              } />
              <Route path="/app/delegation" element={
                <ProtectedRoute><Delegation /></ProtectedRoute>
              } />
              <Route path="/app/analytics" element={
                <ProtectedRoute><Analytics /></ProtectedRoute>
              } />
              <Route path="/app/settings" element={
                <ProtectedRoute><Settings /></ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}
