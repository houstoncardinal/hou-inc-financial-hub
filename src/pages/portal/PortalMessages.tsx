import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, ArrowUpRight } from 'lucide-react';
import PortalLayout from '@/components/PortalLayout';
import { usePortal, BUILDER } from '@/hooks/usePortal';

const CREAM  = '#FAF7F2';
const DARK   = '#1C1814';
const MUTED  = '#8A7A6A';
const GOLD   = '#9D7E3F';
const BORDER = '#DDD4C4';
const SERIF  = "'Cormorant Garamond', Georgia, serif";

const QUICK_PROMPTS = [
  'What does the construction process look like?',
  'How long will my project take?',
  'Can we schedule a site visit?',
  "What's the typical cost per square foot?",
];

export default function PortalMessages() {
  const { client, getMessages, sendMessage } = usePortal();
  const navigate = useNavigate();

  useEffect(() => { if (!client) navigate('/portal', { replace: true }); }, [client, navigate]);

  const [msgs, setMsgs] = useState(() => client ? getMessages() : []);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  if (!client) return null;

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const updated = sendMessage(text);
    setMsgs(updated);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleQuick = (prompt: string) => {
    const updated = sendMessage(prompt);
    setMsgs(updated);
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
              {/* Builder avatar */}
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
            <div className="text-[9px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'rgba(28,24,20,0.3)' }}>
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
              <p className="text-[11px] font-light" style={{ color: 'rgba(28,24,20,0.35)' }}>Send a message to your builder to get started.</p>
            </div>
          )}

          {msgs.map(m => {
            const isBuilder = m.sender === 'builder';
            const avatar = isBuilder ? BUILDER.initials : clientInitials;
            const time = new Date(m.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            const date = new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return (
              <div key={m.id} className={`flex items-end gap-3 ${isBuilder ? '' : 'flex-row-reverse'}`}>
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
                  <div
                    className={`flex items-baseline gap-2 mb-1 ${isBuilder ? '' : 'flex-row-reverse'}`}
                  >
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
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {msgs.length <= 2 && (
          <div
            className="px-6 md:px-10 py-3 shrink-0 overflow-x-auto"
            style={{ backgroundColor: '#FFFFFF', borderTop: `1px solid ${BORDER}` }}
          >
            <div className="text-[8px] uppercase tracking-[0.28em] font-bold mb-2" style={{ color: 'rgba(28,24,20,0.3)' }}>Quick questions</div>
            <div className="flex gap-2 pb-1">
              {QUICK_PROMPTS.map(q => (
                <button
                  key={q}
                  onClick={() => handleQuick(q)}
                  className="shrink-0 text-[10px] font-semibold px-3 py-1.5 whitespace-nowrap transition-all hover:opacity-80"
                  style={{ border: `1px solid rgba(157,126,63,0.4)`, color: GOLD, backgroundColor: 'rgba(157,126,63,0.05)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

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
              placeholder="Message your builder… (Enter to send)"
              className="flex-1 resize-none text-[13px] font-light py-3 px-4 outline-none transition-colors"
              style={{
                backgroundColor: CREAM, border: `1px solid ${BORDER}`,
                color: DARK, fontFamily: 'inherit', lineHeight: '1.5',
              }}
              onFocus={e => (e.target.style.borderColor = GOLD)}
              onBlur={e => (e.target.style.borderColor = BORDER)}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-11 h-11 flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-30 shrink-0"
              style={{ backgroundColor: GOLD }}
            >
              <Send className="w-4 h-4" style={{ color: DARK }} strokeWidth={2} />
            </button>
          </div>
          <p className="text-[9px] mt-2 font-light" style={{ color: 'rgba(28,24,20,0.25)' }}>
            Responses are generated to simulate the portal experience. Real builder responses within 1 business day.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
