import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AdminAccessRequest {
  id: string;
  user_id: string;
  entity_id: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  /** Captured server-side (trigger reads auth.users) at submission time, so
      the developer's review UI has something readable without ever needing
      client-side access to auth.users itself. */
  requester_email: string | null;
  requester_name: string | null;
}

/** The signed-in user's own requests — used by the "awaiting approval" view
    on /auth so a pending user can see what they've already submitted instead
    of re-submitting blindly. RLS: a user can only ever see their own rows
    here (or every row, if they happen to be the developer). */
export function useMyAdminAccessRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdminAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setRequests([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('admin_access_requests' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setRequests((data as any) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = useCallback(async (entityId: string, reason: string): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Not signed in.' };
    const { error } = await supabase.from('admin_access_requests' as any).insert({
      user_id: user.id,
      entity_id: entityId,
      reason: reason.trim() || null,
    });
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  }, [user, refresh]);

  const withdraw = useCallback(async (requestId: string) => {
    await supabase.from('admin_access_requests' as any).delete().eq('id', requestId);
    await refresh();
  }, [refresh]);

  return { requests, loading, submit, withdraw, refresh };
}

/** Every request in the system — developer-only in practice (RLS only
    returns all rows to is_developer(); anyone else just gets their own back
    regardless of this query), used by the Admin Requests review tab. */
export function useAllAdminAccessRequests() {
  const [requests, setRequests] = useState<AdminAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_access_requests' as any)
      .select('*')
      .order('created_at', { ascending: false });
    setRequests((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const approve = useCallback(async (requestId: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.rpc('approve_admin_access_request' as any, { p_request_id: requestId });
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  }, [refresh]);

  const deny = useCallback(async (requestId: string, notes?: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.rpc('deny_admin_access_request' as any, { p_request_id: requestId, p_notes: notes ?? null });
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  }, [refresh]);

  return { requests, loading, approve, deny, refresh };
}
