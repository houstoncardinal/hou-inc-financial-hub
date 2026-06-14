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

export interface PortalDocument {
  id: string;
  name: string;
  fileType: string;
  size: string;
  category: 'required' | 'uploaded' | 'contract' | 'report';
  status: 'pending' | 'uploaded' | 'approved' | 'rejected';
  requestedBy?: string;
  description?: string;
  uploadedAt?: string;
}

export interface PortalMeeting {
  id: string;
  type: string;
  date: string;
  time: string;
  format: 'In-Person' | 'Video Call' | 'Phone Call';
  notes: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

export const BUILDER = {
  name: 'Jeff Ali',
  title: 'Co-Founder & Principal Builder',
  initials: 'JA',
  phone: '(281) 915-9595',
  email: 'jeff@houinc.com',
  bio: '25+ years building luxury residential and commercial projects across greater Houston. Co-founded HOU INC to set a new standard for construction excellence in this city.',
};

export const COMPANY = {
  founders: ['Jeff Ali', 'David Alvares'],
  founded: 1998,
  phone: '(281) 915-9595',
  email: 'Info@Houinc.com',
  address: '2100 W Loop South, Suite #1115, Houston, TX 77027',
};

const CLIENTS_KEY  = 'hou-portal-clients';
const SESSION_KEY  = 'hou-portal-session';
const BRIEFS_KEY   = 'hou-portal-briefs';
const MSGS_KEY     = 'hou-portal-messages';
const DOCS_KEY     = 'hou-portal-docs';
const MEETINGS_KEY = 'hou-portal-meetings';

function readClients(): PortalClient[] {
  try { return JSON.parse(localStorage.getItem(CLIENTS_KEY) || '[]'); } catch { return []; }
}
function readBriefs(): Record<string, ProjectBrief> {
  try { return JSON.parse(localStorage.getItem(BRIEFS_KEY) || '{}'); } catch { return {}; }
}
function readAllMsgs(): Record<string, PortalMessage[]> {
  try { return JSON.parse(localStorage.getItem(MSGS_KEY) || '{}'); } catch { return {}; }
}
function readAllDocs(): Record<string, PortalDocument[]> {
  try { return JSON.parse(localStorage.getItem(DOCS_KEY) || '{}'); } catch { return {}; }
}
function readAllMeetings(): Record<string, PortalMeeting[]> {
  try { return JSON.parse(localStorage.getItem(MEETINGS_KEY) || '{}'); } catch { return {}; }
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
    return `Material selection is one of my favorite parts of the process. We have relationships with premier suppliers across stone, hardwood, tile, and millwork. We typically organize a materials walkthrough at our showroom partners — Visual Comfort, Walker Zanger, and others — early in the design phase.`;
  return `Thank you for reaching out, ${clientName}. I have noted your message and will follow up with a detailed response shortly. In the meantime, if you have not yet completed your project brief, that will help me prepare the most relevant information for our first conversation.`;
}

const SEED_DOCS: Omit<PortalDocument, 'id'>[] = [
  {
    name: 'Signed Project Intake Form',
    fileType: 'PDF',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: 'Please complete, sign, and upload the project intake form to begin the consultation process.',
  },
  {
    name: 'Proof of Property Ownership',
    fileType: 'PDF / Image',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: 'Upload a copy of your property deed, title, or purchase agreement.',
  },
  {
    name: 'Design Inspiration & References',
    fileType: 'PDF / Images',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: 'Share photos, mood boards, or architectural images that inspire your vision.',
  },
];

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
      text: `Welcome to the HOU INC Client Portal, ${name}. I'm ${BUILDER.name}, Co-Founder and your dedicated project lead. I'm looking forward to learning about your vision and helping bring it to life. Please complete your Project Brief when you're ready — it gives me the context I need to prepare for our first consultation. You can also upload any required documents from the Documents tab. Feel free to message me anytime.`,
      timestamp: new Date().toISOString(),
    }];
    localStorage.setItem(MSGS_KEY, JSON.stringify(msgs));

    // Seed required documents
    const allDocs = readAllDocs();
    allDocs[nc.id] = SEED_DOCS.map(d => ({ ...d, id: crypto.randomUUID() }));
    localStorage.setItem(DOCS_KEY, JSON.stringify(allDocs));

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
    const msgs = readAllMsgs();
    const thread = msgs[client.id] ?? [];
    thread.push({
      id: crypto.randomUUID(),
      sender: 'builder',
      senderName: BUILDER.name,
      text: `Excellent, ${client.name} — I've received your project brief. A ${brief.type} in ${brief.location || 'the Houston area'}, approximately ${brief.sqft} sq ft, ${brief.budget} budget. This is a strong foundation. I'm preparing a preliminary project outline and will reach out within one business day to schedule our first consultation. Very much looking forward to working together. — ${BUILDER.name}`,
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
    const updated = [...thread, clientMsg];
    msgs[client.id] = updated;
    localStorage.setItem(MSGS_KEY, JSON.stringify(msgs));
    return updated;
  }, [client]);

  const commitBuilderReply = useCallback((clientText: string): PortalMessage[] => {
    if (!client) return [];
    const msgs = readAllMsgs();
    const thread = msgs[client.id] ?? [];
    const builderMsg: PortalMessage = {
      id: crypto.randomUUID(), sender: 'builder', senderName: BUILDER.name,
      text: autoReply(clientText, client.name),
      timestamp: new Date().toISOString(),
    };
    const updated = [...thread, builderMsg];
    msgs[client.id] = updated;
    localStorage.setItem(MSGS_KEY, JSON.stringify(msgs));
    return updated;
  }, [client]);

  const getMessageCount = useCallback((): number => {
    if (!client) return 0;
    return (readAllMsgs()[client.id] ?? []).length;
  }, [client]);

  /* ── Documents ── */
  const getDocuments = useCallback((): PortalDocument[] => {
    if (!client) return [];
    return readAllDocs()[client.id] ?? [];
  }, [client]);

  const uploadDocument = useCallback((name: string, fileType: string, size: string, category: PortalDocument['category'] = 'uploaded'): PortalDocument => {
    if (!client) throw new Error('Not authenticated');
    const all = readAllDocs();
    const docs = all[client.id] ?? [];
    const newDoc: PortalDocument = {
      id: crypto.randomUUID(),
      name, fileType, size, category,
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
    };
    all[client.id] = [...docs, newDoc];
    localStorage.setItem(DOCS_KEY, JSON.stringify(all));
    return newDoc;
  }, [client]);

  const fulfillRequiredDoc = useCallback((docId: string, file: { name: string; size: string; fileType: string }) => {
    if (!client) return;
    const all = readAllDocs();
    const docs = (all[client.id] ?? []).map(d =>
      d.id === docId ? { ...d, status: 'uploaded' as const, uploadedAt: new Date().toISOString(), size: file.size, name: file.name } : d
    );
    all[client.id] = docs;
    localStorage.setItem(DOCS_KEY, JSON.stringify(all));
  }, [client]);

  const deleteDocument = useCallback((docId: string) => {
    if (!client) return;
    const all = readAllDocs();
    all[client.id] = (all[client.id] ?? []).filter(d => d.id !== docId);
    localStorage.setItem(DOCS_KEY, JSON.stringify(all));
  }, [client]);

  /* ── Meetings ── */
  const getMeetings = useCallback((): PortalMeeting[] => {
    if (!client) return [];
    return readAllMeetings()[client.id] ?? [];
  }, [client]);

  const requestMeeting = useCallback((meeting: Omit<PortalMeeting, 'id' | 'createdAt' | 'status'>): PortalMeeting => {
    if (!client) throw new Error('Not authenticated');
    const all = readAllMeetings();
    const meetings = all[client.id] ?? [];
    const newMeeting: PortalMeeting = {
      ...meeting,
      id: crypto.randomUUID(),
      status: 'requested',
      createdAt: new Date().toISOString(),
    };
    all[client.id] = [...meetings, newMeeting];
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(all));

    // Auto-confirm message
    const msgs = readAllMsgs();
    const thread = msgs[client.id] ?? [];
    thread.push({
      id: crypto.randomUUID(),
      sender: 'builder',
      senderName: BUILDER.name,
      text: `Thank you for scheduling a ${meeting.type} on ${meeting.date} at ${meeting.time} (${meeting.format}). I'll send a calendar confirmation to your email shortly. Looking forward to connecting with you. — ${BUILDER.name}`,
      timestamp: new Date().toISOString(),
    });
    msgs[client.id] = thread;
    localStorage.setItem(MSGS_KEY, JSON.stringify(msgs));

    return newMeeting;
  }, [client]);

  const cancelMeeting = useCallback((meetingId: string) => {
    if (!client) return;
    const all = readAllMeetings();
    all[client.id] = (all[client.id] ?? []).map(m =>
      m.id === meetingId ? { ...m, status: 'cancelled' as const } : m
    );
    localStorage.setItem(MEETINGS_KEY, JSON.stringify(all));
  }, [client]);

  return {
    client, register, login, logout,
    getBrief, saveBrief, submitBrief,
    getMessages, sendMessage, commitBuilderReply, getMessageCount,
    getDocuments, uploadDocument, fulfillRequiredDoc, deleteDocument,
    getMeetings, requestMeeting, cancelMeeting,
    builder: BUILDER,
  };
}
