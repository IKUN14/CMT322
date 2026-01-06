// Repair request status enumeration
export enum TicketStatus {
  Draft = 'Draft',
  Submitted = 'Submitted',
  Accepted = 'Accepted',
  Assigned = 'Assigned',
  InProgress = 'InProgress',
  Resolved = 'Resolved',
  Closed = 'Closed',
  Canceled = 'Canceled',
  Reassigned = 'Reassigned'
}

// Urgency enumeration
export enum Urgency {
  Normal = 'Normal',
  Urgent = 'Urgent',
  Emergency = 'Emergency'
}

// User roles
export enum UserRole {
  Student = 'Student',
  Admin = 'Admin',
  Worker = 'Worker'
}

// User interface
export interface User {
  id: string
  username: string
  email: string
  role: UserRole
  name: string
  phone?: string
  avatar?: string
}

// Worker profile
export interface WorkerProfile {
  id: string
  userId: string
  name: string
  phone: string
  department: string
  skills: string[]
  status: 'available' | 'busy' | 'offline'
  rating?: number
  completedTickets?: number
}

// Assignment record
export interface AssignmentRecord {
  id: string
  ticketId: string
  workerId: string
  workerName: string
  assignedAt: string
  assignedBy: string
  assignedByName: string
  reason?: string
}

// Repair request status change history
export interface StatusHistory {
  id: string
  ticketId: string
  fromStatus: TicketStatus
  toStatus: TicketStatus
  changedAt: string
  changedBy: string
  changedByName: string
  reason?: string
}

// Repair request interface
export interface Ticket {
  id: string
  title: string
  description: string
  images: string[]
  location: string
  urgency: Urgency
  status: TicketStatus
  statusReason?: string
  scheduledTime?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  createdByName: string
  currentAssignee?: string
  currentAssigneeName?: string
  assignmentRecords: AssignmentRecord[]
  statusHistory: StatusHistory[]
  report?: string
  reportImages?: string[]
  completedAt?: string
  confirmedAt?: string
  cancelReason?: string
  rejectReason?: string
}

// KPI metrics
export interface KPI {
  totalTickets: number
  pendingTickets: number
  inProgressTickets: number
  resolvedTickets: number
  avgResolutionTime: number // hours
  urgentTickets: number
}

// Login request
export interface LoginRequest {
  username: string
  password: string
}

// Register request
export interface RegisterRequest {
  username: string
  email: string
  password: string
  name: string
  role: UserRole
}

// Forgot password request
export interface ForgotPasswordRequest {
  email: string
}

// Create repair request
export interface CreateTicketRequest {
  title: string
  description: string
  images: string[]
  location: string
  urgency: Urgency
  scheduledTime?: string
}

// Assign repair request
export interface AssignTicketRequest {
  ticketId: string
  workerId: string
  reason?: string
}

// Batch assign request
export interface BatchAssignRequest {
  ticketIds: string[]
  workerId: string
  reason?: string
}

// Update repair request status request
export interface UpdateTicketStatusRequest {
  ticketId: string
  status: TicketStatus
  reason?: string
}

// Submit report request
export interface SubmitReportRequest {
  ticketId: string
  report: string
  images?: string[]
}

// Approval request
export interface ConfirmTicketRequest {
  ticketId: string
  approved: boolean
  reason?: string
}

// Repair request filter conditions
export interface TicketFilter {
  status?: TicketStatus[]
  urgency?: Urgency[]
  assignedTo?: string
  createdBy?: string
  dateRange?: {
    start: string
    end: string
  }
}

// Feedback interface
export interface Feedback {
  id: string
  ticketId: string
  userId: string
  userName: string
  content: string
  rating?: number
  createdAt: string
  images?: string[]
}

// Create feedback request
export interface CreateFeedbackRequest {
  ticketId: string
  content: string
  rating?: number
  images?: string[]
}
