import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

interface EntityContextValue {
  entity: Entity | null;
  setEntity: (e: Entity | null) => void;
}

const EntityContext = createContext<EntityContextValue>({
  entity: null,
  setEntity: () => {},
});

export function EntityProvider({ children }: { children: ReactNode }) {
  const [entity, setEntityState] = useState<Entity | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = ENTITIES.find(e => e.id === saved);
        return found ?? null;
      }
    } catch {}
    return null;
  });

  const setEntity = (e: Entity | null) => {
    setEntityState(e);
    if (e) localStorage.setItem(STORAGE_KEY, e.id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <EntityContext.Provider value={{ entity, setEntity }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  return useContext(EntityContext);
}
