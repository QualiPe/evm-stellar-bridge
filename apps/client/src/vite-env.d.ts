/// <reference types="vite/client" />
interface ImportMetaEnv {
    readonly VITE_API_BASE: string;
    readonly VITE_EVM_CHAIN_ID: string;
    readonly VITE_EVM_USDC: `0x${string}`;
    readonly VITE_EVM_BRIDGE: `0x${string}`;
    readonly VITE_STELLAR_HORIZON: string;
    readonly VITE_STELLAR_NETWORK: string;
    readonly VITE_STELLAR_BRIDGE_ID: string;
    readonly VITE_DIRECT_USDC_MODE: 'true' | 'false';
    readonly VITE_SHOW_WIDGETS: 'true' | 'false';
}
interface ImportMeta { readonly env: ImportMetaEnv; }