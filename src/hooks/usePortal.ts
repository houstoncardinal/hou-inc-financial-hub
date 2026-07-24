import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PortalClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  projectType?: string;
  projectInterest?: string;
}

export interface ProjectBrief {
  id?: string;
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
  storagePath?: string;
  fileUrl?: string;
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
  address: '206 Brooks St, Sugar Land, TX 77478',
};

export const APPROVAL_DOCS: Omit<PortalDocument, 'id'>[] = [
  {
    name: 'Government-Issued Photo ID',
    fileType: 'PDF / Image',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: "A clear copy of your driver's license, passport, or state-issued ID for identity verification.",
  },
  {
    name: 'Signed Project Intake Form',
    fileType: 'PDF',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: 'Complete, sign, and upload the HOU INC Project Intake Form. A copy will be sent to your email.',
  },
  {
    name: 'Proof of Property Ownership or Site LOI',
    fileType: 'PDF',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: 'Your property deed, title report, purchase agreement, or a Letter of Intent for the build site.',
  },
  {
    name: 'Proof of Funds or Construction Loan Pre-Approval',
    fileType: 'PDF',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: 'Bank statement, line-of-credit letter, or construction loan pre-approval confirming project financing.',
  },
  {
    name: 'Site Survey / Plat Map',
    fileType: 'PDF / CAD',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: 'Current survey of the property including legal boundaries, easements, and dimensions. Upload if available.',
  },
  {
    name: 'Design Inspiration & References',
    fileType: 'PDF / Images',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: 'Photos, mood boards, architectural images, or Pinterest boards that capture your vision and style.',
  },
  {
    name: 'HOA Architectural Review Approval',
    fileType: 'PDF',
    size: '',
    category: 'required',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: 'If your property is within an HOA, upload the architectural committee approval. Mark N/A if not applicable.',
  },
  {
    name: 'Existing Plans or Sketches (if available)',
    fileType: 'PDF / CAD / Images',
    size: '',
    category: 'uploaded',
    status: 'pending',
    requestedBy: 'HOU INC',
    description: "Any existing architectural drawings, floor plan sketches, or design concepts you'd like to share.",
  },
];

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapClient(row: any): PortalClient {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? '',
    createdAt: row.created_at,
    status: row.status,
    projectType: row.project_type,
    projectInterest: row.project_interest,
  };
}

function mapBrief(row: any): ProjectBrief {
  return {
    id: row.id,
    type: row.type ?? '',
    location: row.location ?? '',
    sqft: row.sqft ?? '',
    bedrooms: row.bedrooms ?? '',
    bathrooms: row.bathrooms ?? '',
    floors: row.floors ?? '',
    style: row.style ?? [],
    budget: row.budget ?? '',
    timeline: row.timeline ?? '',
    description: row.description ?? '',
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

function mapMessage(row: any): PortalMessage {
  return {
    id: row.id,
    sender: row.sender,
    senderName: row.sender_name,
    text: row.body,
    timestamp: row.created_at,
  };
}

function mapDocument(row: any): PortalDocument {
  return {
    id: row.id,
    name: row.name,
    fileType: row.file_type,
    size: row.file_size ?? '',
    category: row.category,
    status: row.status,
    requestedBy: row.requested_by,
    description: row.description,
    uploadedAt: row.uploaded_at,
    storagePath: row.storage_path,
    fileUrl: row.file_url,
  };
}

function mapMeeting(row: any): PortalMeeting {
  return {
    id: row.id,
    type: row.type,
    date: row.date,
    time: row.time,
    format: row.format,
    notes: row.notes ?? '',
    status: row.status,
    createdAt: row.created_at,
  };
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

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePortal() {
  const [client, setClient] = useState<PortalClient | null>(null);
  // true once the initial session-restore check has resolved
  const [loaded, setLoaded] = useState(false);
  const [briefs, setBriefs] = useState<ProjectBrief[]>([]);
  const [messages, setMessages]   = useState<PortalMessage[]>([]);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [meetings, setMeetings]   = useState<PortalMeeting[]>([]);

  // Re-fetch the portal_clients row linked to the current Supabase Auth
  // session (auth.uid()) — the single source of truth for "who am I".
  const refreshClient = useCallback(async (): Promise<
    { ok: boolean; status?: PortalClient['status']; error?: string; client?: PortalClient }
  > => {
    try {
      const { data, error } = await (supabase as any).rpc('get_my_portal_client');
      let row = Array.isArray(data) ? data[0] : data;

      // Developer accounts have no portal_clients row by default — auto-provision
      // one so they can view the portal too. ensure_developer_portal_profile()
      // rejects (harmlessly, caught here) anyone who isn't actually a developer.
      if (!row) {
        const dev = await (supabase as any).rpc('ensure_developer_portal_profile');
        const devRow = Array.isArray(dev.data) ? dev.data[0] : dev.data;
        if (!dev.error && devRow) row = devRow;
      }

      if (!row) { setClient(null); return { ok: false, error: error?.message ?? 'No portal account found for this email address.' }; }
      const c = mapClient(row);
      setClient(c);
      return { ok: true, status: c.status, client: c };
    } catch (err) {
      console.error('refreshClient failed:', err);
      setClient(null);
      return { ok: false, error: 'Account lookup failed. Please try again.' };
    }
  }, []);

  // Restore session on mount, and react to sign-in/sign-out anywhere in the app.
  // loaded must resolve no matter what — every portal page renders nothing at
  // all while loaded is false, so a hung/rejected getSession() or a throw
  // inside refreshClient() (e.g. a rejected RPC call, not just an {error} — a
  // real risk on a cold reload where the token needs to be revalidated) would
  // otherwise leave every page permanently blank with no console error.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session) await refreshClient(); else setClient(null);
      } catch (err) {
        console.error('Portal session restore failed:', err);
        if (active) setClient(null);
      } finally {
        if (active) setLoaded(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      try {
        if (session) await refreshClient(); else setClient(null);
      } catch (err) {
        console.error('Portal session refresh failed:', err);
        if (active) setClient(null);
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [refreshClient]);

  // Load all client data once the client record is resolved
  useEffect(() => {
    if (!client) {
      setBriefs([]); setMessages([]); setDocuments([]); setMeetings([]);
      return;
    }
    Promise.all([
      supabase.from('portal_briefs').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('portal_messages').select('*').eq('client_id', client.id).order('created_at', { ascending: true }),
      supabase.from('portal_documents').select('*').eq('client_id', client.id),
      supabase.from('portal_meetings').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
    ]).then(([bRes, mRes, dRes, mtRes]) => {
      if (bRes.data)  setBriefs(bRes.data.map(mapBrief));
      if (mRes.data)  setMessages(mRes.data.map(mapMessage));
      if (dRes.data)  setDocuments(dRes.data.map(mapDocument));
      if (mtRes.data) setMeetings(mtRes.data.map(mapMeeting));
    });
  }, [client?.id]);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const register = useCallback(async (
    name: string, email: string, phone: string,
    projectType?: string, projectInterest?: string,
    password?: string,
    inviteToken?: string,
  ): Promise<{ ok: boolean; needsConfirmation?: boolean; error?: string }> => {
    if (!password?.trim()) return { ok: false, error: 'Please create a password for your account.' };

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          phone: phone.trim(),
          project_type: projectType ?? '',
          project_interest: projectInterest ?? '',
          ...(inviteToken ? { invite_token: inviteToken } : {}),
        },
        emailRedirectTo: `${window.location.origin}/portal?register=true`,
      },
    });

    if (error) return { ok: false, error: error.message ?? 'Registration failed.' };
    if (data.session) {
      // Some projects auto-confirm email — if a session came back immediately,
      // finish setting up the profile right away instead of waiting on a click.
      await (supabase as any).rpc('complete_portal_registration');
      await refreshClient();
      return { ok: true };
    }
    return { ok: true, needsConfirmation: true };
  }, [refreshClient]);

  const login = useCallback(async (
    email: string,
    password: string,
  ): Promise<{ ok: boolean; status?: PortalClient['status']; error?: string }> => {
    if (!password?.trim()) return { ok: false, error: 'Please enter your password.' };

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { ok: false, error: error.message ?? 'Incorrect email or password.' };
    return refreshClient();
  }, [refreshClient]);

  // Called once a real Supabase Auth session exists after clicking the
  // registration-confirmation email link — creates the portal_clients profile
  // row (or returns the existing one if this already ran).
  const completeRegistration = useCallback(async (): Promise<
    { ok: boolean; status?: PortalClient['status']; error?: string; client?: PortalClient }
  > => {
    const { error } = await (supabase as any).rpc('complete_portal_registration');
    if (error) return { ok: false, error: error.message ?? 'Could not finish setting up your account.' };
    return refreshClient();
  }, [refreshClient]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setClient(null);
    setBriefs([]);
    setMessages([]);
    setDocuments([]);
    setMeetings([]);
  }, []);

  // ── Brief ─────────────────────────────────────────────────────────────────
  // A client can submit more than one brief (multiple projects with the
  // company over time). getBrief() keeps returning the most recent one for
  // callers that only ever cared about a single glance (dashboard progress,
  // projects-page summary); getBriefs() exposes the full list for the Project
  // Brief tab, which lets a client view every brief and start a new one.

  const getBrief = useCallback((): ProjectBrief | null => briefs[0] ?? null, [briefs]);
  const getBriefs = useCallback((): ProjectBrief[] => briefs, [briefs]);

  const saveBrief = useCallback(async (partial: Partial<ProjectBrief>, id?: string): Promise<string | undefined> => {
    if (!client) return undefined;
    const existing = id ? briefs.find(b => b.id === id) : undefined;
    const merged = { ...(existing ?? {}), ...partial } as ProjectBrief;
    const row = {
      client_id:   client.id,
      type:        merged.type,
      location:    merged.location,
      sqft:        merged.sqft,
      bedrooms:    merged.bedrooms,
      bathrooms:   merged.bathrooms,
      floors:      merged.floors,
      style:       merged.style,
      budget:      merged.budget,
      timeline:    merged.timeline,
      description: merged.description,
      status:      merged.status ?? 'draft',
    };
    const { data, error } = id
      ? await supabase.from('portal_briefs').update(row).eq('id', id).select().single()
      : await supabase.from('portal_briefs').insert(row).select().single();
    if (error || !data) return id;
    const saved = mapBrief(data);
    setBriefs(prev => id ? prev.map(b => b.id === id ? saved : b) : [saved, ...prev]);
    return saved.id;
  }, [client, briefs]);

  const submitBrief = useCallback(async (briefData: ProjectBrief, id?: string): Promise<string | undefined> => {
    if (!client) return undefined;
    const row = {
      client_id:   client.id,
      type:        briefData.type,
      location:    briefData.location,
      sqft:        briefData.sqft,
      bedrooms:    briefData.bedrooms,
      bathrooms:   briefData.bathrooms,
      floors:      briefData.floors,
      style:       briefData.style,
      budget:      briefData.budget,
      timeline:    briefData.timeline,
      description: briefData.description,
      status:      'submitted',
      submitted_at: new Date().toISOString(),
    };
    const { data, error } = id
      ? await supabase.from('portal_briefs').update(row).eq('id', id).select().single()
      : await supabase.from('portal_briefs').insert(row).select().single();
    if (!error && data) {
      const saved = mapBrief(data);
      setBriefs(prev => id ? prev.map(b => b.id === id ? saved : b) : [saved, ...prev]);
    }

    // Auto-confirmation message
    const welcomeText = `Excellent, ${client.name} — I've received your project brief. A ${briefData.type} in ${briefData.location || 'the Houston area'}, approximately ${briefData.sqft} sq ft, ${briefData.budget} budget. This is a strong foundation. I'm preparing a preliminary project outline and will reach out within one business day to schedule our first consultation. Very much looking forward to working together. — ${BUILDER.name}`;
    await supabase.from('portal_messages').insert({
      client_id:   client.id,
      sender:      'builder',
      sender_name: BUILDER.name,
      body:        welcomeText,
    });
    const { data: msgData } = await supabase
      .from('portal_messages')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: true });
    if (msgData) setMessages(msgData.map(mapMessage));
  }, [client]);

  // ── Messages ──────────────────────────────────────────────────────────────

  const getMessages = useCallback((): PortalMessage[] => messages, [messages]);

  const sendMessage = useCallback(async (text: string): Promise<PortalMessage[]> => {
    if (!client) return messages;
    const { data } = await supabase.from('portal_messages').insert({
      client_id:   client.id,
      sender:      'client',
      sender_name: client.name,
      body:        text,
    }).select().single();
    if (!data) return messages;
    const updated = [...messages, mapMessage(data)];
    setMessages(updated);
    return updated;
  }, [client, messages]);

  const commitBuilderReply = useCallback(async (clientText: string): Promise<PortalMessage[]> => {
    if (!client) return messages;
    const { data } = await supabase.from('portal_messages').insert({
      client_id:   client.id,
      sender:      'builder',
      sender_name: BUILDER.name,
      body:        autoReply(clientText, client.name),
    }).select().single();
    if (!data) return messages;
    const updated = [...messages, mapMessage(data)];
    setMessages(updated);
    return updated;
  }, [client, messages]);

  const getMessageCount = useCallback((): number => messages.length, [messages]);

  // ── Documents ─────────────────────────────────────────────────────────────

  const getDocuments = useCallback((): PortalDocument[] => documents, [documents]);

  const uploadDocument = useCallback(async (
    name: string, fileType: string, size: string,
    category: PortalDocument['category'] = 'uploaded',
    storagePath?: string,
    fileUrl?: string,
  ): Promise<PortalDocument> => {
    if (!client) throw new Error('Not authenticated');
    const { data, error } = await supabase.from('portal_documents').insert({
      client_id:    client.id,
      name,
      file_type:    fileType,
      file_size:    size,
      category,
      status:       'uploaded',
      uploaded_at:  new Date().toISOString(),
      storage_path: storagePath ?? null,
      file_url:     fileUrl ?? null,
    }).select().single();
    if (error || !data) throw new Error(error?.message ?? 'Upload failed');
    const newDoc = mapDocument(data);
    setDocuments(prev => [...prev, newDoc]);
    return newDoc;
  }, [client]);

  const fulfillRequiredDoc = useCallback(async (
    docId: string,
    file: { name: string; size: string; fileType: string; storagePath?: string; fileUrl?: string },
  ) => {
    if (!client) return;
    const { error } = await supabase.from('portal_documents').update({
      status:       'uploaded',
      uploaded_at:  new Date().toISOString(),
      file_size:    file.size,
      name:         file.name,
      storage_path: file.storagePath ?? null,
      file_url:     file.fileUrl ?? null,
    }).eq('id', docId);
    if (!error) {
      setDocuments(prev => prev.map(d =>
        d.id === docId ? {
          ...d,
          status:      'uploaded',
          uploadedAt:  new Date().toISOString(),
          size:        file.size,
          name:        file.name,
          storagePath: file.storagePath,
          fileUrl:     file.fileUrl,
        } : d
      ));
    }
  }, [client]);

  const deleteDocument = useCallback(async (docId: string) => {
    if (!client) return;
    const { error } = await supabase.from('portal_documents').delete().eq('id', docId);
    if (!error) setDocuments(prev => prev.filter(d => d.id !== docId));
  }, [client]);

  // ── Meetings ──────────────────────────────────────────────────────────────

  const getMeetings = useCallback((): PortalMeeting[] => meetings, [meetings]);

  const requestMeeting = useCallback(async (
    meeting: Omit<PortalMeeting, 'id' | 'createdAt' | 'status'>,
  ): Promise<PortalMeeting> => {
    if (!client) throw new Error('Not authenticated');
    const { data, error } = await supabase.from('portal_meetings').insert({
      client_id: client.id,
      type:      meeting.type,
      date:      meeting.date,
      time:      meeting.time,
      format:    meeting.format,
      notes:     meeting.notes,
      status:    'requested',
    }).select().single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to schedule meeting');
    const newMeeting = mapMeeting(data);
    setMeetings(prev => [newMeeting, ...prev]);

    // Auto-confirmation message
    await supabase.from('portal_messages').insert({
      client_id:   client.id,
      sender:      'builder',
      sender_name: BUILDER.name,
      body:        `Thank you for scheduling a ${meeting.type} on ${meeting.date} at ${meeting.time} (${meeting.format}). I'll send a calendar confirmation to your email shortly. Looking forward to connecting with you. — ${BUILDER.name}`,
    });
    const { data: msgData } = await supabase
      .from('portal_messages')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: true });
    if (msgData) setMessages(msgData.map(mapMessage));

    return newMeeting;
  }, [client]);

  const cancelMeeting = useCallback(async (meetingId: string) => {
    if (!client) return;
    const { error } = await supabase.from('portal_meetings').update({ status: 'cancelled' }).eq('id', meetingId);
    if (!error) {
      setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: 'cancelled' as const } : m));
    }
  }, [client]);

  return {
    client,
    loaded,
    register,
    login,
    completeRegistration,
    refreshClient,
    logout,
    getBrief,
    getBriefs,
    saveBrief,
    submitBrief,
    getMessages,
    sendMessage,
    commitBuilderReply,
    getMessageCount,
    getDocuments,
    uploadDocument,
    fulfillRequiredDoc,
    deleteDocument,
    getMeetings,
    requestMeeting,
    cancelMeeting,
    builder: BUILDER,
  };
}
