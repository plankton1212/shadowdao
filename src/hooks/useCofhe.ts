import { useEffect, useState, useCallback, useRef } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';

export function useCofhe() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<any>(null);
  const sdkRef = useRef<any>(null);

  useEffect(() => {
    if (!walletClient || !publicClient) return;
    if (clientRef.current) return;
    let cancelled = false;

    async function tryConnect(useWorkers: boolean) {
      const webSdk = await import('@cofhe/sdk/web');
      const coreSdk = await import('@cofhe/sdk');
      const adaptersMod = await import('@cofhe/sdk/adapters');

      sdkRef.current = coreSdk;

      const { createCofheConfig, createCofheClient } = webSdk;
      const WagmiAdapter = adaptersMod.WagmiAdapter || (adaptersMod as any).default?.WagmiAdapter;
      const { sepolia: sepoliaChain } = await import('@cofhe/sdk/chains');

      const config = createCofheConfig({
        supportedChains: [sepoliaChain],
        useWorkers,
      });

      const client = createCofheClient(config);

      // Try WagmiAdapter first, fallback to direct connect
      if (WagmiAdapter && typeof WagmiAdapter === 'function') {
        try {
          const adapter = await WagmiAdapter(walletClient as any, publicClient as any);
          await client.connect(publicClient as any, adapter as any);
        } catch (adapterErr: any) {
          console.warn('[ShadowDAO] WagmiAdapter failed, trying direct connect:', adapterErr.message);
          await client.connect(publicClient as any, walletClient as any);
        }
      } else {
        await client.connect(publicClient as any, walletClient as any);
      }

      return client;
    }

    async function initCofhe() {
      setIsLoading(true);
      setError(null);

      try {
        // Workers require SharedArrayBuffer + proper COOP/COEP headers
        // which conflict with MetaMask iframe injection — use single-threaded mode
        const client = await tryConnect(false);

        if (!cancelled) {
          clientRef.current = client;
          setIsInitialized(true);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn('[ShadowDAO] CoFHE SDK init failed:', err);
          setError(err.message || 'FHE SDK init failed');
          setIsInitialized(false);
          setIsLoading(false);
        }
      }
    }

    initCofhe();
    return () => { cancelled = true; };
  }, [walletClient, publicClient]);

  const initialize = useCallback(async () => {
    if (clientRef.current) return;
    if (!walletClient || !publicClient) {
      throw new Error('CoFHE not initialized — connect wallet first');
    }
    // SDK not yet ready — wait for useEffect to finish connecting
    for (let i = 0; i < 50; i++) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (clientRef.current) return;
    }
    throw new Error('CoFHE initialization timed out — try refreshing the page');
  }, [walletClient, publicClient]);

  const encrypt = useCallback(
    async (values: any[], onStep?: (step: string, ctx?: any) => void) => {
      if (!clientRef.current) throw new Error('CoFHE not initialized — connect wallet first');
      let builder = clientRef.current.encryptInputs(values);
      if (onStep) {
        builder = builder.onStep(onStep);
      }
      return builder.execute();
    },
    []
  );

  const decrypt = useCallback(async (ctHash: bigint, fheType: any) => {
    if (!clientRef.current) throw new Error('CoFHE not initialized');
    return clientRef.current.decryptForView(ctHash, fheType).withPermit().execute();
  }, []);

  const getOrCreateSelfPermit = useCallback(async () => {
    if (!clientRef.current) throw new Error('CoFHE not initialized');
    return clientRef.current.permits.getOrCreateSelfPermit();
  }, []);

  const removeActivePermit = useCallback(async () => {
    if (!clientRef.current) throw new Error('CoFHE not initialized');
    return clientRef.current.permits.removeActivePermit();
  }, []);

  const getEncryptable = useCallback(() => sdkRef.current?.Encryptable, []);
  const getFheTypes = useCallback(() => sdkRef.current?.FheTypes, []);

  return {
    isInitialized,
    isLoading,
    error,
    client: clientRef.current,
    initialize,
    encrypt,
    decrypt,
    getOrCreateSelfPermit,
    removeActivePermit,
    getEncryptable,
    getFheTypes,
  };
}
