/* ── /finance/dashboard entity switch ─────────────────────────────────────────
   Renders the overview dashboard matching the selected entity's business
   model: the existing construction dashboard (Index) for Houston Enterprise,
   Generator Operations for HGP, Holdings HQ for the holding company. Keeps
   Houston Enterprise's dashboard byte-identical — only routing changes. ── */
import { useEntity } from '@/contexts/EntityContext';
import { financeProfileFor } from '@/lib/entityFinance';
import Index from '@/pages/Index';
import GeneratorOps from '@/pages/entity/GeneratorOps';
import HoldingsHQ from '@/pages/entity/HoldingsHQ';

export default function EntityOverview() {
  const { entity } = useEntity();
  const profile = financeProfileFor(entity?.id);
  if (profile.overview === 'generator') return <GeneratorOps />;
  if (profile.overview === 'holdings') return <HoldingsHQ />;
  return <Index />;
}
