import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntity } from '@/contexts/EntityContext';
import { scanReceipt } from '@/lib/receiptScan';

export type DocType =
  | 'receipt'
  | 'invoice'
  | 'contract'
  | 'permit'
  | 'check_image'
  | 'tax'
  | 'bank_statement'
  | 'insurance'
  | 'photo'
  | 'other';

export interface Document {
  id: string;
  user_id: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  doc_type: DocType;
  title: string | null;
  tags: string[];
  extracted_data: Record<string, any>;
  ocr_status: 'pending' | 'processing' | 'complete' | 'failed' | 'skipped';
  ocr_error: string | null;
  linked_transaction_id: string | null;
  linked_check_id: string | null;
  linked_invoice_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadDocumentPayload {
  file: File;
  docType: DocType;
  title?: string;
  tags?: string[];
  runOcr?: boolean;
  linked_transaction_id?: string;
  linked_check_id?: string;
  linked_invoice_id?: string;
}

const BUCKET = 'documents';

function toDocument(row: any): Document {
  return {
    ...row,
    tags: row.tags ?? [],
    extracted_data: row.extracted_data ?? {},
  };
}

async function runOcrOnImage(file: File): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      try {
        const result = await scanReceipt(dataUrl);
        resolve(result as unknown as Record<string, any>);
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function useDocuments(docType?: DocType) {
  const { entity } = useEntity();
  const entityId = entity?.id ?? null;

  return useQuery({
    queryKey: ['documents', entityId, docType ?? 'all'],
    queryFn: async () => {
      if (!entityId) return [];
      let q = supabase
        .from('documents')
        .select('*')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (docType) q = q.eq('doc_type', docType);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(toDocument);
    },
    enabled: !!entityId,
  });
}

export function useUploadDocument() {
  const { entity } = useEntity();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, docType, title, tags = [], runOcr = true, linked_transaction_id, linked_check_id, linked_invoice_id }: UploadDocumentPayload) => {
      if (!entity || !user) throw new Error('Not authenticated');

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${entity.id}/${Date.now()}-${safeName}`;

      // 1. Upload file to Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      // 2. Insert metadata row (ocr_status = processing if we'll run OCR)
      const isImage = file.type.startsWith('image/');
      const willOcr = runOcr && isImage;

      const { data: row, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          entity_id: entity.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          file_type: file.type || null,
          doc_type: docType,
          title: title ?? null,
          tags,
          ocr_status: willOcr ? 'processing' : 'skipped',
          ...(linked_transaction_id ? { linked_transaction_id } : {}),
          ...(linked_check_id ? { linked_check_id } : {}),
          ...(linked_invoice_id ? { linked_invoice_id } : {}),
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // 3. Run OCR async — update row when done
      if (willOcr && row) {
        runOcrOnImage(file)
          .then(async (extracted) => {
            await supabase
              .from('documents')
              .update({ extracted_data: extracted, ocr_status: 'complete' })
              .eq('id', row.id);
            qc.invalidateQueries({ queryKey: ['documents', entity.id] });
          })
          .catch(async (err) => {
            await supabase
              .from('documents')
              .update({ ocr_status: 'failed', ocr_error: String(err?.message ?? err) })
              .eq('id', row.id);
            qc.invalidateQueries({ queryKey: ['documents', entity.id] });
          });
      }

      return toDocument(row);
    },
    onSuccess: () => {
      if (entity) qc.invalidateQueries({ queryKey: ['documents', entity.id] });
    },
  });
}

export function useDeleteDocument() {
  const { entity } = useEntity();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (doc: Document) => {
      // Soft-delete in DB
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', doc.id);
      if (error) throw error;

      // Also remove from storage (best-effort)
      await supabase.storage.from(BUCKET).remove([doc.file_path]).catch(() => {});
    },
    onSuccess: () => {
      if (entity) qc.invalidateQueries({ queryKey: ['documents', entity.id] });
    },
  });
}

export function useUpdateDocument() {
  const { entity } = useEntity();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Document, 'title' | 'doc_type' | 'tags'>> }) => {
      const { error } = await supabase.from('documents').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (entity) qc.invalidateQueries({ queryKey: ['documents', entity.id] });
    },
  });
}

export function useDocumentUrl(doc: Document | null) {
  return useQuery({
    queryKey: ['document-url', doc?.id],
    queryFn: async () => {
      if (!doc) return null;
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(doc.file_path, 3600);
      return data?.signedUrl ?? null;
    },
    enabled: !!doc,
    staleTime: 50 * 60 * 1000, // 50 min (signed URLs last 1hr)
  });
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  receipt:        'Receipt',
  invoice:        'Invoice',
  contract:       'Contract',
  permit:         'Permit',
  check_image:    'Check Image',
  tax:            'Tax Document',
  bank_statement: 'Bank Statement',
  insurance:      'Insurance',
  photo:          'Photo',
  other:          'Other',
};

export const DOC_TYPE_COLORS: Record<DocType, string> = {
  receipt:        '#10b981',
  invoice:        '#6366f1',
  contract:       '#f59e0b',
  permit:         '#ef4444',
  check_image:    '#8b5cf6',
  tax:            '#0ea5e9',
  bank_statement: '#14b8a6',
  insurance:      '#f97316',
  photo:          '#ec4899',
  other:          '#78716c',
};
