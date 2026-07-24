import { useNavigate } from 'react-router-dom';
import { ENTITIES, Entity, useEntity } from '@/contexts/EntityContext';
import { useAuth } from '@/hooks/useAuth';
import {
  ENTITY_CARD_CSS, EntityCard, EntityPortalHeader, TopAccentLine, HeadlineAccentTick,
} from '@/components/EntityWorkspaceCard';

/** The entire entity-selector page — used verbatim by both /finance
    (EntitySelect.tsx) and /ops (OpsCenter.tsx) so the two routes can never
    drift apart again. Only the header eyebrow and headline copy differ
    between them; every card, every interaction, and all styling is the
    exact same render. */
export function EntitySelectorScreen({
  eyebrow = 'Enterprise Portal',
  headline = 'Select your workspace',
  subheadline = 'Each entity has its own dashboard, data, and access level.',
}: {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
}) {
  const { entity: current, setEntity } = useEntity();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleGo = (entity: Entity, target: 'admin' | 'finance') => {
    setEntity(entity);
    navigate(target === 'admin' ? '/admin' : '/finance/dashboard');
  };

  const handleSignOut = () => { signOut(); navigate('/auth'); };

  return (
    <div className="h-[100dvh] w-full bg-white flex flex-col overflow-hidden px-4 sm:px-6 md:px-10 py-2.5 md:py-6">
      <style>{ENTITY_CARD_CSS}</style>
      <TopAccentLine />

      <EntityPortalHeader eyebrow={eyebrow} rightHint="Choose a workspace to continue" onSignOut={handleSignOut} />

      {/* Headline + stacked cards — centered as one block so leftover space
          reads as intentional whitespace rather than empty room. Capped to
          a max width so wide single-column cards stay readable on large
          monitors instead of stretching edge to edge. */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
        <div className="w-full max-w-4xl mx-auto">
          <div className="mb-2.5 md:mb-5 shrink-0">
            <HeadlineAccentTick />
            <h1 className="text-[18px] md:text-[28px] font-black text-gray-900 tracking-tight leading-none">
              {headline}
            </h1>
            <p className="hidden md:block text-[13px] text-gray-500 mt-1.5">
              {subheadline}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:gap-3.5">
            {ENTITIES.map((e) => (
              <EntityCard
                key={e.id}
                entity={e}
                isCurrent={current?.id === e.id}
                onGo={(target) => handleGo(e, target)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
