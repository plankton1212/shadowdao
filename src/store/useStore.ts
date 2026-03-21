import { create } from 'zustand';

// Re-export ProposalStatus from hooks for backward compatibility
export type ProposalStatus = 'VOTING' | 'ENDED' | 'REVEALED';

// Minimal Proposal interface for components that still reference it
export interface Proposal {
  id: string;
  title: string;
  description: string;
  author: string;
  status: ProposalStatus;
  options: string[];
  votes: number;
  deadline: Date;
  quorum: number;
  results?: Record<string, number>;
  hash: string;
  createdAt: Date;
}

interface AppState {
  // UI-only state (wallet state now comes from wagmi)
  isConnected: boolean;
  walletAddress: string | null;
  setWallet: (address: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  isConnected: false,
  walletAddress: null,

  setWallet: (address) => {
    set({
      isConnected: !!address,
      walletAddress: address,
    });
  },
}));
