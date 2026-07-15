import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortalClientLite {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  project_type?: string | null;
  project_interest?: string | null;
  status?: string | null;
}

export function usePortalClients() {
  return useQuery({
    queryKey: ['portal-clients-lite'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('portal_clients')
        .select('id, name, email, phone, project_type, project_interest, status')
        .order('name');
      if (error) throw error;
      return (data ?? []) as PortalClientLite[];
    },
  });
}

export function useCreatePortalClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (client: { name: string; email?: string; phone?: string; project_type?: string; project_interest?: string }) => {
      const email = client.email?.trim()
        ? client.email.trim().toLowerCase()
        : `client-${Date.now()}@finance.local`;
      const { data, error } = await (supabase as any)
        .from('portal_clients')
        .insert({
          name: client.name,
          email,
          phone: client.phone || null,
          project_type: client.project_type || 'Client payment source',
          project_interest: client.project_interest || null,
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .select('id, name, email, phone, project_type, project_interest, status')
        .single();
      if (error) throw error;
      return data as PortalClientLite;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-clients-lite'] }),
  });
}
