import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Ticket,
  TicketFilter,
  CreateTicketRequest,
  UpdateTicketStatusRequest,
  AssignTicketRequest,
  BatchAssignRequest,
  SubmitReportRequest,
  ConfirmTicketRequest
} from '@/types'
import { TicketStatus } from '@/types'
import { repairsApi, kpiApi } from '@/services/supabaseApi'
import { toDbStatus, toAppStatus } from '@/utils/statusMapper'

export const useTicketStore = defineStore('tickets', () => {
  const tickets = ref<Ticket[]>([])
  const currentTicket = ref<Ticket | null>(null)
  const loading = ref(false)
  const selectedTicketIds = ref<string[]>([])

  // Computed properties
  const draftTickets = computed(() => tickets.value.filter(t => t.status === TicketStatus.Draft))
  const submittedTickets = computed(() => tickets.value.filter(t => t.status === TicketStatus.Submitted))
  const acceptedTickets = computed(() => tickets.value.filter(t => t.status === TicketStatus.Accepted))
  const assignedTickets = computed(() => tickets.value.filter(t => t.status === TicketStatus.Assigned))
  const inProgressTickets = computed(() => tickets.value.filter(t => t.status === TicketStatus.InProgress))
  const resolvedTickets = computed(() => tickets.value.filter(t => t.status === TicketStatus.Resolved))
  const closedTickets = computed(() => tickets.value.filter(t => t.status === TicketStatus.Closed))
  const canceledTickets = computed(() => tickets.value.filter(t => t.status === TicketStatus.Canceled))

  const hasSelected = computed(() => selectedTicketIds.value.length > 0)
  const isAllSelected = computed(() => {
    return tickets.value.length > 0 && selectedTicketIds.value.length === tickets.value.length
  })

  // Actions
  async function fetchTickets(filter?: TicketFilter) {
    loading.value = true
    try {
      tickets.value = await repairsApi.list(filter)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function fetchTicket(id: string) {
    loading.value = true
    try {
      const ticket = await repairsApi.get(id)
      if (ticket) {
        currentTicket.value = { ...ticket }
        const index = tickets.value.findIndex(t => t.id === id)
        if (index !== -1) {
          tickets.value[index] = { ...ticket }
        } else {
          tickets.value.unshift(ticket)
        }
      }
      return currentTicket.value
    } catch (error) {
      console.error('Failed to fetch ticket:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function createTicket(data: CreateTicketRequest) {
    loading.value = true
    try {
      const ticket = await repairsApi.create({ ...data, submit: true })
      if (ticket) {
        tickets.value.unshift(ticket)
      }
      return ticket
    } catch (error) {
      console.error('Failed to create ticket:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updateTicketStatus(data: UpdateTicketStatusRequest) {
    loading.value = true
    try {
      const ticket = await repairsApi.updateStatus(data.ticketId, data.status, data.reason)
      // Update the ticket in the list
      const index = tickets.value.findIndex(t => t.id === ticket.id)
      if (index !== -1) {
        tickets.value[index] = ticket
      }
      // Ensure currentTicket is updated correctly (use new object reference to trigger reactive update)
      if (currentTicket.value?.id === ticket.id) {
        currentTicket.value = { ...ticket }
      }
      return ticket
    } catch (error) {
      console.error('Failed to update ticket status:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function assignTicket(data: AssignTicketRequest) {
    loading.value = true
    try {
      const ticket = await repairsApi.assign(data.ticketId, data.workerId, data.reason)
      const index = tickets.value.findIndex(t => t.id === ticket.id)
      if (index !== -1) {
        tickets.value[index] = { ...ticket }
      }
      if (currentTicket.value?.id === ticket.id) {
        currentTicket.value = { ...ticket }
      }
      return ticket
    } catch (error) {
      console.error('Failed to assign ticket:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function reassignTicket(data: AssignTicketRequest) {
    loading.value = true
    try {
      const ticket = await repairsApi.reassign(data.ticketId, data.workerId, data.reason)
      const index = tickets.value.findIndex(t => t.id === ticket.id)
      if (index !== -1) {
        tickets.value[index] = { ...ticket }
      }
      if (currentTicket.value?.id === ticket.id) {
        currentTicket.value = { ...ticket }
      }
      return ticket
    } catch (error) {
      console.error('Failed to reassign ticket:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function batchAssign(data: BatchAssignRequest) {
    loading.value = true
    try {
      // Supabase API does not yet provide batch; we iterate
      const updatedTickets: Ticket[] = []
      for (const id of data.ticketIds) {
        const t = await repairsApi.assign(id, data.workerId, data.reason)
        if (t) updatedTickets.push(t)
      }
      updatedTickets.forEach(ticket => {
        const index = tickets.value.findIndex(t => t.id === ticket.id)
        if (index !== -1) {
          tickets.value[index] = ticket
        }
      })
      selectedTicketIds.value = []
      return updatedTickets
    } catch (error) {
      console.error('Failed to batch assign tickets:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function batchComplete(ticketIds: string[]) {
    loading.value = true
    try {
      const updatedTickets: Ticket[] = []
      for (const id of ticketIds) {
        const t = await repairsApi.updateStatus(id, TicketStatus.Resolved)
        if (t) updatedTickets.push(t)
      }
      updatedTickets.forEach(ticket => {
        const index = tickets.value.findIndex(t => t.id === ticket.id)
        if (index !== -1) {
          tickets.value[index] = ticket
        }
      })
      selectedTicketIds.value = []
      return updatedTickets
    } catch (error) {
      console.error('Failed to batch complete tickets:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function submitReport(data: SubmitReportRequest) {
    loading.value = true
    try {
      const ticket = await repairsApi.submitReport(data.ticketId, data.report)
      const index = tickets.value.findIndex(t => t.id === ticket.id)
      if (index !== -1) {
        tickets.value[index] = ticket
      }
      if (currentTicket.value?.id === ticket.id) {
        currentTicket.value = ticket
      }
      return ticket
    } catch (error) {
      console.error('Failed to submit report:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function confirmTicket(data: ConfirmTicketRequest) {
    loading.value = true
    try {
      const ticket = await repairsApi.updateStatus(
        data.ticketId,
        data.approved ? TicketStatus.Closed : TicketStatus.InProgress,
        data.reason
      )
      const index = tickets.value.findIndex(t => t.id === ticket.id)
      if (index !== -1) {
        tickets.value[index] = ticket
      }
      if (currentTicket.value?.id === ticket.id) {
        currentTicket.value = ticket
      }
      return ticket
    } catch (error) {
      console.error('Failed to confirm ticket:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function exportCSV(filter?: TicketFilter) {
    try {
      const rows = await kpiApi.exportRepairs()
      const filtered = applyExportFilter(rows, filter)
      return buildCsv(filtered)
    } catch (error) {
      console.error('Failed to export CSV:', error)
      throw error
    }
  }

  function applyExportFilter(rows: any[], filter?: TicketFilter) {
    if (!filter) return rows
    return rows.filter(row => {
      if (filter.status?.length) {
        const allowed = filter.status.map(status => toDbStatus(status))
        if (!allowed.includes(row.status)) return false
      }
      if (filter.urgency?.length && !filter.urgency.includes(toAppUrgency(row.urgency))) {
        return false
      }
      if (filter.assignedTo && row.assigned_worker_id !== filter.assignedTo) return false
      if (filter.createdBy && row.created_by !== filter.createdBy) return false
      if (filter.dateRange?.start || filter.dateRange?.end) {
        const created = new Date(row.created_at).getTime()
        const start = filter.dateRange?.start ? new Date(filter.dateRange.start).getTime() : null
        const end = filter.dateRange?.end ? new Date(filter.dateRange.end).getTime() : null
        if (start && created < start) return false
        if (end && created > end) return false
      }
      return true
    })
  }

  function buildCsv(rows: any[]) {
    const headers = [
      'Repair ID',
      'Title',
      'Status',
      'Urgency',
      'Creator',
      'Assignee',
      'Created At',
      'Updated At',
      'Scheduled Time',
      'Resolved At',
      'Closed At',
      'Canceled At'
    ]
    const csvRows = [headers.join(',')]
    rows.forEach(row => {
      const values = [
        row.repair_id,
        row.title,
        toAppStatus(row.status),
        toAppUrgency(row.urgency),
        row.created_by_name ?? row.created_by,
        row.assigned_worker_name ?? row.assigned_worker_id,
        formatCsvDate(row.created_at),
        formatCsvDate(row.updated_at),
        formatCsvDate(row.scheduled_time),
        formatCsvDate(row.resolved_at),
        formatCsvDate(row.closed_at),
        formatCsvDate(row.canceled_at)
      ]
      csvRows.push(values.map(escapeCsv).join(','))
    })
    return csvRows.join('\n')
  }

  function escapeCsv(value: unknown) {
    const text = String(value ?? '')
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  function formatCsvDate(value: unknown) {
    if (!value) return ''
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toISOString()
  }

  function toAppUrgency(urgency: string) {
    const normalized = String(urgency ?? '').toLowerCase()
    if (normalized === 'urgent') return 'Urgent'
    if (normalized === 'emergency') return 'Emergency'
    return 'Normal'
  }

  // Selection management
  function toggleSelectTicket(id: string) {
    const index = selectedTicketIds.value.indexOf(id)
    if (index > -1) {
      selectedTicketIds.value.splice(index, 1)
    } else {
      selectedTicketIds.value.push(id)
    }
  }

  function selectAllTickets() {
    selectedTicketIds.value = tickets.value.map(t => t.id)
  }

  function clearSelection() {
    selectedTicketIds.value = []
  }

  function toggleSelectAll() {
    if (isAllSelected.value) {
      clearSelection()
    } else {
      selectAllTickets()
    }
  }

  return {
    tickets,
    currentTicket,
    loading,
    selectedTicketIds,
    draftTickets,
    submittedTickets,
    acceptedTickets,
    assignedTickets,
    inProgressTickets,
    resolvedTickets,
    closedTickets,
    canceledTickets,
    hasSelected,
    isAllSelected,
    fetchTickets,
    fetchTicket,
    createTicket,
    updateTicketStatus,
    assignTicket,
    reassignTicket,
    batchAssign,
    batchComplete,
    submitReport,
    confirmTicket,
    exportCSV,
    toggleSelectTicket,
    selectAllTickets,
    clearSelection,
    toggleSelectAll
  }
})
