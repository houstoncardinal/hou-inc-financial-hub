import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';

const CREAM  = '#FAF7F2';
const DARK   = '#1C1814';
const MUTED  = '#8A7A6A';
const GOLD   = '#9D7E3F';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const QUICK_PROMPTS = [
  "What's the typical cost per square foot?",
  'How long will my project take to complete?',
  'Can we schedule a consultation meeting?',
  'What materials do you typically recommend?',
  'How does the permitting process work?',
  'Can you walk me through the design process?',
];

export default function PortalMessages() {
  const { client, getMessages, sendMessage, commitBuilderReply } = usePortal();
  const navigate = useNavigate();

  useEffect(() => { if (!client) navigate('/portal', { replace: true }); }, [client, navigate]);

  const [msgs, setMsgs]         = useState(() => client ? getMessages() : []);
  const [input, setInput]       = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (typingTimer.current) clearTimeout(typingTimer.current); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, isTyping]);

  if (!client) return null;

  const dispatchReply = (text: string) => {
    setIsTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setMsgs(commitBuilderReply(text));
      setIsTyping(false);
    }, 1200 + Math.random() * 900);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMsgs(sendMessage(text));
    dispatchReply(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleQuick = (prompt: string) => {
    setMsgs(sendMessage(prompt));
    dispatchReply(prompt);
  };

  const clientInitials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <PortalLayout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 0px)', minHeight: '600px' }}>

        {/* Header */}
        <div
          className="px-6 md:px-10 py-5 shrink-0"
          style={{ backgroundColor: '#FFFFFF', borderBottom: `1px solid ${BORDER}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-black shrink-0"
                style={{ backgroundColor: 'rgba(157,126,63,0.12)', color: GOLD, border: `1px solid rgba(157,126,63,0.25)`, fontFamily: SERIF }}
              >
                {BUILDER.initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold" style={{ color: DARK }}>{BUILDER.name}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2ecc71' }} />
                </div>
                <div className="text-[10px] font-light" style={{ color: MUTED }}>{BUILDER.title} · {BUILDER.email}</div>
              </div>
            </div>
            <div className="text-[9px] uppercase tracking-[0.22em] font-semibold hidden sm:block" style={{ color: 'rgba(28,24,20,0.3)' }}>
              Direct line · HOU INC
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 space-y-5" style={{ backgroundColor: CREAM }}>
          {msgs.length === 0 && (
            <div className="text-center py-16">
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '1.5rem', color: 'rgba(28,24,20,0.25)', marginBottom: '0.5rem' }}>
                Start the conversation
              </div>
              <p className="text-[11px] font-light" style={{ color: 'rgba(28,24,20,0.35)' }}>Send a message or use a quick question below.</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {msgs.map(m => {
              const isBuilder = m.sender === 'builder';
              const avatar = isBuilder ? BUILDER.initials : clientInitials;
              const time = new Date(m.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
              const date = new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex items-end gap-3 ${isBuilder ? '' : 'flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mb-1"
                    style={{
                      backgroundColor: isBuilder ? 'rgba(157,126,63,0.12)' : 'rgba(28,24,20,0.06)',
                      color: isBuilder ? GOLD : 'rgba(28,24,20,0.5)',
                      border: `1px solid ${isBuilder ? 'rgba(157,126,63,0.25)' : BORDER}`,
                      fontFamily: SERIF,
                    }}
                  >
                    {avatar}
                  </div>

                  {/* Bubble */}
                  <div style={{ maxWidth: '68%' }}>
                    <div className={`flex items-baseline gap-2 mb-1 ${isBuilder ? '' : 'flex-row-reverse'}`}>
                      <span className="text-[10px] font-bold" style={{ color: DARK }}>{m.senderName}</span>
                      <span className="text-[9px]" style={{ color: 'rgba(28,24,20,0.3)' }}>{date} · {time}</span>
                    </div>
                    <div
                      className="px-4 py-3 text-[12px] leading-relaxed font-light"
                      style={{
                        backgroundColor: isBuilder ? '#FFFFFF' : DARK,
                        color: isBuilder ? DARK : CREAM,
                        border: `1px solid ${isBuilder ? BORDER : 'transparent'}`,
                        boxShadow: isBuilder ? '0 1px 8px rgba(28,24,20,0.05)' : 'none',
                        borderRadius: '1px',
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-end gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mb-1"
                  style={{ backgroundColor: 'rgba(157,126,63,0.12)', color: GOLD, border: `1px solid rgba(157,126,63,0.25)`, fontFamily: SERIF }}
                >
                  {BUILDER.initials}
                </div>
                <div
                  className="px-4 py-3"
                  style={{ backgroundColor: '#FFFFFF', border: `1px solid ${BORDER}`, boxShadow: '0 1px 8px rgba(28,24,20,0.05)', borderRadius: '1px' }}
                >
                  <div className="flex gap-1 items-center" style={{ height: '16px' }}>
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: GOLD }}
                        animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <AnimatePresence>
          {msgs.length <= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className="px-6 md:px-10 py-3 shrink-0 overflow-x-auto"
              style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${BORDER}` }}
            >
              <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-2" style={{ color: 'rgba(28,24,20,0.3)' }}>Quick questions</div>
              <div className="flex gap-2 pb-1">
                {QUICK_PROMPTS.map(q => (
                  <button
                    key={q}
                    onClick={() => handleQuick(q)}
                    disabled={isTyping}
                    className="shrink-0 text-[10px] font-semibold px-3 py-1.5 whitespace-nowrap transition-all hover:opacity-80 disabled:opacity-30"
                    style={{ border: `1px solid rgba(157,126,63,0.4)`, color: GOLD, backgroundColor: 'rgba(157,126,63,0.05)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div
          className="px-6 md:px-10 py-4 shrink-0"
          style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${BORDER}` }}
        >
          <div className="flex items-end gap-3">
            <textarea
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={isTyping}
              placeholder={isTyping ? `${BUILDER.name} is typing…` : 'Message your builder… (Enter to send)'}
              className="flex-1 resize-none text-[13px] font-light py-3 px-4 outline-none transition-colors disabled:opacity-60"
              style={{
                backgroundColor: CREAM, border: `1px solid ${BORDER}`,
                color: DARK, fontFamily: 'inherit', lineHeight: '1.5',
              }}
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = BORDER)}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-30 shrink-0"
              style={{ backgroundColor: GOLD }}
            >
              <Send className="w-4 h-4" style={{ color: DARK }} strokeWidth={2} />
            </button>
          </div>
          <p className="text-[9px] mt-2 font-light" style={{ color: 'rgba(28,24,20,0.25)' }}>
            Responses simulate the portal experience. Real builder replies within 1 business day.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
