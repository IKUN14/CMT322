<template>
  <div class="ticket-list">
    <div class="page-header">
      <div>
        <h2>My Repairs</h2>
        <p class="subtitle">Track your requests and latest progress</p>
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
      </div>
    </div>
    <div v-if="ticketStore.loading" class="loading">Loading...</div>
    <div v-else class="ticket-items">
      <div
        v-for="ticket in ticketStore.tickets"
        :key="ticket.id"
        class="ticket-item"
        @click="goToDetail(ticket.id)"
      >
        <div class="ticket-header">
          <h3>{{ ticket.title }}</h3>
          <span 
            class="status-badge" 
            :style="{ 
              color: getStatusColor(ticket.status),
              backgroundColor: getStatusBgColor(ticket.status)
            }"
          >
            {{ getStatusLabel(ticket.status) }}
          </span>
        </div>
        <div class="ticket-info">
          <span>Location: {{ ticket.location }}</span>
          <span>
            Urgency: 
            <span 
              class="urgency-badge" 
              :style="{ 
                color: getUrgencyColor(ticket.urgency),
                backgroundColor: getUrgencyBgColor(ticket.urgency)
              }"
            >
              {{ ticket.urgency }}
            </span>
          </span>
          <span class="created-at">Created: {{ formatTime(ticket.createdAt) }}</span>
          <span
            v-if="ticket.status === 'Canceled' && ticket.statusReason"
            class="cancel-reason"
          >
            Reason: {{ ticket.statusReason }}
          </span>
        </div>
      </div>
      <div v-if="ticketStore.tickets.length === 0" class="empty">
        No repairs found
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTicketStore } from '@/stores/tickets'
import { getStatusLabel, getStatusColor, getStatusBgColor, getUrgencyColor, getUrgencyBgColor } from '@/utils/ticketStateMachine'
import { TicketStatus, type Ticket } from '@/types'
import { repairsApi } from '@/services/supabaseApi'

const router = useRouter()
const ticketStore = useTicketStore()
const filterStatus = ref<TicketStatus | ''>('')
const showFilterMenu = ref(false)
const allTickets = ref<Ticket[]>([])

const statusLabels: Record<string, string> = {
  '': 'All',
  Submitted: 'Submitted',
  InProgress: 'In Progress',
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
  { value: TicketStatus.Submitted, label: 'Submitted', color: '#60a5fa' },
  { value: TicketStatus.InProgress, label: 'In Progress', color: '#2563eb' }
]

const doneOptions = [
  { value: TicketStatus.Resolved, label: 'Resolved', color: '#22c55e' },
  { value: TicketStatus.Closed, label: 'Closed', color: '#16a34a' },
  { value: TicketStatus.Canceled, label: 'Canceled', color: '#f56c6c' }
]

const selectStatus = (status: TicketStatus | '') => {
  filterStatus.value = status
  showFilterMenu.value = false
}

const clearFilter = () => {
  filterStatus.value = ''
  showFilterMenu.value = false
}

const applyFilter = async () => {
  await ticketStore.fetchTickets(
    filterStatus.value ? { status: [filterStatus.value as TicketStatus] } : undefined
  )
}

const handleRefresh = async () => {
  await refreshCounts()
  await applyFilter()
}

const goToDetail = (id: string) => {
  router.push(`/student/tickets/${id}`)
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const refreshCounts = async () => {
  try {
    allTickets.value = await repairsApi.list()
  } catch (err) {
    console.warn('Failed to refresh status counts, falling back to visible list.', err)
    allTickets.value = [...ticketStore.tickets]
  }
}

watch(filterStatus, () => {
  applyFilter()
})

onMounted(async () => {
  await refreshCounts()
  await applyFilter()
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

.all-option {
  margin-bottom: 6px;
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

.ticket-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ticket-item {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 10px 24px rgba(15, 27, 61, 0.08);
  border: 1px solid rgba(39, 83, 231, 0.08);
  cursor: pointer;
  transition: box-shadow 0.3s;
}

.ticket-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ticket-header h3 {
  font-size: 16px;
  color: #0f1b3d;
  margin: 0;
}

.status-badge {
  font-size: 12px;
  font-weight: 600;
}

.ticket-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 20px;
  font-size: 14px;
  color: #5f6b8a;
  align-items: center;
}

.created-at {
  margin-left: auto;
  text-align: right;
}

.cancel-reason {
  flex-basis: 100%;
  color: #ef4444;
  font-weight: 500;
}

.loading,
.empty {
  text-align: center;
  padding: 40px;
  color: #5f6b8a;
}

@media (max-width: 720px) {
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
}
</style>
