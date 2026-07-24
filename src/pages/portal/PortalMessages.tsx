import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER, PortalMessage } from '@/hooks/usePortal';
import { supabase } from '@/integrations/supabase/client';

const CREAM  = '#F8FAFC';
const DARK   = '#111827';
const MUTED  = '#6B7280';
const ACCENT   = '#000000';
const ACCENT_SOFT  = '#404040';
const BORDER = '#E5E7EB';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const QUICK_PROMPTS = [
  "What's the cost per sq ft?",
  'How long will my project take?',
  'Can we schedule a consultation?',
  'What materials do you recommend?',
  'How does permitting work?',
];

export default function PortalMessages() {
  const { client, loaded, getMessages, sendMessage } = usePortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    if (!client) navigate('/portal', { replace: true });
    else if (client.status === 'pending_approval' || client.status === 'rejected') navigate('/portal', { replace: true });
  }, [client, loaded, navigate]);

  const [msgs, setMsgs]   = useState<PortalMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync from hook whenever hook messages update (after initial Supabase load or sends)
  useEffect(() => {
    const current = getMessages();
    if (current.length === 0) return;
    setMsgs(prev => {
      const hookIds = new Set(current.map(m => m.id));
      const localOnly = prev.filter(m => !hookIds.has(m.id));
      return [...current, ...localOnly].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  }, [getMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Real-time subscription for builder messages sent from Admin dashboard
  useEffect(() => {
    if (!client) return;
    const channel = supabase
      .channel(`portal-msgs-${client.id}`)
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public', table: 'portal_messages',
        filter: `client_id=eq.${client.id}`,
      }, (payload: any) => {
        const row = payload.new;
        const incoming: PortalMessage = {
          id: row.id, sender: row.sender, senderName: row.sender_name,
          text: row.body, timestamp: row.created_at,
        };
        setMsgs(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [client?.id]);

  if (!client || (client.status && client.status !== 'approved')) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const updated = await sendMessage(text);
    setMsgs(updated);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleQuick = async (prompt: string) => {
    const updated = await sendMessage(prompt);
    setMsgs(updated);
  };

  const clientInitials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <PortalLayout>
      {/* Full-height chat container — on mobile, PortalLayout's <main> adds a
          56px top bar + 80px bottom nav (136px total) via padding, which this
          height calc must subtract or the container overflows main's content
          box, making the whole page scroll instead of just the messages list
          (and hiding the chat header behind the fixed top bar on load). */}
      <div
        className="flex flex-col h-[calc(100dvh-136px)] md:h-[100dvh]"
        style={{ minHeight: 420 }}
      >
        {/* ── Chat header ── */}
        <div className="shrink-0 px-4 sm:px-6 md:px-8 py-3 sm:py-4"
          style={{ backgroundColor: '#FFFFFF', borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0"
                style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: ACCENT, border: `1px solid rgba(0,0,0,0.22)`, fontFamily: SERIF }}>
                {BUILDER.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold" style={{ color: DARK }}>{BUILDER.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#2ecc71' }} />
                </div>
                <div className="text-[9px] sm:text-[10px] font-light" style={{ color: MUTED }}>
                  {BUILDER.title}
                  <span className="hidden sm:inline"> · {BUILDER.email}</span>
                </div>
              </div>
            </div>
            <div className="text-[8px] uppercase tracking-[0.22em] font-semibold hidden sm:block"
              style={{ color: 'rgba(17,24,39,0.28)' }}>
              Direct line · HOU INC
            </div>
          </div>
        </div>

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto py-5 px-4 sm:px-6 md:px-8 space-y-4"
          style={{ backgroundColor: CREAM }}>

          {msgs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.08)', border: `1px solid rgba(0,0,0,0.2)` }}>
                <MessageSquare className="w-5 h-5" style={{ color: ACCENT_SOFT }} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.4rem', color: 'rgba(17,24,39,0.3)', marginBottom: 6 }}>
                  Start the conversation
                </div>
                <p className="text-[11px] font-light" style={{ color: 'rgba(17,24,39,0.32)' }}>
                  Send a message or pick a quick question below.
                </p>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {msgs.map(m => {
              const isBuilder = m.sender === 'builder';
              const avatar    = isBuilder ? BUILDER.initials : clientInitials;
              const time      = new Date(m.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const date      = new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex items-end gap-2 sm:gap-3 ${isBuilder ? '' : 'flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[9px] sm:text-[10px] font-black shrink-0 mb-1"
                    style={{
                      backgroundColor: isBuilder ? 'rgba(0,0,0,0.12)' : 'rgba(17,24,39,0.07)',
                      color: isBuilder ? ACCENT : 'rgba(17,24,39,0.45)',
                      border: `1px solid ${isBuilder ? 'rgba(0,0,0,0.25)' : BORDER}`,
                      fontFamily: SERIF,
                    }}>
                    {avatar}
                  </div>

                  {/* Bubble + meta */}
                  <div style={{ maxWidth: 'min(82%, 480px)' }}>
                    <div className={`flex items-baseline gap-1.5 mb-1 ${isBuilder ? '' : 'flex-row-reverse'}`}>
                      <span className="text-[10px] font-bold truncate" style={{ color: DARK, maxWidth: 120 }}>
                        {m.senderName}
                      </span>
                      {isBuilder && (
                        <span className="text-[7px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 shrink-0"
                          style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: ACCENT }}>
                          HOU INC
                        </span>
                      )}
                      <span className="text-[8px] shrink-0" style={{ color: 'rgba(17,24,39,0.3)' }}>
                        {date} · {time}
                      </span>
                    </div>
                    <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-[12px] sm:text-[13px] leading-relaxed font-light"
                      style={{
                        backgroundColor: isBuilder ? '#FFFFFF' : DARK,
                        color: isBuilder ? DARK : CREAM,
                        border: `1px solid ${isBuilder ? BORDER : 'transparent'}`,
                        boxShadow: isBuilder ? '0 1px 6px rgba(17,24,39,0.05)' : 'none',
                      }}>
                      {m.text}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>


          <div ref={bottomRef} />
        </div>

        {/* ── Quick prompts (shown until conversation begins) ── */}
        <AnimatePresence>
          {msgs.length <= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 px-4 sm:px-6 md:px-8 py-3"
              style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${BORDER}` }}>
              <div className="text-[7px] uppercase tracking-[0.3em] font-bold mb-2"
                style={{ color: 'rgba(17,24,39,0.28)' }}>Quick questions</div>
              {/* Horizontal scroll on mobile, wrap on desktop */}
              <div className="flex gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible"
                style={{ scrollbarWidth: 'none' }}>
                {QUICK_PROMPTS.map(q => (
                  <button key={q} onClick={() => handleQuick(q)}
                    className="shrink-0 rounded-full text-[10px] font-semibold px-3 py-1.5 whitespace-nowrap transition-opacity hover:opacity-75 active:opacity-60"
                    style={{ border: `1px solid rgba(0,0,0,0.38)`, color: ACCENT, backgroundColor: 'rgba(0,0,0,0.04)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input bar ── */}
        <div className="shrink-0 px-4 sm:px-6 md:px-8 py-3 sm:py-4"
          style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${BORDER}` }}>
          <div className="flex items-end gap-2 sm:gap-3">
            <textarea
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message your builder… (Enter to send)"
              className="flex-1 resize-none rounded-xl text-[13px] font-light py-2.5 px-3 sm:px-4 outline-none transition-colors"
              style={{
                backgroundColor: CREAM, border: `1px solid ${BORDER}`,
                color: DARK, fontFamily: 'inherit', lineHeight: 1.5,
              }}
              onFocus={e => (e.target.style.borderColor = ACCENT)}
              onBlur={e => (e.target.style.borderColor = BORDER)}
            />
            <button onClick={handleSend} disabled={!input.trim()}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-opacity hover:opacity-85 active:scale-95 disabled:opacity-25"
              style={{ backgroundColor: ACCENT }}>
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: '#FFFFFF' }} strokeWidth={2} />
            </button>
          </div>
          <p className="text-[8px] mt-1.5 font-light" style={{ color: 'rgba(17,24,39,0.22)' }}>
            Builder replies within 1 business day.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
