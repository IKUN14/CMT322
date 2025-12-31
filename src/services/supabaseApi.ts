import { supabase } from '@/lib/supabase'
import { TicketStatus, Urgency, type CreateTicketRequest, type WorkerProfile, type Feedback, type CreateFeedbackRequest } from '@/types'
import { toDbStatus, toAppStatus } from '@/utils/statusMapper'

type RepairRow = {
  id: string
  title: string
  description: string
  location: string
  urgency: 'normal' | 'urgent' | 'emergency'
  status: string
  status_reason?: string | null
  scheduled_time?: string | null
  created_by: string
  assigned_worker_id?: string | null
  resolved_at?: string | null
  closed_at?: string | null
  canceled_at?: string | null
  created_at: string
  updated_at: string
}

type TimelineRow = {
  id: string
  repair_id: string
  from_status: string | null
  to_status: string
  changed_by: string
  reason?: string | null
  created_at: string
}

type AttachmentRow = {
  id: string
  repair_id: string
  owner_id: string
  type: 'repair' | 'report' | 'feedback'
  bucket: string
  path: string
  created_at: string
}

type ProfileRow = {
  id: string
  role: string
  name: string | null
  phone: string | null
  department: string | null
  status: 'available' | 'busy' | 'offline' | null
}

type FeedbackRow = {
  id: string
  repair_id: string
  student_id: string
  rating: number | null
  content: string | null
  created_at: string
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    throw new Error('Not authenticated')
  }
  return data.session.user.id
}

function mapUrgencyToDb(urgency: Urgency): 'normal' | 'urgent' | 'emergency' {
  if (urgency === Urgency.Urgent) return 'urgent'
  if (urgency === Urgency.Emergency) return 'emergency'
  return 'normal'
}

function mapUrgencyFromDb(dbUrgency: string): Urgency {
  if (dbUrgency === 'urgent') return Urgency.Urgent
  if (dbUrgency === 'emergency') return Urgency.Emergency
  return Urgency.Normal
}

export const authApi = {
  async initSession(onChange: (session: any) => void) {
    const { data } = await supabase.auth.getSession()
    onChange(data.session)
    supabase.auth.onAuthStateChange((_event, session) => onChange(session))
  },
  login(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  },
  register(email: string, password: string, role: 'student' | 'admin' | 'worker' = 'student', name?: string) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, name }
      }
    })
  },
  forgotPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
  },
  resetPassword(newPassword: string) {
    return supabase.auth.updateUser({ password: newPassword })
  },
  logout() {
    return supabase.auth.signOut()
  }
}

export const repairsApi = {
  async list(filters?: { status?: TicketStatus[]; urgency?: Urgency[] }) {
    let query = supabase.from('repairs').select('*').order('created_at', { ascending: false })

    if (filters?.status?.length) {
      const dbStatuses = filters.status.map(toDbStatus)
      query = query.in('status', dbStatuses)
    }
    if (filters?.urgency?.length) {
      const dbUrgencies = filters.urgency.map(mapUrgencyToDb)
      query = query.in('urgency', dbUrgencies)
    }

    const { data, error } = await query
    if (error) throw error
    return Promise.all((data ?? []).map(row => this.enrich(row)))
  },

  async get(id: string) {
    const { data, error } = await supabase.from('repairs').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? this.enrich(data) : null
  },

  async create(input: CreateTicketRequest & { submit?: boolean }) {
    const userId = await requireUserId()
    const { data, error } = await supabase
      .from('repairs')
      .insert({
        title: input.title,
        description: input.description,
        location: input.location,
        urgency: mapUrgencyToDb(input.urgency),
        status: input.submit ? 'submitted' : 'draft',
        scheduled_time: input.scheduledTime ?? null,
        created_by: userId
      })
      .select('*')
      .maybeSingle()

    if (error) throw error
    return data ? this.enrich(data) : null
  },

  async updateStatus(repairId: string, status: TicketStatus, reason?: string) {
    const { data, error } = await supabase
      .from('repairs')
      .update({ status: toDbStatus(status), status_reason: reason ?? null })
      .eq('id', repairId)
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data ? this.enrich(data) : null
  },

  async assign(repairId: string, workerId: string, reason?: string) {
    const { data, error } = await supabase
      .from('repairs')
      .update({
        assigned_worker_id: workerId,
        status: 'assigned',
        status_reason: reason ?? null
      })
      .eq('id', repairId)
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data ? this.enrich(data) : null
  },

  async reassign(repairId: string, workerId: string, reason?: string) {
    const { data, error } = await supabase
      .from('repairs')
      .update({
        assigned_worker_id: workerId,
        status: 'reassigned',
        status_reason: reason ?? null
      })
      .eq('id', repairId)
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data ? this.enrich(data) : null
  },

  async submitReport(repairId: string, content: string) {
    const userId = await requireUserId()
    const { error } = await supabase.from('repair_reports').insert({
      repair_id: repairId,
      worker_id: userId,
      content
    })
    if (error) throw error
    return this.updateStatus(repairId, TicketStatus.Resolved)
  },

  async timeline(repairId: string) {
    const { data, error } = await supabase
      .from('repair_timeline')
      .select('*')
      .eq('repair_id', repairId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(mapTimelineFromDb)
  },

  async attachments(repairId: string) {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('repair_id', repairId)
    if (error) throw error
    return (data ?? []).map(mapAttachmentFromDb)
  },

  async enrich(row: RepairRow) {
    const [timeline, attachments] = await Promise.all([
      this.timeline(row.id),
      this.attachments(row.id)
    ])
    return mapRepairFromDb(row, timeline, attachments)
  }
}

export const kpiApi = {
  async getKPI() {
    const { data, error } = await supabase.rpc('get_repair_kpi')
    if (error) throw error
    return data?.[0] ?? null
  },
  async exportRepairs() {
    const { data, error } = await supabase.rpc('get_repairs_export')
    if (error) throw error
    return data ?? []
  }
}

export const attachmentsApi = {
  async upload(repairId: string, file: File, segment: 'repair' | 'report' | 'feedback') {
    const userId = await requireUserId()
    const extension = file.name.split('.').pop() || 'jpg'
    const path = `repairs/${repairId}/${segment}/${randomId()}.${extension}`
    const { error: uploadError } = await supabase.storage.from('repairs-media').upload(path, file, {
      contentType: file.type,
      upsert: false
    })
    if (uploadError) throw uploadError

    const { error: insertError } = await supabase.from('attachments').insert({
      repair_id: repairId,
      owner_id: userId,
      type: segment,
      bucket: 'repairs-media',
      path
    })
    if (insertError) throw insertError
    return path
  }
}

export const workersApi = {
  async list(search?: string): Promise<WorkerProfile[]> {
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('role', 'worker')

    if (search) {
      const keyword = `%${search.toLowerCase()}%`
      query = query.or(`name.ilike.${keyword},department.ilike.${keyword}`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map(mapWorkerFromDb)
  },

  async updateStatus(id: string, status: WorkerProfile['status']) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', id)
      .eq('role', 'worker')
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data ? mapWorkerFromDb(data) : null
  },

  // Placeholder: creating new workers requires admin/service role; implement when server-side key available.
  async create(_data: Omit<WorkerProfile, 'id' | 'completedTickets' | 'rating' | 'userId'>) {
    throw new Error('Create worker is not available with anon key. Please create user via Supabase Dashboard or service role.')
  }
}

export const feedbackApi = {
  async fetchByTicket(ticketId: string): Promise<Feedback[]> {
    const { data, error } = await supabase.from('feedback').select('*').eq('repair_id', ticketId)
    if (error) throw error
    return (data ?? []).map(mapFeedbackFromDb)
  },

  async create(payload: CreateFeedbackRequest & { ticketId: string }) {
    const userId = await requireUserId()
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        repair_id: payload.ticketId,
        student_id: userId,
        rating: payload.rating ?? null,
        content: payload.content ?? null
      })
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data ? mapFeedbackFromDb(data) : null
  }
}

function mapRepairFromDb(row: RepairRow, timeline: ReturnType<typeof mapTimelineFromDb>[] = [], attachments: ReturnType<typeof mapAttachmentFromDb>[] = []) {
  const repairImages = attachments.filter(a => a.type === 'repair').map(a => a.url)
  const reportImages = attachments.filter(a => a.type === 'report').map(a => a.url)
  const feedbackImages = attachments.filter(a => a.type === 'feedback').map(a => a.url)

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    urgency: mapUrgencyFromDb(row.urgency),
    status: toAppStatus(row.status),
    statusReason: row.status_reason ?? undefined,
    scheduledTime: row.scheduled_time ?? undefined,
    images: repairImages,
    reportImages,
    feedbackImages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    currentAssignee: row.assigned_worker_id ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    canceledAt: row.canceled_at ?? undefined,
    statusHistory: timeline,
    assignmentRecords: [], // not yet implemented
    createdByName: '',
    currentAssigneeName: ''
  }
}

function mapTimelineFromDb(row: TimelineRow) {
  return {
    id: row.id,
    repairId: row.repair_id,
    fromStatus: row.from_status ? toAppStatus(row.from_status) : null,
    toStatus: toAppStatus(row.to_status),
  changedBy: row.changed_by,
  reason: row.reason ?? undefined,
  createdAt: row.created_at
}

function mapAttachmentFromDb(row: AttachmentRow) {
  // For private bucket, use signed URL on demand. Here we return path.
  return {
    id: row.id,
    repairId: row.repair_id,
    ownerId: row.owner_id,
    type: row.type,
    bucket: row.bucket,
    path: row.path,
    url: `${row.bucket}/${row.path}`,
    createdAt: row.created_at
  }
}

function mapWorkerFromDb(row: ProfileRow): WorkerProfile {
  return {
    id: row.id,
    userId: row.id,
    name: row.name ?? '',
    phone: row.phone ?? '',
    department: row.department ?? '',
    skills: [],
    status: (row.status ?? 'available') as WorkerProfile['status'],
    rating: undefined,
    completedTickets: undefined
  }
}

function mapFeedbackFromDb(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    ticketId: row.repair_id,
    userId: row.student_id,
    userName: '',
    content: row.content ?? '',
    rating: row.rating ?? undefined,
    createdAt: row.created_at,
    images: []
  }
}
}
