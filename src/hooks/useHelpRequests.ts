import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type HelpRequestCategory = 'stuck' | 'bug' | 'feature_request' | 'question' | 'other';
export type HelpRequestStatus = 'open' | 'in_progress' | 'resolved';

export interface HelpRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  user_role: string | null;
  category: HelpRequestCategory;
  message: string;
  page_path: string | null;
  page_title: string | null;
  entity_id: string | null;
  screenshot_path: string | null;
  viewport: Record<string, unknown> | null;
  status: HelpRequestStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

const BUCKET = 'help-screenshots';
export const SUPPORT_ADMIN_EMAIL = 'hunainm.qureshi@gmail.com';

export interface CreateHelpRequestPayload {
  category: HelpRequestCategory;
  message: string;
  pagePath: string;
  pageTitle?: string;
  entityId?: string | null;
  screenshotBlob?: Blob | null;
  viewport?: Record<string, unknown>;
}

export function useCreateHelpRequest() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: CreateHelpRequestPayload) => {
      if (!user) throw new Error('You must be signed in to send a help request');

      let screenshot_path: string | null = null;
      if (payload.screenshotBlob) {
        const path = `${user.id}/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, payload.screenshotBlob, { contentType: 'image/png', upsert: false });
        if (uploadError) throw uploadError;
        screenshot_path = path;
      }

      const { error } = await supabase.from('admin_help_requests').insert({
        user_id: user.id,
        user_email: user.email,
        user_name: user.user_metadata?.full_name || null,
        user_role: user.role,
        category: payload.category,
        message: payload.message,
        page_path: payload.pagePath,
        page_title: payload.pageTitle || null,
        entity_id: payload.entityId || null,
        screenshot_path,
        viewport: payload.viewport ? (payload.viewport as never) : null,
      });
      if (error) throw error;
    },
  });
}

/** Real-time admin inbox — `enabled` should gate on the support-admin email so
 * non-admins never even issue the query (RLS blocks it too, this just avoids
 * a pointless request + subscription). */
export function useHelpRequests(enabled: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['admin-help-requests'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_help_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HelpRequest[];
    },
    refetchInterval: enabled ? 60_000 : false,
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel('admin-help-requests-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_help_requests' }, () => {
        qc.invalidateQueries({ queryKey: ['admin-help-requests'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, qc]);

  return query;
}

export function useUpdateHelpRequestStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, resolutionNote }: { id: string; status: HelpRequestStatus; resolutionNote?: string }) => {
      const patch: Record<string, unknown> = { status };
      if (status === 'resolved') {
        patch.resolved_at = new Date().toISOString();
        patch.resolved_by = user?.id ?? null;
      }
      if (resolutionNote !== undefined) patch.resolution_note = resolutionNote;
      const { error } = await supabase.from('admin_help_requests').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-help-requests'] }),
  });
}

export function useHelpRequestScreenshotUrl(path: string | null) {
  return useQuery({
    queryKey: ['help-request-screenshot-url', path],
    queryFn: async () => {
      if (!path) return null;
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
  });
}

export const HELP_CATEGORY_LABELS: Record<HelpRequestCategory, string> = {
  stuck: 'Stuck / Need Guidance',
  bug: 'Something Broken',
  feature_request: 'Feature Request',
  question: 'Question',
  other: 'Other',
};
