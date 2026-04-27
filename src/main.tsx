import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config/wagmi';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient();

// Restore theme from localStorage on app boot
const savedTheme = localStorage.getItem('shadowdao-theme');
document.documentElement.setAttribute('data-theme', savedTheme === 'dark' ? 'dark' : 'light');

// Register PWA service worker (Wave 5)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failure is non-critical
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
