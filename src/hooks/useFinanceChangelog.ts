import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type FinanceChangelogEntry = {
  action: string;
  entity: string;
  entityId?: string | null;
  entityLabel?: string | null;
  details?: Record<string, unknown>;
};

export function useFinanceChangelog() {
  const { user } = useAuth();

  return useCallback(async ({
    action,
    entity,
    entityId = null,
    entityLabel = null,
    details = {},
  }: FinanceChangelogEntry) => {
    const { error } = await supabase.from('admin_changelog' as any).insert({
      action,
      entity,
      dashboard: 'finance',
      entity_id: entityId,
      entity_label: entityLabel,
      changed_by: user?.email || user?.id || 'finance_app',
      details: {
        source: 'finance_dashboard',
        recorded_at: new Date().toISOString(),
        ...details,
      },
    });

    if (error) {
      console.warn('[finance changelog] Unable to record audit event', error);
    }
  }, [user?.email, user?.id]);
}
