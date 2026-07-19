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
  color: string;
  colorMuted: string;
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
    color: '#047857',
    colorMuted: 'rgba(4,120,87,0.10)',
    since: 2010,
    type: 'holdings',
  },
];

/* ── Context ─────────────────────────────────────────────────────────── */
const META_KEY = 'preferred_entity';

interface EntityContextValue {
  entity: Entity | null;
  setEntity: (e: Entity | null) => void;
  ready: boolean;
}

const EntityContext = createContext<EntityContextValue>({
  entity: null,
  setEntity: () => {},
  ready: false,
});

export function EntityProvider({ children }: { children: ReactNode }) {
  const [entity, setEntityState] = useState<Entity | null>(null);
  const [ready,  setReady]       = useState(false);

  useEffect(() => {
    async function load() {
      // URL param (e.g. from Admin deep-link) takes priority over stored preference.
      const params = new URLSearchParams(window.location.search);
      const paramId = params.get('entity');
      if (paramId) {
        const found = ENTITIES.find(e => e.id === paramId);
        if (found) {
          setEntityState(found);
          // Persist this as the new preference so next visit remembers it.
          supabase.auth.updateUser({ data: { [META_KEY]: found.id } }).catch(() => {});
          setReady(true);
          return;
        }
      }

      // No URL param — restore from Supabase auth metadata.
      try {
        const { data } = await supabase.auth.getUser();
        const id = data.user?.user_metadata?.[META_KEY] as string | undefined;
        if (id) {
          const found = ENTITIES.find(e => e.id === id);
          if (found) setEntityState(found);
        }
      } catch {
        // Supabase auth unavailable — start with no selection.
      } finally {
        setReady(true);
      }
    }
    load();
  }, []);

  const setEntity = (e: Entity | null) => {
    setEntityState(e);
    // Persist to Supabase user metadata — durable across devices and sessions.
    supabase.auth.updateUser({ data: { [META_KEY]: e?.id ?? null } }).catch(() => {});
  };

  useEffect(() => {
    const root = document.documentElement;
    const accent = entity?.color ?? '#9D7E3F';
    const muted = entity?.colorMuted ?? 'rgba(157,126,63,0.10)';
    const secondary = entity?.id === 'houston-generator-pros'
      ? '#334155'
      : entity?.id === 'houston-enterprise-holdings'
        ? '#065f46'
        : '#1e3a5f';
    root.dataset.financeEntity = entity?.id ?? 'houston-enterprise';
    root.style.setProperty('--entity-accent', accent);
    root.style.setProperty('--entity-accent-muted', muted);
    root.style.setProperty('--entity-secondary', secondary);
  }, [entity?.id, entity?.color, entity?.colorMuted]);

  return (
    <EntityContext.Provider value={{ entity, setEntity, ready }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  return useContext(EntityContext);
}
