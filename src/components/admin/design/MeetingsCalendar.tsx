import { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameDay, isSameMonth, isToday, addMonths, subMonths, parseISO, isAfter, startOfDay,
} from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Video, Phone, MapPin, CalendarClock, CalendarCheck2,
  Plus, Pencil, Trash2, X, Check, XCircle, CheckCircle2,
} from 'lucide-react';

const IND = '#4F46E5';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  confirmed: { bg: 'rgba(2,132,199,0.10)',  fg: '#0284C7' },
  requested: { bg: 'rgba(217,119,6,0.12)',  fg: '#D97706' },
  completed: { bg: 'rgba(5,150,105,0.10)',  fg: '#059669' },
  cancelled: { bg: 'rgba(220,38,38,0.10)',  fg: '#DC2626' },
};

const FORMAT_ICON: Record<string, any> = {
  'Video Call': Video,
  'Phone Call': Phone,
  'In-Person': MapPin,
};

const MEETING_TYPES = ['Project Consultation', 'Site Visit', 'Design Review', 'Budget Review', 'Progress Update', 'Contract Signing'];

export interface CalendarMeeting {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  date: string;
  time: string;
  format: string;
  status: string;
  notes?: string;
}

export interface MeetingFormInput {
  id?: string;
  clientId: string;
  type: string;
  date: string;
  time: string;
  format: 'In-Person' | 'Video Call' | 'Phone Call';
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
}

function MeetingRow({
  m, showDate, busy, deletePending,
  onOpen, onEdit, onRequestDelete, onCancelDeleteRequest, onDelete, onConfirm, onCancel, onComplete,
}: {
  m: CalendarMeeting;
  showDate?: boolean;
  busy: boolean;
  deletePending: boolean;
  onOpen: (clientId: string) => void;
  onEdit: (m: CalendarMeeting) => void;
  onRequestDelete: (id: string) => void;
  onCancelDeleteRequest: () => void;
  onDelete: (m: CalendarMeeting) => void;
  onConfirm: (m: CalendarMeeting) => void;
  onCancel: (m: CalendarMeeting) => void;
  onComplete: (m: CalendarMeeting) => void;
}) {
  const Icon = FORMAT_ICON[m.format] ?? Video;
  const color = STATUS_COLORS[m.status] ?? STATUS_COLORS.requested;
  return (
    <div className="group rounded-xl px-2.5 py-2 transition-colors ov-row">
      <div className="flex items-center gap-2.5">
        <button onClick={() => onOpen(m.clientId)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
          <span className="ov-icon-pop w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${IND}14` }}>
            <Icon className="w-4 h-4" style={{ color: IND }} strokeWidth={1.9} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[11.5px] font-bold text-gray-900 truncate leading-tight">{m.clientName}</span>
            <span className="block text-[10px] text-gray-500 truncate">
              {m.type} · {showDate ? `${format(parseISO(m.date), 'MMM d')}, ${m.time}` : m.time}
            </span>
          </span>
        </button>
        <span className="rounded-full px-2 py-0.5 text-[8.5px] font-bold capitalize whitespace-nowrap shrink-0" style={{ backgroundColor: color.bg, color: color.fg }}>
          {m.status}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(m); }}
            disabled={busy}
            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-black hover:bg-black/5 transition-colors disabled:opacity-40"
            title="Edit meeting" aria-label="Edit meeting"
          >
            <Pencil className="w-3 h-3" strokeWidth={2} />
          </button>
          {deletePending ? (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(m); }}
              onMouseLeave={onCancelDeleteRequest}
              disabled={busy}
              className="px-2 h-6 rounded-md flex items-center gap-1 text-[8px] font-bold uppercase tracking-wide text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Trash2 className="w-2.5 h-2.5" strokeWidth={2.2} /> Confirm
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onRequestDelete(m.id); }}
              disabled={busy}
              className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
              title="Delete meeting" aria-label="Delete meeting"
            >
              <Trash2 className="w-3 h-3" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
      {m.status === 'requested' && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-11">
          <button onClick={(e) => { e.stopPropagation(); onConfirm(m); }} disabled={busy}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-40">
            <Check className="w-2.5 h-2.5" strokeWidth={2.5} /> Confirm
          </button>
          <button onClick={(e) => { e.stopPropagation(); onCancel(m); }} disabled={busy}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-40">
            <XCircle className="w-2.5 h-2.5" strokeWidth={2.5} /> Decline
          </button>
        </div>
      )}
      {m.status === 'confirmed' && (
        <div className="flex items-center gap-1.5 mt-1.5 ml-11">
          <button onClick={(e) => { e.stopPropagation(); onComplete(m); }} disabled={busy}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-40">
            <CheckCircle2 className="w-2.5 h-2.5" strokeWidth={2.5} /> Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}

function MeetingFormModal({ initial, clientOptions, onSave, onClose, saving }: {
  initial: MeetingFormInput;
  clientOptions: { id: string; name: string }[];
  onSave: (input: MeetingFormInput) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const isEdit = Boolean(initial.id);
  const canSave = Boolean(form.clientId && form.type.trim() && form.date && form.time);
  const fieldCls = "w-full text-[12.5px] rounded-lg border border-gray-200 px-3 py-2.5 outline-none focus:border-black transition-colors bg-white";
  const labelCls = "text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1 block";

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <motion.div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit meeting' : 'Schedule meeting'}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: '#F0F1F5' }}>
          <div>
            <div className="text-[13px] font-bold text-gray-900">{isEdit ? 'Edit Meeting' : 'Schedule Meeting'}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{isEdit ? 'Updates sync to the client portal in real time.' : 'The client is notified automatically.'}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition-colors shrink-0">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-3.5 overflow-y-auto">
          <div>
            <label className={labelCls}>Client</label>
            {isEdit ? (
              <div className="text-[12.5px] font-semibold text-gray-900 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                {clientOptions.find(c => c.id === form.clientId)?.name ?? 'Client'}
              </div>
            ) : (
              <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} className={fieldCls}>
                <option value="">Select a client…</option>
                {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className={labelCls}>Meeting Type</label>
            <input value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} list="meeting-type-options"
              placeholder="e.g. Project Consultation" className={fieldCls} />
            <datalist id="meeting-type-options">
              {MEETING_TYPES.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className={fieldCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Format</label>
              <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value as MeetingFormInput['format'] }))} className={fieldCls}>
                <option value="Video Call">Video Call</option>
                <option value="Phone Call">Phone Call</option>
                <option value="In-Person">In-Person</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as MeetingFormInput['status'] }))} className={fieldCls}>
                <option value="requested">Requested</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              placeholder="Agenda, location, video link, prep notes…" className={`${fieldCls} resize-none`} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0" style={{ borderColor: '#F0F1F5' }}>
          <button onClick={onClose} className="ov-btn-outline">Cancel</button>
          <button onClick={() => canSave && onSave(form)} disabled={!canSave || saving} className="ov-btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Meeting'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function MeetingsCalendar({
  meetings, onOpenMeeting, clientOptions, onSaveMeeting, onDeleteMeeting, onConfirmMeeting, onCancelMeeting, compact = false,
}: {
  meetings: CalendarMeeting[];
  onOpenMeeting: (clientId: string) => void;
  clientOptions: { id: string; name: string }[];
  onSaveMeeting: (input: MeetingFormInput) => Promise<void>;
  onDeleteMeeting: (clientId: string, meetingId: string, meetingType: string) => Promise<void>;
  onConfirmMeeting: (clientId: string, meetingId: string, meetingType: string, date: string, time: string) => Promise<void>;
  onCancelMeeting: (clientId: string, meetingId: string, meetingType: string) => Promise<void>;
  /** Stacks the month grid above the agenda instead of side‑by‑side — for embedding in a narrower column. */
  compact?: boolean;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [formState, setFormState] = useState<MeetingFormInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteArmedId, setDeleteArmedId] = useState<string | null>(null);

  const meetingsByDay = useMemo(() => {
    const map: Record<string, CalendarMeeting[]> = {};
    meetings.forEach(m => {
      if (!m.date) return;
      (map[m.date] ??= []).push(m);
    });
    return map;
  }, [meetings]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedMeetings = (meetingsByDay[selectedKey] ?? []).sort((a, b) => a.time.localeCompare(b.time));

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return meetings
      .filter(m => {
        if (m.status === 'cancelled') return false;
        const d = parseISO(m.date);
        return isAfter(d, today) || isSameDay(d, today);
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 6);
  }, [meetings]);

  const openNewMeetingForm = () => {
    setFormState({
      clientId: clientOptions[0]?.id ?? '', type: 'Project Consultation',
      date: format(selectedDate, 'yyyy-MM-dd'), time: '10:00',
      format: 'Video Call', status: 'confirmed', notes: '',
    });
  };
  const openEditMeetingForm = (m: CalendarMeeting) => {
    setFormState({
      id: m.id, clientId: m.clientId, type: m.type, date: m.date, time: m.time,
      format: (m.format as MeetingFormInput['format']) || 'Video Call',
      status: (m.status as MeetingFormInput['status']) || 'confirmed',
      notes: m.notes ?? '',
    });
  };
  const handleFormSave = async (input: MeetingFormInput) => {
    setBusy(true);
    try {
      await onSaveMeeting(input);
      setFormState(null);
    } finally {
      setBusy(false);
    }
  };
  const handleDelete = async (m: CalendarMeeting) => {
    setBusy(true);
    try {
      await onDeleteMeeting(m.clientId, m.id, m.type);
      setDeleteArmedId(null);
    } finally {
      setBusy(false);
    }
  };
  const handleConfirm = async (m: CalendarMeeting) => {
    setBusy(true);
    try { await onConfirmMeeting(m.clientId, m.id, m.type, m.date, m.time); } finally { setBusy(false); }
  };
  const handleCancel = async (m: CalendarMeeting) => {
    setBusy(true);
    try { await onCancelMeeting(m.clientId, m.id, m.type); } finally { setBusy(false); }
  };
  const handleComplete = async (m: CalendarMeeting) => {
    setBusy(true);
    try {
      await onSaveMeeting({
        id: m.id, clientId: m.clientId, type: m.type, date: m.date, time: m.time,
        format: (m.format as MeetingFormInput['format']) || 'Video Call', status: 'completed', notes: m.notes ?? '',
      });
    } finally { setBusy(false); }
  };

  const rowActionProps = {
    busy,
    onOpen: onOpenMeeting,
    onEdit: openEditMeetingForm,
    onRequestDelete: setDeleteArmedId,
    onCancelDeleteRequest: () => setDeleteArmedId(null),
    onDelete: handleDelete,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
    onComplete: handleComplete,
  };

  return (
    <div className="ov-card flex flex-col overflow-hidden h-full">
      <div className="flex flex-col gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: '#F0F1F5' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-3.5 h-3.5" style={{ color: IND }} strokeWidth={2} />
            <div className="ov-title">Meetings Calendar</div>
          </div>
          <button onClick={openNewMeetingForm} className="ov-btn-primary !px-2.5 !py-1.5 !text-[10.5px]">
            <Plus className="w-3 h-3" strokeWidth={2.5} /> New
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setCursor(new Date()); setSelectedDate(new Date()); }} className="ov-btn-outline !px-2.5 !py-1 !text-[10.5px]">Today</button>
          <button onClick={() => setCursor(c => subMonths(c, 1))} className="cal-nav-btn" aria-label="Previous month"><ChevronLeft className="w-4 h-4" strokeWidth={2} /></button>
          <span className="text-[12px] font-bold text-gray-900 flex-1 text-center">{format(cursor, 'MMMM yyyy')}</span>
          <button onClick={() => setCursor(c => addMonths(c, 1))} className="cal-nav-btn" aria-label="Next month"><ChevronRight className="w-4 h-4" strokeWidth={2} /></button>
        </div>
      </div>

      <div className={compact ? "grid grid-cols-1 gap-0" : "grid grid-cols-1 xl:grid-cols-12 gap-0"}>
        {/* Month grid */}
        <div className={compact ? "p-4 border-b" : "xl:col-span-7 p-4 border-b xl:border-b-0 xl:border-r"} style={{ borderColor: '#F0F1F5' }}>
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="cal-weekday py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const dayMeetings = meetingsByDay[key] ?? [];
              const inMonth = isSameMonth(day, cursor);
              const today = isToday(day);
              const selected = isSameDay(day, selectedDate);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 ${!inMonth ? 'opacity-30' : ''} ${selected ? 'cal-selected' : today ? 'cal-today' : 'cal-day'}`}
                >
                  <span className="text-[11.5px] sm:text-[12.5px] font-bold leading-none">{format(day, 'd')}</span>
                  {dayMeetings.length > 0 && (
                    <span className="flex gap-0.5">
                      {dayMeetings.slice(0, 3).map((m, i) => (
                        <span key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: selected ? '#fff' : (STATUS_COLORS[m.status] ?? STATUS_COLORS.requested).fg }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day agenda + upcoming */}
        <div className={compact ? "flex flex-col" : "xl:col-span-5 flex flex-col"}>
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{format(selectedDate, 'EEEE, MMMM d')}</div>
              {selectedMeetings.length > 0 && (
                <span className="text-[9px] font-bold text-gray-400">{selectedMeetings.length} meeting{selectedMeetings.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {selectedMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CalendarCheck2 className="w-6 h-6 mb-2 text-gray-300" strokeWidth={1.4} />
                <div className="text-[11.5px] text-gray-400">No meetings this day.</div>
                <button onClick={openNewMeetingForm} className="mt-2 text-[10.5px] font-bold text-black hover:underline">+ Schedule one</button>
              </div>
            ) : (
              <div className="space-y-1">
                {selectedMeetings.map(m => (
                  <MeetingRow key={m.id} m={m} deletePending={deleteArmedId === m.id} {...rowActionProps} />
                ))}
              </div>
            )}
          </div>
          <div className="border-t p-4" style={{ borderColor: '#F0F1F5' }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2">Upcoming</div>
            {upcoming.length === 0 ? (
              <div className="text-[11.5px] text-gray-400 py-2">Nothing scheduled ahead.</div>
            ) : (
              <div className="space-y-1">
                {upcoming.map(m => (
                  <MeetingRow key={m.id} m={m} showDate deletePending={deleteArmedId === m.id} {...rowActionProps} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {formState && (
          <MeetingFormModal
            initial={formState}
            clientOptions={clientOptions}
            onSave={handleFormSave}
            onClose={() => setFormState(null)}
            saving={busy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
