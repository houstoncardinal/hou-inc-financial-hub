import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, Trash2, Check, ChevronDown, ChevronUp,
  Calendar, CheckCircle2, Circle, Loader2, Zap, Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Tokens ──────────────────────────────────────────────────────────── */
const B    = '#0A0A0A';
const W    = '#FFFFFF';
const AC   = '#9D7E3F';
const ACL  = '#C4A76B';
const G50  = '#F5F4F2';
const G100 = '#ECEAE6';
const G200 = '#E8E4DE';
const G500 = '#8A8580';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const SERIF = "'Cormorant Garamond', Georgia, serif";

/* ── Types ───────────────────────────────────────────────────────────── */
export interface MilestoneRow {
  id:                string;
  client_id:         string;
  sort_order:        number;
  phase_name:        string;
  phase_description: string;
  admin_notes:       string;
  target_date:       string;
  completed_date:    string;
  is_active:         boolean;
}

type Status = 'complete' | 'active' | 'pending';

function getStatus(m: MilestoneRow): Status {
  if (m.completed_date) return 'complete';
  if (m.is_active)      return 'active';
  return 'pending';
}

function fmtDate(d: string) {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

/* ── Skeleton placeholder for new rows ────────────────────────────────── */
const blankMilestone = (clientId: string, sortOrder: number): Omit<MilestoneRow, 'id'> => ({
  client_id:         clientId,
  sort_order:        sortOrder,
  phase_name:        '',
  phase_description: '',
  admin_notes:       '',
  target_date:       '',
  completed_date:    '',
  is_active:         false,
});

/* ════════════════════════════════════════════════════════════════════════
   SORTABLE MILESTONE ROW
════════════════════════════════════════════════════════════════════════ */
function MilestoneItem({
  milestone,
  index,
  total,
  expanded,
  saving,
  onToggle,
  onChange,
  onSave,
  onStatusChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  milestone:      MilestoneRow;
  index:          number;
  total:          number;
  expanded:       boolean;
  saving:         boolean;
  onToggle:       () => void;
  onChange:       (field: keyof MilestoneRow, value: string | boolean) => void;
  onSave:         () => void;
  onStatusChange: (status: Status) => void;
  onDelete:       () => void;
  onMoveUp:       () => void;
  onMoveDown:     () => void;
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: milestone.id });

  const style: React.CSSProperties = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.45 : 1,
    zIndex:     isDragging ? 50 : 'auto',
  };

  const status      = getStatus(milestone);
  const isComplete  = status === 'complete';
  const isActive    = status === 'active';
  const isPending   = status === 'pending';

  const statusColor = isComplete ? GREEN : isActive ? AC : G500;
  const statusLabel = isComplete ? 'Complete' : isActive ? 'In Progress' : 'Pending';

  /* Name ref for auto-focus on new rows */
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (expanded && !milestone.phase_name) nameRef.current?.focus();
  }, [expanded]);

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{ borderBottom: `1px solid ${G200}`, backgroundColor: isDragging ? G50 : W }}
      >
        {/* ── Collapsed row ── */}
        <div
          className="flex items-center gap-2 px-4 py-3 select-none"
          style={{ minHeight: 48 }}
        >
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="shrink-0 cursor-grab active:cursor-grabbing touch-none flex items-center justify-center w-8 h-11"
            style={{ color: G200 }}
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Status indicator */}
          <div className="shrink-0" onClick={() => onToggle()}>
            {isComplete ? (
              <div className="w-5 h-5 flex items-center justify-center rounded-full cursor-pointer" style={{ backgroundColor: GREEN }}>
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            ) : isActive ? (
              <div className="w-5 h-5 rounded-full border-2 animate-pulse cursor-pointer" style={{ borderColor: AC, backgroundColor: 'rgba(157,126,63,0.12)' }} />
            ) : (
              <div className="w-5 h-5 rounded-full border cursor-pointer" style={{ borderColor: G200 }} />
            )}
          </div>

          {/* Index number */}
          <span className="text-[9px] font-bold tabular-nums shrink-0" style={{ color: G500, width: 18 }}>
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Inline name edit */}
          <input
            ref={nameRef}
            value={milestone.phase_name}
            onChange={e => onChange('phase_name', e.target.value)}
            onBlur={onSave}
            onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            placeholder="Milestone name…"
            className="flex-1 min-w-0 text-[12px] font-semibold bg-transparent outline-none"
            style={{ color: B, caretColor: AC }}
            onClick={e => e.stopPropagation()}
          />

          {/* Status chip */}
          <span
            className="text-[7px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 shrink-0 hidden sm:inline"
            style={{ backgroundColor: `${statusColor}14`, color: statusColor }}
          >
            {statusLabel}
          </span>

          {/* Date preview */}
          {isComplete && milestone.completed_date && (
            <span className="text-[9px] font-light shrink-0 hidden md:block" style={{ color: G500 }}>
              {fmtDate(milestone.completed_date)}
            </span>
          )}
          {!isComplete && milestone.target_date && (
            <span className="text-[9px] font-light shrink-0 hidden md:block" style={{ color: G500 }}>
              ⟶ {fmtDate(milestone.target_date)}
            </span>
          )}

          {/* Up / down (fallback for touch) */}
          <div className="flex flex-col shrink-0 md:hidden">
            <button
              onClick={e => { e.stopPropagation(); onMoveUp(); }}
              disabled={index === 0}
              className="disabled:opacity-20 flex items-center justify-center w-8 h-6"
              style={{ color: G500 }}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onMoveDown(); }}
              disabled={index === total - 1}
              className="disabled:opacity-20 flex items-center justify-center w-8 h-6"
              style={{ color: G500 }}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Saving spinner */}
          {saving && <Loader2 className="w-3 h-3 animate-spin shrink-0" style={{ color: AC }} />}

          {/* Delete */}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="shrink-0 flex items-center justify-center w-10 h-10 transition-opacity hover:opacity-100 opacity-30"
            style={{ color: '#ef4444' }}
            title="Delete milestone"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Expand toggle */}
          <button
            onClick={onToggle}
            className="shrink-0 flex items-center justify-center w-10 h-10 transition-transform"
            style={{ color: G500, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Expanded edit panel ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-5 pb-5 pt-2" style={{ backgroundColor: G50, borderTop: `1px solid ${G100}` }}>

                {/* Status buttons */}
                <div className="mb-4">
                  <div className="text-[7px] uppercase tracking-[0.28em] font-bold mb-2" style={{ color: G500 }}>Quick Status</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {([
                      { label: 'Pending',     s: 'pending'  as Status, color: G500 },
                      { label: 'In Progress', s: 'active'   as Status, color: AC },
                      { label: 'Complete',    s: 'complete' as Status, color: GREEN },
                    ] as const).map(({ label, s, color }) => {
                      const active = status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => onStatusChange(s)}
                          disabled={saving || active}
                          className="text-[8px] uppercase tracking-[0.16em] font-bold px-4 py-3 transition-all disabled:opacity-40 min-h-[44px]"
                          style={{ backgroundColor: active ? color : W, color: active ? W : color, border: `1px solid ${active ? color : G200}` }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[7px] uppercase tracking-[0.28em] font-bold block mb-1.5" style={{ color: G500 }}>
                      <Calendar className="w-2.5 h-2.5 inline mr-1" />Target Date
                    </label>
                    <input
                      type="date"
                      value={milestone.target_date}
                      onChange={e => onChange('target_date', e.target.value)}
                      onBlur={onSave}
                      className="w-full text-[11px] font-light outline-none"
                      style={{ padding: '6px 10px', border: `1px solid ${G200}`, backgroundColor: W, color: B }}
                    />
                  </div>
                  <div>
                    <label className="text-[7px] uppercase tracking-[0.28em] font-bold block mb-1.5" style={{ color: G500 }}>
                      <CheckCircle2 className="w-2.5 h-2.5 inline mr-1" />Completion Date
                    </label>
                    <input
                      type="date"
                      value={milestone.completed_date}
                      onChange={e => onChange('completed_date', e.target.value)}
                      onBlur={onSave}
                      className="w-full text-[11px] font-light outline-none"
                      style={{ padding: '6px 10px', border: `1px solid ${G200}`, backgroundColor: W, color: B }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <label className="text-[7px] uppercase tracking-[0.28em] font-bold block mb-1.5" style={{ color: G500 }}>
                    Description <span className="normal-case tracking-normal font-light">(shown to client)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="What happens during this phase…"
                    value={milestone.phase_description}
                    onChange={e => onChange('phase_description', e.target.value)}
                    onBlur={onSave}
                    className="w-full text-[11px] font-light outline-none resize-none"
                    style={{ padding: '6px 10px', border: `1px solid ${G200}`, backgroundColor: W, color: B }}
                  />
                </div>

                {/* Admin notes */}
                <div className="mb-4">
                  <label className="text-[7px] uppercase tracking-[0.28em] font-bold block mb-1.5" style={{ color: G500 }}>
                    Internal Notes <span className="normal-case tracking-normal font-light">(admin only — not shown to client)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Permit #, subcontractor notes, blockers…"
                    value={milestone.admin_notes}
                    onChange={e => onChange('admin_notes', e.target.value)}
                    onBlur={onSave}
                    className="w-full text-[11px] font-light outline-none resize-none"
                    style={{ padding: '6px 10px', border: `1px solid ${G200}`, backgroundColor: 'rgba(157,126,63,0.025)', color: B }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-light" style={{ color: G500 }}>
                    Changes auto-save and push to client portal instantly
                  </span>
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-black px-3 py-1.5 transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: B, color: W }}
                  >
                    {saving
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                      : <><Zap className="w-3 h-3" /> Save & Push</>}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN EXPORT — MilestoneManager
════════════════════════════════════════════════════════════════════════ */
export default function MilestoneManager({ clientId }: { clientId: string }) {
  const [rows, setRows]           = useState<MilestoneRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [savingId, setSavingId]   = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [liveFlash, setLiveFlash] = useState(false);

  /* Track draft edits per row so typing doesn't conflict with realtime reloads */
  const drafts = useRef<Record<string, Partial<MilestoneRow>>>({});

  /* ── Load ── */
  const load = useCallback(async (isRealtime = false) => {
    const { data, error } = await (supabase as any)
      .from('project_milestones')
      .select('id, client_id, sort_order, phase_name, phase_description, admin_notes, target_date, completed_date, is_active, updated_at')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true });

    if (error) {
      toast({ title: 'Could not load milestones', description: error.message });
      setLoading(false);
      return;
    }

    const normalized: MilestoneRow[] = (data ?? []).map((r: any) => ({
      id:                r.id,
      client_id:         r.client_id,
      sort_order:        r.sort_order ?? 0,
      phase_name:        r.phase_name        ?? '',
      phase_description: r.phase_description ?? '',
      admin_notes:       r.admin_notes       ?? '',
      target_date:       r.target_date       ?? '',
      completed_date:    r.completed_date    ?? '',
      is_active:         r.is_active         ?? false,
    }));

    /* Merge any in-flight drafts so typing doesn't get overwritten by realtime */
    setRows(normalized.map(r => {
      const d = drafts.current[r.id];
      return d ? { ...r, ...d } : r;
    }));

    if (isRealtime) {
      setLiveFlash(true);
      setTimeout(() => setLiveFlash(false), 1500);
    }
    setLoading(false);
  }, [clientId]);

  /* ── Real-time subscription ── */
  useEffect(() => {
    setLoading(true);
    load();
    const ch = supabase
      .channel(`ms-admin:${clientId}`)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'project_milestones', filter: `client_id=eq.${clientId}` },
        () => load(true),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, load]);

  /* ── Persist a single row ── */
  const saveRow = useCallback(async (row: MilestoneRow): Promise<boolean> => {
    setSavingId(row.id);
    const { error } = await (supabase as any)
      .from('project_milestones')
      .update({
        sort_order:        row.sort_order,
        phase_name:        row.phase_name        || null,
        phase_description: row.phase_description || null,
        admin_notes:       row.admin_notes       || null,
        target_date:       row.target_date       || null,
        completed_date:    row.completed_date    || null,
        is_active:         row.is_active,
      })
      .eq('id', row.id);
    setSavingId(null);
    if (error) {
      toast({ title: 'Save failed', description: error.message });
      return false;
    }
    /* Clear draft for this row since it's now persisted */
    delete drafts.current[row.id];
    return true;
  }, []);

  /* ── Local edit helper (drafts + optimistic UI) ── */
  const editRow = useCallback((id: string, field: keyof MilestoneRow, value: string | boolean) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    drafts.current[id] = { ...(drafts.current[id] ?? {}), [field]: value };
  }, []);

  /* ── Status change (auto-save immediately) ── */
  const handleStatusChange = useCallback(async (rowId: string, newStatus: Status) => {
    /* Clear active flag from all rows if setting a new active */
    if (newStatus === 'active') {
      const clearRes = await (supabase as any)
        .from('project_milestones')
        .update({ is_active: false })
        .eq('client_id', clientId);
      if (clearRes.error) {
        toast({ title: 'Could not clear active phase', description: clearRes.error.message });
        return;
      }
      setRows(prev => prev.map(r => ({ ...r, is_active: false })));
    }

    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        is_active:      newStatus === 'active',
        completed_date: newStatus === 'complete' ? (r.completed_date || new Date().toISOString().split('T')[0]) : '',
      };
    }));

    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const updated: MilestoneRow = {
      ...row,
      is_active:      newStatus === 'active',
      completed_date: newStatus === 'complete' ? (row.completed_date || new Date().toISOString().split('T')[0]) : '',
    };

    const { error } = await (supabase as any)
      .from('project_milestones')
      .update({
        is_active:      updated.is_active,
        completed_date: updated.completed_date || null,
      })
      .eq('id', rowId);

    if (error) {
      toast({ title: 'Status update failed', description: error.message });
    } else {
      const label = newStatus === 'complete' ? 'marked complete' : newStatus === 'active' ? 'set as active' : 'reset to pending';
      toast({ title: `Milestone ${label}`, description: 'Client portal updated instantly.' });
    }
  }, [clientId, rows]);

  /* ── Delete ── */
  const handleDelete = useCallback(async (rowId: string, name: string) => {
    if (!confirm(`Delete "${name || 'this milestone'}"? This cannot be undone.`)) return;
    setRows(prev => prev.filter(r => r.id !== rowId));
    const { error } = await (supabase as any)
      .from('project_milestones')
      .delete()
      .eq('id', rowId);
    if (error) {
      toast({ title: 'Delete failed', description: error.message });
      load();
    } else {
      toast({ title: 'Milestone deleted' });
    }
  }, [load]);

  /* ── Add new milestone ── */
  const handleAdd = useCallback(async () => {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), -1);
    const payload = {
      client_id:         clientId,
      sort_order:        maxOrder + 1,
      phase_index:       maxOrder + 1,
      phase_name:        '',
      phase_description: '',
      admin_notes:       '',
      target_date:       null,
      completed_date:    null,
      is_active:         false,
    };
    const { data, error } = await (supabase as any)
      .from('project_milestones')
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      toast({ title: 'Could not add milestone', description: error.message });
      return;
    }
    /* Optimistically add + auto-expand the new row */
    const newRow: MilestoneRow = { ...blankMilestone(clientId, maxOrder + 1), id: data.id };
    setRows(prev => [...prev, newRow]);
    setExpandedId(data.id);
    toast({ title: 'Milestone added — give it a name!' });
  }, [clientId, rows]);

  /* ── Drag end → reorder ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rows.findIndex(r => r.id === active.id);
    const newIndex = rows.findIndex(r => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(rows, oldIndex, newIndex).map((r, i) => ({ ...r, sort_order: i }));
    setRows(reordered);

    /* Persist all new sort_order values */
    const updates = reordered.map(r =>
      (supabase as any).from('project_milestones').update({ sort_order: r.sort_order, phase_index: r.sort_order }).eq('id', r.id),
    );
    const results = await Promise.all(updates);
    const failed = results.find((r: any) => r.error);
    if (failed) {
      toast({ title: 'Reorder failed', description: (failed as any).error.message });
      load();
    } else {
      toast({ title: 'Order saved', description: 'Client portal updated instantly.' });
    }
  }, [rows, load]);

  /* ── Move up/down (touch fallback) ── */
  const moveRow = useCallback(async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const reordered = arrayMove(rows, index, target).map((r, i) => ({ ...r, sort_order: i }));
    setRows(reordered);
    await Promise.all(reordered.map(r =>
      (supabase as any).from('project_milestones').update({ sort_order: r.sort_order, phase_index: r.sort_order }).eq('id', r.id),
    ));
    toast({ title: 'Order saved' });
  }, [rows]);

  /* ── Stats ── */
  const total     = rows.length;
  const completed = rows.filter(r => r.completed_date).length;
  const active    = rows.find(r => r.is_active);
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  /* ─────────────────────────────────────────────────────────────────── */

  return (
    <div style={{ backgroundColor: W }}>

      {/* ── Header ── */}
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${G200}` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.05rem', color: B }}>
                Project Milestones
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: '#10b981' }} />
                <span className="text-[7px] uppercase tracking-[0.2em] font-semibold" style={{ color: '#10b981' }}>Live</span>
              </div>
              {liveFlash && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1 px-1.5 py-0.5"
                  style={{ backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Zap className="w-2.5 h-2.5" style={{ color: '#10b981' }} />
                  <span className="text-[7px] font-semibold" style={{ color: '#10b981' }}>Updated</span>
                </motion.div>
              )}
            </div>
            <div className="text-[8px] font-light" style={{ color: G500 }}>
              {completed}/{total} complete · {pct}% · drag rows to reorder
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Progress */}
            <div className="w-24 hidden sm:block">
              <div className="h-1 overflow-hidden" style={{ backgroundColor: G200 }}>
                <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: AC }} />
              </div>
            </div>
            {/* Add button */}
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] font-black px-3 py-2 transition-all hover:opacity-80"
              style={{ backgroundColor: AC, color: W }}
            >
              <Plus className="w-3 h-3" /> Add Milestone
            </button>
          </div>
        </div>

        {/* Active phase callout */}
        {active && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2" style={{ backgroundColor: 'rgba(157,126,63,0.05)', border: `1px solid rgba(157,126,63,0.2)` }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: AC }} />
            <span className="text-[10px] font-semibold" style={{ color: AC }}>
              Currently active: {active.phase_name || `Milestone ${rows.indexOf(active) + 1}`}
              {active.target_date && ` — target ${fmtDate(active.target_date)}`}
            </span>
          </div>
        )}
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="px-5 py-10 flex items-center justify-center gap-2" style={{ color: G500 }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[11px] font-light">Loading milestones…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-14 flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: G50, border: `1px solid ${G200}` }}>
            <Clock className="w-5 h-5" style={{ color: G500 }} strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-[12px] font-semibold mb-1" style={{ color: B }}>No milestones yet</div>
            <div className="text-[11px] font-light" style={{ color: G500 }}>
              Add milestones specific to this project. They'll appear on the client's timeline.
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-black px-4 py-2"
            style={{ backgroundColor: AC, color: W }}
          >
            <Plus className="w-3 h-3" /> Add First Milestone
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
            {rows.map((row, i) => (
              <MilestoneItem
                key={row.id}
                milestone={row}
                index={i}
                total={rows.length}
                expanded={expandedId === row.id}
                saving={savingId === row.id}
                onToggle={() => setExpandedId(prev => prev === row.id ? null : row.id)}
                onChange={(field, value) => editRow(row.id, field, value)}
                onSave={() => saveRow(row)}
                onStatusChange={status => handleStatusChange(row.id, status)}
                onDelete={() => handleDelete(row.id, row.phase_name)}
                onMoveUp={() => moveRow(i, -1)}
                onMoveDown={() => moveRow(i, 1)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* ── Footer add button ── */}
      {rows.length > 0 && (
        <div className="px-5 py-3" style={{ borderTop: `1px solid ${G200}` }}>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 w-full justify-center text-[9px] uppercase tracking-[0.2em] font-bold py-2.5 transition-all hover:opacity-70"
            style={{ border: `1px dashed ${G200}`, color: G500 }}
          >
            <Plus className="w-3 h-3" /> Add Another Milestone
          </button>
        </div>
      )}

    </div>
  );
}
