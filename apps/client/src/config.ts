export const cfg = {
    apiBase: import.meta.env.VITE_API_BASE,
    evm: {
      chainId: Number(import.meta.env.VITE_EVM_CHAIN_ID ?? '1'),
      usdc: import.meta.env.VITE_EVM_USDC as `0x${string}`,
      htlc: import.meta.env.VITE_EVM_HTLC as `0x${string}`,
      counterparty: import.meta.env.VITE_EVM_COUNTERPARTY as `0x${string}`,
    },
    stellar: {
      horizon: import.meta.env.VITE_STELLAR_HORIZON,
      network: import.meta.env.VITE_STELLAR_NETWORK,
      bridgeId: import.meta.env.VITE_STELLAR_BRIDGE_ID,
    },
    flags: {
      directUsdcMode: import.meta.env.VITE_DIRECT_USDC_MODE === 'true',
      showWidgets: import.meta.env.VITE_SHOW_WIDGETS === 'true',
    },
};