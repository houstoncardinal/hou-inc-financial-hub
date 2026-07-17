import { supabase } from '@/integrations/supabase/client';

type HealthSeverity = 'info' | 'warning' | 'error' | 'critical';

export async function recordSystemHealthEvent(input: {
  area: string;
  message: string;
  severity?: HealthSeverity;
  entityId?: string | null;
  userId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    await supabase.from('system_health_events' as any).insert({
      user_id: input.userId ?? null,
      entity_id: input.entityId ?? null,
      area: input.area,
      severity: input.severity ?? 'info',
      message: input.message,
      details: input.details ?? {},
    });
  } catch {
    // Health logging must never block the workflow it is observing.
  }
}

export function isSchemaCacheError(message?: string) {
  if (!message) return false;
  const text = message.toLowerCase();
  return text.includes('schema cache') || text.includes('could not find the') || text.includes('reload schema');
}
