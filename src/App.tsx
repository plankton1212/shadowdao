import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { useAccount } from 'wagmi';
import { Preloader } from './components/UI';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Proposals } from './pages/Proposals';
import { ProposalDetail } from './pages/ProposalDetail';
import { CreateProposal } from './pages/CreateProposal';
import { Treasury } from './pages/Treasury';
import { Settings } from './pages/Settings';
import { Delegation } from './pages/Delegation';
import { Analytics } from './pages/Analytics';
import { Spaces } from './pages/Spaces';
import { CreateSpace } from './pages/CreateSpace';
import { SpaceDetail } from './pages/SpaceDetail';
import { HowItWorks } from './pages/HowItWorks';
import { Features } from './pages/Features';
import { useStore } from './store/useStore';

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
    <Router>
      <WalletSync />
      <Preloader />
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </Router>
  );
}
