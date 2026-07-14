import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Video, Phone, MapPin, Plus, X, CheckCircle,
  AlertCircle, XCircle, ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, PortalMeeting } from '@/hooks/usePortal';

const DARK   = '#1A1410';
const MUTED  = '#7A6E64';
const GOLD   = '#9D7E3F';
const GOLDF  = '#C4A76B';
const BORDER = '#E5E0D9';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const MEETING_TYPES = [
  'Initial Consultation',
  'Project Brief Review',
  'Design & Materials Walkthrough',
  'Site Visit',
  'Construction Progress Review',
  'Proposal Presentation',
  'Contract Signing',
  'General Check-in',
];

const MEETING_TIMES = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
];

function statusConfig(status: PortalMeeting['status']): { color: string; bg: string; label: string; icon: React.ReactNode } {
  switch (status) {
    case 'confirmed':  return { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Confirmed', icon: <CheckCircle className="w-3.5 h-3.5" style={{ color: '#10b981' }} strokeWidth={2} /> };
    case 'requested':  return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Pending Confirmation', icon: <AlertCircle className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} strokeWidth={2} /> };
    case 'completed':  return { color: MUTED,      bg: 'rgba(26,20,16,0.06)', label: 'Completed', icon: <CheckCircle className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={2} /> };
    case 'cancelled':  return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  label: 'Cancelled', icon: <XCircle className="w-3.5 h-3.5" style={{ color: '#ef4444' }} strokeWidth={2} /> };
    default: return { color: MUTED, bg: 'rgba(26,20,16,0.06)', label: status, icon: null };
  }
}

function FormatIcon({ format }: { format: PortalMeeting['format'] }) {
  switch (format) {
    case 'Video Call': return <Video className="w-3.5 h-3.5" style={{ color: GOLD }} strokeWidth={1.5} />;
    case 'Phone Call': return <Phone className="w-3.5 h-3.5" style={{ color: GOLD }} strokeWidth={1.5} />;
    default:           return <MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} strokeWidth={1.5} />;
  }
}

export default function PortalMeetings() {
  const { client, loaded, getMeetings, requestMeeting, cancelMeeting } = usePortal();
  const navigate = useNavigate();

  // All hooks before any early return
  const [meetings, setMeetings]     = useState<PortalMeeting[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [type,      setType]      = useState(MEETING_TYPES[0]);
  const [date,      setDate]      = useState('');
  const [time,      setTime]      = useState(MEETING_TIMES[2]);
  const [format,    setFormat]    = useState<PortalMeeting['format']>('Video Call');
  const [notes,     setNotes]     = useState('');
  const [submitErr, setSubmitErr] = useState('');

  useEffect(() => { if (!loaded) return; if (!client) navigate('/portal', { replace: true }); }, [client, loaded, navigate]);

  // Sync meetings from hook after Supabase load
  useEffect(() => {
    const current = getMeetings();
    if (current.length > 0) setMeetings(current);
  }, [getMeetings]);

  if (!loaded || !client) return null;

  const refresh = () => setMeetings(getMeetings());

  const upcomingMeetings = meetings.filter(m => m.status === 'confirmed' || m.status === 'requested');
  const pastMeetings     = meetings.filter(m => m.status === 'completed' || m.status === 'cancelled');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setSubmitting(true);
    setSubmitErr('');
    try {
      await requestMeeting({ type, date, time, format, notes });
      refresh();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setShowModal(false);
        setDate('');
        setNotes('');
      }, 1800);
    } catch (err: any) {
      setSubmitErr(err?.message ?? 'Failed to schedule meeting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (id: string) => {
    cancelMeeting(id);
    refresh();
  };

  const openModal = () => {
    setSuccess(false);
    setShowModal(true);
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const MeetingCard = ({ m }: { m: PortalMeeting }) => {
    const sc = statusConfig(m.status);
    return (
      <motion.div className="p-6" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Date box */}
            <div className="shrink-0 text-center px-3 py-2 min-w-[60px]" style={{ backgroundColor: 'rgba(157,126,63,0.08)', border: `1px solid rgba(157,126,63,0.2)` }}>
              <div className="text-[8px] uppercase tracking-[0.3em] font-bold" style={{ color: GOLD }}>
                {m.date ? new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' }) : '–'}
              </div>
              <div style={{ fontFamily: SERIF, fontSize: '22px', fontWeight: 300, color: DARK, lineHeight: 1.1 }}>
                {m.date ? new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric' }) : '–'}
              </div>
              <div className="text-[8px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
                {m.date ? new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric' }) : ''}
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-bold mb-1.5" style={{ color: DARK }}>{m.type}</div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: MUTED }}>
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  {m.time}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: MUTED }}>
                  <FormatIcon format={m.format} />
                  {m.format}
                </div>
              </div>
              {m.notes && (
                <p className="text-[11px] font-light" style={{ color: MUTED }}>{m.notes}</p>
              )}
              {m.status === 'requested' && (
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-light" style={{ color: MUTED }}>
                  <AlertCircle className="w-3 h-3" style={{ color: '#f59e0b' }} strokeWidth={2} />
                  Awaiting confirmation from HOU INC. A calendar invite will be sent to {client.email}.
                </div>
              )}
            </div>
          </div>

          {/* Status + actions */}
          <div className="shrink-0 flex flex-col items-end gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{ backgroundColor: sc.bg }}>
              {sc.icon}
              <span className="text-[9px] uppercase tracking-[0.18em] font-bold" style={{ color: sc.color }}>{sc.label}</span>
            </div>
            {(m.status === 'requested' || m.status === 'confirmed') && (
              <button onClick={() => handleCancel(m.id)}
                className="text-[9px] uppercase tracking-[0.18em] font-semibold transition-colors"
                style={{ color: 'rgba(26,20,16,0.3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(26,20,16,0.3)'; }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <PortalLayout>
      <div className="px-6 md:px-10 py-8 md:py-12 max-w-4xl">

        {/* Header */}
        <motion.div className="flex items-end justify-between mb-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <div className="text-[8px] uppercase tracking-[0.44em] font-bold mb-2" style={{ color: GOLD }}>Meetings</div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: 'clamp(24px, 3.5vw, 38px)', color: DARK, lineHeight: 1.08 }}>
              Consultations & Site Visits
            </div>
            <p className="text-[12px] font-light mt-2 max-w-sm" style={{ color: MUTED }}>
              Schedule a consultation with {client ? 'your HOU INC team' : 'our team'}. We'll confirm and send a calendar invite within one business day.
            </p>
          </div>
          <button onClick={openModal}
            className="hidden md:flex items-center gap-2 text-[9px] uppercase tracking-[0.26em] font-black px-5 py-3 transition-opacity hover:opacity-85"
            style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            Schedule Meeting
          </button>
        </motion.div>

        {/* Upcoming */}
        <motion.div className="mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="text-[9px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: GOLD }}>
            Upcoming Meetings {upcomingMeetings.length > 0 && `(${upcomingMeetings.length})`}
          </div>
          {upcomingMeetings.length === 0 ? (
            <div className="text-center py-16" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}>
              <Calendar className="w-8 h-8 mx-auto mb-3" style={{ color: BORDER }} strokeWidth={1} />
              <div className="text-[14px] font-light mb-1" style={{ color: DARK }}>No upcoming meetings</div>
              <div className="text-[11px] font-light mb-5" style={{ color: MUTED }}>Schedule a consultation to get started.</div>
              <button onClick={openModal}
                className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.24em] font-black px-5 py-2.5"
                style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                <Plus className="w-3 h-3" strokeWidth={2.5} />
                Schedule First Meeting
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.map(m => <MeetingCard key={m.id} m={m} />)}
            </div>
          )}
        </motion.div>

        {/* Past meetings */}
        {pastMeetings.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <div className="text-[9px] uppercase tracking-[0.38em] font-bold mb-4" style={{ color: 'rgba(26,20,16,0.3)' }}>
              Past Meetings
            </div>
            <div className="space-y-3 opacity-60">
              {pastMeetings.map(m => <MeetingCard key={m.id} m={m} />)}
            </div>
          </motion.div>
        )}

        {/* Mobile CTA */}
        <div className="md:hidden mt-6">
          <button onClick={openModal}
            className="w-full flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.26em] font-black py-4 transition-opacity hover:opacity-85"
            style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Schedule a Meeting
          </button>
        </div>
      </div>

      {/* ── Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
              onClick={() => !submitting && setShowModal(false)} />

            <motion.div className="relative z-10 w-full max-w-lg"
              style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}` }}
              initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>

              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div key="success" className="p-12 text-center"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(157,126,63,0.12)', border: `1px solid rgba(157,126,63,0.3)` }}
                      initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 22 }}>
                      <CheckCircle className="w-7 h-7" style={{ color: GOLD }} strokeWidth={1.5} />
                    </motion.div>
                    <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '28px', color: DARK, lineHeight: 1.1 }}>
                      Meeting Requested
                    </div>
                    <p className="text-[12px] mt-3 font-light" style={{ color: MUTED }}>
                      We'll confirm within one business day and send a calendar invite to {client.email}.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="form">
                    {/* Header */}
                    <div className="px-7 pt-7 pb-5 flex items-start justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <div>
                        <div className="text-[8px] uppercase tracking-[0.38em] font-bold mb-1" style={{ color: GOLD }}>Schedule</div>
                        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 300, fontSize: '26px', color: DARK, lineHeight: 1.1 }}>
                          Request a Meeting
                        </div>
                      </div>
                      {!submitting && (
                        <button onClick={() => setShowModal(false)} style={{ color: MUTED, marginTop: 4 }}>
                          <X className="w-4 h-4" strokeWidth={2} />
                        </button>
                      )}
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-7 space-y-5">
                      {/* Meeting type */}
                      <div>
                        <label className="block text-[9px] uppercase tracking-[0.32em] font-bold mb-2" style={{ color: MUTED }}>Meeting Type</label>
                        <select value={type} onChange={e => setType(e.target.value)} required
                          className="w-full text-[13px] font-light outline-none"
                          style={{ padding: '12px 14px', border: `1px solid ${BORDER}`, backgroundColor: '#FAFAF9', color: DARK, borderRadius: 0, fontFamily: SERIF }}>
                          {MEETING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      {/* Date + Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] uppercase tracking-[0.32em] font-bold mb-2" style={{ color: MUTED }}>Preferred Date</label>
                          <input type="date" value={date} min={minDateStr} onChange={e => setDate(e.target.value)} required
                            className="w-full text-[13px] font-light outline-none"
                            style={{ padding: '12px 14px', border: `1px solid ${BORDER}`, backgroundColor: '#FAFAF9', color: DARK, borderRadius: 0 }} />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-[0.32em] font-bold mb-2" style={{ color: MUTED }}>Preferred Time</label>
                          <select value={time} onChange={e => setTime(e.target.value)} required
                            className="w-full text-[13px] font-light outline-none"
                            style={{ padding: '12px 14px', border: `1px solid ${BORDER}`, backgroundColor: '#FAFAF9', color: DARK, borderRadius: 0 }}>
                            {MEETING_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Format */}
                      <div>
                        <label className="block text-[9px] uppercase tracking-[0.32em] font-bold mb-2" style={{ color: MUTED }}>Meeting Format</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Video Call', 'Phone Call', 'In-Person'] as PortalMeeting['format'][]).map(f => (
                            <button key={f} type="button" onClick={() => setFormat(f)}
                              className="flex flex-col items-center gap-1.5 py-3 text-[9px] uppercase tracking-[0.18em] font-bold transition-all"
                              style={{
                                border: `1px solid ${format === f ? GOLD : BORDER}`,
                                backgroundColor: format === f ? 'rgba(157,126,63,0.08)' : 'transparent',
                                color: format === f ? GOLD : MUTED,
                              }}>
                              {f === 'Video Call' ? <Video className="w-3.5 h-3.5" strokeWidth={1.5} />
                               : f === 'Phone Call' ? <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
                               : <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />}
                              {f}
                            </button>
                          ))}
                        </div>
                        {format === 'In-Person' && (
                          <div className="mt-2 text-[10px] font-light" style={{ color: MUTED }}>
                            206 Brooks St, Sugar Land, TX 77478
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-[9px] uppercase tracking-[0.32em] font-bold mb-2" style={{ color: MUTED }}>Notes (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                          placeholder="Topics you'd like to discuss, questions, or context…"
                          className="w-full text-[12px] font-light outline-none resize-none"
                          style={{ padding: '12px 14px', border: `1px solid ${BORDER}`, backgroundColor: '#FAFAF9', color: DARK, lineHeight: 1.6, fontFamily: 'inherit', borderRadius: 0 }} />
                      </div>

                      {submitErr && (
                        <div className="text-[10px] font-medium px-3 py-2 mb-2" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                          {submitErr}
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={!date || submitting}
                          className="flex-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.24em] font-black py-3.5 disabled:opacity-40 transition-opacity hover:opacity-85"
                          style={{ backgroundColor: GOLD, color: '#FAF7F2' }}>
                          {submitting
                            ? 'Sending…'
                            : <><Calendar className="w-3.5 h-3.5" strokeWidth={2} />Request Meeting</>}
                        </button>
                        {!submitting && (
                          <button type="button" onClick={() => setShowModal(false)}
                            className="px-5 text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
                            style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PortalLayout>
  );
}
