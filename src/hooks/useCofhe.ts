import { useState, useCallback, useRef } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';

interface CofheState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

// Singleton client — shared across all hook instances
let cofheClient: any = null;

export function useCofhe() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [state, setState] = useState<CofheState>({
    isInitialized: !!cofheClient?.connected,
    isLoading: false,
    error: null,
  });
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const initialize = useCallback(async () => {
    if (cofheClient?.connected) {
      setState({ isInitialized: true, isLoading: false, error: null });
      return;
    }

    if (initPromiseRef.current) {
      await initPromiseRef.current;
      return;
    }

    if (!publicClient || !walletClient) {
      setState((s) => ({ ...s, error: 'Wallet not connected' }));
      return;
    }

    setState({ isInitialized: false, isLoading: true, error: null });

    initPromiseRef.current = (async () => {
      try {
        // Import SDK modules
        const { createCofheConfig, createCofheClient } = await import('@cofhe/sdk/web');
        const { sepolia: sepoliaChain } = await import('@cofhe/sdk/chains');

        // Create config with Sepolia chain
        const config = createCofheConfig({
          environment: 'web',
          supportedChains: [sepoliaChain],
          useWorkers: typeof SharedArrayBuffer !== 'undefined',
        });

        // Create and connect client
        cofheClient = createCofheClient(config);
        await cofheClient.connect(publicClient, walletClient);

        setState({ isInitialized: true, isLoading: false, error: null });
      } catch (err: any) {
        console.error('CoFHE initialization failed:', err);
        setState({
          isInitialized: false,
          isLoading: false,
          error: err.message || 'Failed to initialize FHE',
        });
      }
    })();

    await initPromiseRef.current;
    initPromiseRef.current = null;
  }, [publicClient, walletClient]);

  const encrypt = useCallback(
    async (values: any[]) => {
      if (!cofheClient?.connected) {
        await initialize();
      }
      if (!cofheClient) throw new Error('CoFHE not initialized');
      // encryptInputs returns a builder, call execute() to get results
      return cofheClient.encryptInputs(values).execute();
    },
    [initialize]
  );

  const decrypt = useCallback(async (ctHash: bigint, fheType: number) => {
    if (!cofheClient) throw new Error('CoFHE not initialized');
    return cofheClient.decryptForView(ctHash, fheType).execute();
  }, []);

  const getOrCreateSelfPermit = useCallback(async () => {
    if (!cofheClient) throw new Error('CoFHE not initialized');
    return cofheClient.permits.createSelf({});
  }, []);

  return {
    ...state,
    initialize,
    encrypt,
    decrypt,
    getOrCreateSelfPermit,
    client: cofheClient,
  };
}
