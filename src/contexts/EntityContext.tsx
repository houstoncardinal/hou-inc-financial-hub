import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

/* ── Entity definitions ──────────────────────────────────────────────── */
export interface Entity {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  category: string;
  color: string;       // primary accent
  colorMuted: string;  // soft bg tint
  since: number;
  type: 'construction' | 'energy' | 'holdings';
}

export const ENTITIES: Entity[] = [
  {
    id: 'houston-enterprise',
    name: 'Houston Enterprise',
    shortName: 'HE',
    tagline: 'General Contractor · Est. 1998',
    description:
      'Full-service construction company delivering luxury residential, commercial, and industrial projects across the Greater Houston Metropolitan Area.',
    category: 'Construction',
    color: '#9D7E3F',
    colorMuted: 'rgba(157,126,63,0.10)',
    since: 1998,
    type: 'construction',
  },
  {
    id: 'houston-generator-pros',
    name: 'Houston Generator Pros',
    shortName: 'HGP',
    tagline: 'Power Solutions · Est. 2015',
    description:
      'Commercial and residential generator installation, preventive maintenance, 24/7 emergency repair services, and load-bank testing across Houston.',
    category: 'Energy Services',
    color: '#1B72B5',
    colorMuted: 'rgba(27,114,181,0.10)',
    since: 2015,
    type: 'energy',
  },
  {
    id: 'houston-enterprise-holdings',
    name: 'Houston Enterprise Holdings',
    shortName: 'HEH',
    tagline: 'Development & Capital · Est. 2010',
    description:
      'Real estate development, asset management, construction lending, bank loan administration, interest income, and cross-entity capital allocation.',
    category: 'Holdings & Development',
    color: '#2C5F8A',
    colorMuted: 'rgba(44,95,138,0.10)',
    since: 2010,
    type: 'holdings',
  },
];

/* ── Context ─────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'hou-finance-entity';
const META_KEY    = 'preferred_entity';

interface EntityContextValue {
  entity: Entity | null;
  setEntity: (e: Entity | null) => void;
  ready: boolean; // true once DB preference has been resolved
}

const EntityContext = createContext<EntityContextValue>({
  entity: null,
  setEntity: () => {},
  ready: false,
});

export function EntityProvider({ children }: { children: ReactNode }) {
  const [entity, setEntityState] = useState<Entity | null>(null);
  const [ready,  setReady]       = useState(false);

  // On mount: load preference from Supabase user_metadata, fall back to localStorage
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.auth.getUser();
        const fromDB = data.user?.user_metadata?.[META_KEY] as string | undefined;
        const fromLS = localStorage.getItem(STORAGE_KEY);
        const id = fromDB ?? fromLS ?? null;
        if (id) {
          const found = ENTITIES.find(e => e.id === id);
          if (found) {
            setEntityState(found);
            // Back-sync localStorage if it was loaded from DB
            localStorage.setItem(STORAGE_KEY, found.id);
          }
        }
      } catch {
        // Auth not available — fall back to localStorage only
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const found = ENTITIES.find(e => e.id === saved);
            if (found) setEntityState(found);
          }
        } catch {}
      } finally {
        setReady(true);
      }
    }
    load();
  }, []);

  const setEntity = (e: Entity | null) => {
    setEntityState(e);

    // Sync to localStorage immediately (fast, synchronous)
    if (e) localStorage.setItem(STORAGE_KEY, e.id);
    else   localStorage.removeItem(STORAGE_KEY);

    // Persist to Supabase user_metadata (durable, async — fire and forget)
    supabase.auth.updateUser({ data: { [META_KEY]: e?.id ?? null } }).catch(() => {});
  };

  return (
    <EntityContext.Provider value={{ entity, setEntity, ready }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  return useContext(EntityContext);
}
