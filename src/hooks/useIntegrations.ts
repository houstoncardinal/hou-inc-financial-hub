import { useState, useCallback } from 'react';

export interface Integrations {
  stripe_secret_key: string;
  quickbooks_enabled: boolean;
  square_enabled: boolean;
}

const STORAGE_KEY = 'hou-integrations';
const DEFAULTS: Integrations = {
  stripe_secret_key: '',
  quickbooks_enabled: true,
  square_enabled: true,
};

function load(): Integrations {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return DEFAULTS; }
}

export function useIntegrations() {
  const [cfg, setCfgState] = useState<Integrations>(() => load());

  const save = useCallback((updates: Partial<Integrations>) => {
    const next = { ...cfg, ...updates };
    setCfgState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [cfg]);

  return { cfg, save };
}
