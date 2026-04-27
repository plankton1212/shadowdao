import { useEffect, useState, useCallback } from 'react';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';

// Module-level singleton — one CoFHE client per browser session, shared across all hooks.
// Tracks the wallet address + chainId used to build the client so we can detect account/chain
// switches and rebuild with the new signer context.
let _client: any = null;
let _sdk: any = null;
let _initPromise: Promise<any> | null = null;
let _builtForAddress: string | null = null;
let _builtForChainId: number | null = null;

function resetCofheSingleton() {
  _client = null;
  _initPromise = null;
  _builtForAddress = null;
  _builtForChainId = null;
  // _sdk can stay — it's just the imported module, not wallet-specific
}

async function buildClient(walletClient: any, publicClient: any): Promise<any> {
  if (_client) return _client;

  const [webSdk, coreSdk, adaptersMod, { sepolia: sepoliaChain }] = await Promise.all([
    import('@cofhe/sdk/web'),
    import('@cofhe/sdk'),
    import('@cofhe/sdk/adapters'),
    import('@cofhe/sdk/chains'),
  ]);

  _sdk = coreSdk;

  const { createCofheConfig, createCofheClient } = webSdk;
  const WagmiAdapter = adaptersMod.WagmiAdapter || (adaptersMod as any).default?.WagmiAdapter;

  // Try with worker threads first (faster); fall back to single-threaded if
  // COOP/COEP headers are missing or SharedArrayBuffer is unavailable
  let useWorkers = typeof SharedArrayBuffer !== 'undefined';

  const config = createCofheConfig({ supportedChains: [sepoliaChain], useWorkers });
  const client = createCofheClient(config);

  if (WagmiAdapter && typeof WagmiAdapter === 'function') {
    try {
      const adapter = await WagmiAdapter(walletClient, publicClient);
      await client.connect(publicClient, adapter);
    } catch {
      if (useWorkers) {
        // Retry without workers
        useWorkers = false;
        const cfg2 = createCofheConfig({ supportedChains: [sepoliaChain], useWorkers: false });
        const c2 = createCofheClient(cfg2);
        await c2.connect(publicClient, walletClient);
        _client = c2;
        return c2;
      }
      await client.connect(publicClient, walletClient);
    }
  } else {
    await client.connect(publicClient, walletClient);
  }

  _builtForAddress = walletClient.account?.address ?? null;
  _builtForChainId = publicClient.chain?.id ?? null;
  _client = client;
  return client;
}

export function useCofhe() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, chainId } = useAccount();
  const [isInitialized, setIsInitialized] = useState(!!_client);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect wallet account or chain change — reset singleton so next operation
  // gets a client bound to the new signer context (prevents cross-account leakage)
  useEffect(() => {
    if (!address || !chainId) return;
    if (_client && (_builtForAddress !== address || _builtForChainId !== chainId)) {
      resetCofheSingleton();
      setIsInitialized(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    if (!walletClient || !publicClient || _client) return;

    setIsLoading(true);
    setError(null);

    if (!_initPromise) {
      _initPromise = buildClient(walletClient, publicClient);
    }

    _initPromise
      .then(() => { setIsInitialized(true); setIsLoading(false); })
      .catch((err: any) => {
        _initPromise = null;
        console.warn('[ShadowDAO] CoFHE SDK init failed:', err);
        setError(err.message || 'FHE SDK init failed');
        setIsLoading(false);
      });
  }, [walletClient, publicClient]);

  const initialize = useCallback(async () => {
    if (_client) return;
    if (!walletClient || !publicClient) {
      throw new Error('CoFHE not initialized — connect wallet first');
    }
    if (!_initPromise) {
      _initPromise = buildClient(walletClient, publicClient);
    }
    await _initPromise;
  }, [walletClient, publicClient]);

  const encrypt = useCallback(
    async (values: any[], onStep?: (step: string, ctx?: any) => void) => {
      if (!_client) throw new Error('CoFHE not initialized — connect wallet first');
      let builder = _client.encryptInputs(values);
      if (onStep) builder = builder.onStep(onStep);
      return builder.execute();
    },
    []
  );

  const decrypt = useCallback(async (ctHash: bigint, fheType: any) => {
    if (!_client) throw new Error('CoFHE not initialized');
    return _client.decryptForView(ctHash, fheType).withPermit().execute();
  }, []);

  const getOrCreateSelfPermit = useCallback(async () => {
    if (!_client) throw new Error('CoFHE not initialized');
    return _client.permits.getOrCreateSelfPermit();
  }, []);

  const removeActivePermit = useCallback(async () => {
    if (!_client) throw new Error('CoFHE not initialized');
    return _client.permits.removeActivePermit();
  }, []);

  const getEncryptable = useCallback(() => _sdk?.Encryptable, []);
  const getFheTypes = useCallback(() => _sdk?.FheTypes, []);

  return {
    isInitialized,
    isLoading,
    error,
    client: _client,
    initialize,
    encrypt,
    decrypt,
    getOrCreateSelfPermit,
    removeActivePermit,
    getEncryptable,
    getFheTypes,
  };
}
