<template>
  <div class="ticket-list">
    <div class="page-header">
      <div>
        <h2>Repair Management</h2>
        <p class="subtitle">Review, assign, and export all repairs</p>
      </div>
      <div class="filters">
        <div class="status-filter" @click="showFilterMenu = !showFilterMenu">
          <button type="button" class="status-button">
            Status: {{ filterLabel }}
            <span v-if="filterStatus" class="clear-filter" @click.stop="clearFilter">×</span>
          </button>
          <div v-if="showFilterMenu" class="status-menu">
            <button type="button" class="status-option all-option" @click.stop="selectStatus('')">
              <span class="status-dot" :style="{ backgroundColor: '#64748b' }"></span>
              <span class="status-name">All</span>
              <span class="status-count">{{ statusCounts.all || 0 }}</span>
            </button>
            <div class="status-group">
              <span class="status-group-title">Open</span>
              <button
                v-for="option in openOptions"
                :key="option.value"
                type="button"
                class="status-option"
                @click.stop="selectStatus(option.value)"
              >
                <span class="status-dot" :style="{ backgroundColor: option.color }"></span>
                <span class="status-name">{{ option.label }}</span>
                <span class="status-count">{{ statusCounts[option.value] || 0 }}</span>
              </button>
            </div>
            <div class="status-group">
              <span class="status-group-title">Done</span>
              <button
                v-for="option in doneOptions"
                :key="option.value"
                type="button"
                class="status-option"
                @click.stop="selectStatus(option.value)"
              >
                <span class="status-dot" :style="{ backgroundColor: option.color }"></span>
                <span class="status-name">{{ option.label }}</span>
                <span class="status-count">{{ statusCounts[option.value] || 0 }}</span>
              </button>
            </div>
          </div>
        </div>
        <button @click="handleRefresh" class="btn btn-primary">Refresh</button>
        <button @click="handleExport" class="btn btn-success">Export CSV</button>
      </div>
    </div>
    <div class="table-container">
      <table class="ticket-table">
        <thead>
          <tr>
            <th><input type="checkbox" @change="ticketStore.toggleSelectAll()" /></th>
            <th>Title</th>
            <th class="status-col">Status</th>
            <th class="status-col">Urgency</th>
            <th>Creator</th>
            <th>Assignee</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ticket in filteredTickets" :key="ticket.id">
            <td>
              <input
                type="checkbox"
                :checked="ticketStore.selectedTicketIds.includes(ticket.id)"
                @change="ticketStore.toggleSelectTicket(ticket.id)"
              />
            </td>
            <td>{{ ticket.title }}</td>
            <td class="status-col">
              <span 
                class="status-badge" 
                :style="{ 
                  color: getStatusColor(ticket.status),
                  backgroundColor: getStatusBgColor(ticket.status)
                }"
              >
                {{ getStatusLabel(ticket.status) }}
              </span>
            </td>
            <td class="status-col">
              <span 
                class="urgency-badge" 
                :style="{ 
                  color: getUrgencyColor(ticket.urgency),
                  backgroundColor: getUrgencyBgColor(ticket.urgency)
                }"
              >
                {{ ticket.urgency }}
              </span>
            </td>
            <td>{{ ticket.createdByName }}</td>
            <td>{{ ticket.currentAssigneeName || 'Unassigned' }}</td>
            <td>{{ formatTime(ticket.createdAt) }}</td>
            <td>
              <button @click="goToDetail(ticket.id)" class="btn btn-primary btn-sm">Details</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredTickets.length === 0" class="empty">No repairs found</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTicketStore } from '@/stores/tickets'
import { getStatusLabel, getStatusColor, getStatusBgColor, getUrgencyColor, getUrgencyBgColor } from '@/utils/ticketStateMachine'
import type { Ticket, TicketStatus } from '@/types'
import { repairsApi } from '@/services/supabaseApi'

const router = useRouter()
const ticketStore = useTicketStore()
const filterStatus = ref<TicketStatus | ''>('')
const showFilterMenu = ref(false)
const allTickets = ref<Ticket[]>([])

const statusLabels: Record<string, string> = {
  '': 'All',
  Submitted: 'Submitted',
  Accepted: 'Accepted',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  Reassigned: 'Reassigned',
  Resolved: 'Resolved',
  Closed: 'Closed',
  Canceled: 'Canceled'
}

const filterLabel = computed(() => statusLabels[filterStatus.value] || 'All')

const statusCounts = computed(() => {
  const counts = allTickets.value.reduce<Record<string, number>>((acc, ticket) => {
    const key = ticket.status
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  counts.all = allTickets.value.length
  return counts
})

const openOptions = [
  { value: 'Submitted', label: 'Submitted', color: '#60a5fa' },
  { value: 'Accepted', label: 'Accepted', color: '#818cf8' },
  { value: 'Assigned', label: 'Assigned', color: '#38bdf8' },
  { value: 'Reassigned', label: 'Reassigned', color: '#f59e0b' },
  { value: 'InProgress', label: 'In Progress', color: '#2563eb' }
]

const doneOptions = [
  { value: 'Resolved', label: 'Resolved', color: '#22c55e' },
  { value: 'Closed', label: 'Closed', color: '#16a34a' },
  { value: 'Canceled', label: 'Canceled', color: '#f56c6c' }
]

const selectStatus = (status: TicketStatus | '') => {
  filterStatus.value = status
  showFilterMenu.value = false
}

const clearFilter = () => {
  filterStatus.value = ''
  showFilterMenu.value = false
}

// Computed property to filter tickets based on selected status
const filteredTickets = computed(() => {
  if (!filterStatus.value) {
    return ticketStore.tickets
  }
  return ticketStore.tickets.filter(ticket => ticket.status === filterStatus.value)
})

const handleRefresh = () => {
  if (filterStatus.value) {
    ticketStore.fetchTickets({ status: [filterStatus.value] })
  } else {
    ticketStore.fetchTickets()
  }
  refreshCounts()
}

// Watch for filter status changes and fetch filtered tickets
watch(filterStatus, (newStatus) => {
  if (newStatus) {
    ticketStore.fetchTickets({ status: [newStatus] })
  } else {
    ticketStore.fetchTickets()
  }
})

const handleExport = async () => {
  try {
    const csv = await ticketStore.exportCSV(
      filterStatus.value ? { status: [filterStatus.value] } : undefined
    )
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `tickets-${new Date().toISOString()}.csv`
    link.click()
  } catch (error: any) {
    alert(error.message || 'Export failed')
  }
}

const goToDetail = (id: string) => {
  router.push(`/admin/tickets/${id}`)
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('en-US')
}

const refreshCounts = async () => {
  allTickets.value = await repairsApi.list()
}

onMounted(async () => {
  await ticketStore.fetchTickets()
  await refreshCounts()
})
</script>

<style scoped>
.ticket-list {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h2 {
  margin-bottom: 6px;
  color: #0f1b3d;
}

.subtitle {
  color: #5f6b8a;
  font-size: 14px;
}

.filters {
  display: flex;
  gap: 12px;
  align-items: center;
}

.status-filter {
  position: relative;
}

.status-button {
  border: 1px solid rgba(15, 27, 61, 0.15);
  background: rgba(255, 255, 255, 0.9);
  color: #0f1b3d;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
  cursor: pointer;
  box-shadow: 0 6px 14px rgba(15, 27, 61, 0.12);
}

.clear-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
  font-weight: 700;
  font-size: 12px;
}

.status-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border-radius: 12px;
  padding: 10px;
  min-width: 220px;
  box-shadow: 0 18px 36px rgba(15, 27, 61, 0.18);
  border: 1px solid rgba(15, 27, 61, 0.08);
  z-index: 10;
}

.status-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 2px;
}

.status-group + .status-group {
  border-top: 1px solid rgba(15, 27, 61, 0.08);
  margin-top: 6px;
}

.status-group-title {
  font-size: 12px;
  color: #5f6b8a;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.status-option {
  border: none;
  background: transparent;
  text-align: left;
  display: grid;
  grid-template-columns: 12px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #0f1b3d;
}

.status-option:hover {
  background: rgba(15, 27, 61, 0.05);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-count {
  font-size: 12px;
  color: #5f6b8a;
  background: rgba(15, 27, 61, 0.08);
  padding: 2px 8px;
  border-radius: 999px;
}

.all-option {
  margin-bottom: 6px;
}

.table-container {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 12px 26px rgba(15, 27, 61, 0.1);
  border: 1px solid rgba(39, 83, 231, 0.08);
}

.ticket-table {
  width: 100%;
  border-collapse: collapse;
}

.ticket-table th,
.ticket-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ebeef5;
  vertical-align: middle;
}

.ticket-table th {
  background-color: rgba(15, 27, 61, 0.05);
  font-weight: 600;
  color: #5f6b8a;
}

.ticket-table tbody tr:hover {
  background-color: rgba(15, 27, 61, 0.04);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.status-badge,
.urgency-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  text-align: center;
}

.status-col {
  text-align: center;
}

.empty {
  text-align: center;
  padding: 40px;
  color: #5f6b8a;
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters {
    width: 100%;
    flex-wrap: wrap;
  }

  .filters .select {
    width: 100%;
  }

  .table-container {
    overflow-x: auto;
  }
}
</style>
