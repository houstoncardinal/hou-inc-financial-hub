import { useState, useCallback } from 'react';

export interface PortalClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface ProjectBrief {
  type: string;
  location: string;
  sqft: string;
  bedrooms: string;
  bathrooms: string;
  floors: string;
  style: string[];
  budget: string;
  timeline: string;
  description: string;
  status: 'draft' | 'submitted' | 'reviewing' | 'consultation_scheduled' | 'in_progress';
  submittedAt?: string;
}

export interface PortalMessage {
  id: string;
  sender: 'client' | 'builder';
  senderName: string;
  text: string;
  timestamp: string;
}

export const BUILDER = {
  name: 'Marcus Chen',
  title: 'Senior Project Consultant',
  initials: 'MC',
  phone: '(713) 555-0191',
  email: 'mchen@houinc.com',
  bio: '18 years building luxury residential and commercial projects across greater Houston. River Oaks, Memorial, The Heights — I know this city and its standards.',
};

const CLIENTS_KEY  = 'hou-portal-clients';
const SESSION_KEY  = 'hou-portal-session';
const BRIEFS_KEY   = 'hou-portal-briefs';
const MSGS_KEY     = 'hou-portal-messages';

function readClients(): PortalClient[] {
  try { return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]'); }
  catch { return []; }
}
function readBriefs(): Record<string, ProjectBrief> {
  try { return JSON.parse(localStorage.getItem(BRIEFS_KEY) || '{}'); }
  catch { return {}; }
}
function readAllMsgs(): Record<string, PortalMessage[]> {
  try { return JSON.parse(localStorage.getItem(MSGS_KEY) || '{}'); }
  catch { return {}; }
}

function autoReply(text: string, clientName: string): string {
  const t = text.toLowerCase();
  if (t.includes('budget') || t.includes('cost') || t.includes('price') || t.includes('expensive'))
    return `Great question, ${clientName}. Our luxury residential projects start around $350/sq ft for premium finishes and rise depending on scope, site conditions, and material selections. I would love to give you a tighter range once we review your brief together. When are you available for a quick call?`;
  if (t.includes('timeline') || t.includes('how long') || t.includes('months') || t.includes('when'))
    return `Timeline varies by scope — a custom estate in the 8,000–12,000 sq ft range typically runs 18–24 months from groundbreaking once permits are secured. Permitting in Houston can take 8–12 weeks. I will map out a preliminary schedule for you once we finalize the brief.`;
  if (t.includes('meet') || t.includes('call') || t.includes('consultation') || t.includes('appointment') || t.includes('zoom'))
    return `Absolutely — let us set that up. I have availability Tuesday through Thursday, mornings preferred. We can meet here at our Post Oak office, or I am happy to do a video call. Just let me know what works best for you and I will send a calendar invite.`;
  if (t.includes('design') || t.includes('architect') || t.includes('plan') || t.includes('blueprint'))
    return `Our design-build process brings the architectural and construction team together from day one — no handoffs, no miscommunication. We partner with several top Houston architecture firms including Stern + Bucek and Barnes Gromatzky Kosarek. I will put together a curated shortlist based on your style preferences after we review your brief.`;
  if (t.includes('permit') || t.includes('zoning') || t.includes('approval') || t.includes('city'))
    return `Permitting in Houston is something we have deep experience navigating. Our in-house permitting team manages all city submissions and follows up directly with HSPD and the permit center. For most luxury residential projects, we build 10–14 weeks into the schedule for this process.`;
  if (t.includes('material') || t.includes('stone') || t.includes('marble') || t.includes('wood') || t.includes('finishes'))
    return `Material selection is one of my favorite parts of the process. We have relationships with premier suppliers across stone, hardwood, tile, and millwork. We typically organize a materials walkthrough at our showroom partners — Visual Comfort, Walker Zanger, and others — early in the design phase. It is a great way to see and feel your home before it is built.`;
  return `Thank you for reaching out, ${clientName}. I have noted your message and will follow up with a detailed response shortly. In the meantime, if you have not yet completed your project brief, that will help me prepare the most relevant information for our first conversation.`;
}

export function usePortal() {
  const [client, setClient] = useState<PortalClient | null>(() => {
    try {
      const id = localStorage.getItem(SESSION_KEY);
      if (!id) return null;
      return readClients().find(c => c.id === id) ?? null;
    } catch { return null; }
  });

  const register = useCallback((name: string, email: string, phone: string): { ok: boolean; error?: string } => {
    const clients = readClients();
    if (clients.find(c => c.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, error: 'An account with this email already exists. Please sign in instead.' };
    const nc: PortalClient = { id: crypto.randomUUID(), name, email, phone, createdAt: new Date().toISOString() };
    localStorage.setItem(CLIENTS_KEY, JSON.stringify([...clients, nc]));
    localStorage.setItem(SESSION_KEY, nc.id);
    // Seed welcome message
    const msgs = readAllMsgs();
    msgs[nc.id] = [{
      id: crypto.randomUUID(),
      sender: 'builder',
      senderName: BUILDER.name,
      text: `Welcome to the HOU INC Client Portal, ${name}. I'm ${BUILDER.name}, your dedicated project consultant. I'm looking forward to learning about your vision and helping you bring it to life. Please take a few minutes to complete your Project Brief — it gives me the context I need to prepare for our first consultation. Message me anytime.`,
      timestamp: new Date().toISOString(),
    }];
    localStorage.setItem(MSGS_KEY, JSON.stringify(msgs));
    setClient(nc);
    return { ok: true };
  }, []);

  const login = useCallback((email: string): { ok: boolean; error?: string } => {
    const found = readClients().find(c => c.email.toLowerCase() === email.toLowerCase());
    if (!found) return { ok: false, error: 'No account found with that email address.' };
    localStorage.setItem(SESSION_KEY, found.id);
    setClient(found);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setClient(null);
  }, []);

  const getBrief = useCallback((): ProjectBrief | null => {
    if (!client) return null;
    return readBriefs()[client.id] ?? null;
  }, [client]);

  const saveBrief = useCallback((partial: Partial<ProjectBrief>) => {
    if (!client) return;
    const all = readBriefs();
    all[client.id] = { ...(all[client.id] ?? {}), ...partial } as ProjectBrief;
    localStorage.setItem(BRIEFS_KEY, JSON.stringify(all));
  }, [client]);

  const submitBrief = useCallback((brief: ProjectBrief) => {
    if (!client) return;
    const all = readBriefs();
    all[client.id] = { ...brief, status: 'submitted', submittedAt: new Date().toISOString() };
    localStorage.setItem(BRIEFS_KEY, JSON.stringify(all));
    // Auto-reply
    const msgs = readAllMsgs();
    const thread = msgs[client.id] ?? [];
    thread.push({
      id: crypto.randomUUID(),
      sender: 'builder',
      senderName: BUILDER.name,
      text: `Excellent, ${client.name} — I've received your project brief. A ${brief.type} in ${brief.location || 'the Houston area'}, approximately ${brief.sqft} sq ft, ${brief.budget} budget. This is a strong foundation. I'm preparing a preliminary project outline and will reach out within one business day to schedule our first consultation. Very much looking forward to working together.`,
      timestamp: new Date().toISOString(),
    });
    msgs[client.id] = thread;
    localStorage.setItem(MSGS_KEY, JSON.stringify(msgs));
  }, [client]);

  const getMessages = useCallback((): PortalMessage[] => {
    if (!client) return [];
    return readAllMsgs()[client.id] ?? [];
  }, [client]);

  const sendMessage = useCallback((text: string): PortalMessage[] => {
    if (!client) return [];
    const msgs = readAllMsgs();
    const thread = msgs[client.id] ?? [];
    const clientMsg: PortalMessage = {
      id: crypto.randomUUID(), sender: 'client', senderName: client.name,
      text, timestamp: new Date().toISOString(),
    };
    const builderMsg: PortalMessage = {
      id: crypto.randomUUID(), sender: 'builder', senderName: BUILDER.name,
      text: autoReply(text, client.name),
      timestamp: new Date(Date.now() + 800).toISOString(),
    };
    const updated = [...thread, clientMsg, builderMsg];
    msgs[client.id] = updated;
    localStorage.setItem(MSGS_KEY, JSON.stringify(msgs));
    return updated;
  }, [client]);

  return { client, register, login, logout, getBrief, saveBrief, submitBrief, getMessages, sendMessage, builder: BUILDER };
}
