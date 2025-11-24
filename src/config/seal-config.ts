import { SuiClient } from '@mysten/sui.js/client';
import { SealClient } from '@mysten/seal';

export const SEAL_PACKAGE_ID = import.meta.env.VITE_SEAL_PACKAGE_ID;
export const KEY_SERVER_OBJECT_ID = import.meta.env.VITE_KEY_SERVER_OBJECT_ID;
export const KEY_SERVER_PUBLIC_KEY = import.meta.env.VITE_KEY_SERVER_PUBLIC_KEY;
export const SUI_RPC_URL = import.meta.env.VITE_SUI_RPC_URL;

export const suiClient = new SuiClient({
  url: SUI_RPC_URL,
});

export function createSealClient() {
  return new SealClient({
    suiClient: suiClient as any,
    serverConfigs: [{
      objectId: KEY_SERVER_OBJECT_ID,
      weight: 1,
    }],
    verifyKeyServers: false, // Localnet only
  });
}