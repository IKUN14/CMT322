<template>
  <div class="dashboard">
    <h2>Dashboard</h2>
    <div v-if="isWorker || isAdmin" class="dashboard-shell">
      <div class="kpi-cards">
        <div class="kpi-card" v-for="(value, key) in kpiData" :key="key">
          <div class="kpi-label">{{ getKpiLabel(key) }}</div>
          <div class="kpi-value">{{ formatKpiValue(key, value) }}</div>
          <div class="kpi-sub">{{ getKpiSubtext(key) }}</div>
        </div>
      </div>
      <div class="dashboard-grid">
        <div class="dashboard-column">
          <section class="panel">
            <div class="panel-header">
              <h3>Repair Trend</h3>
              <span class="panel-sub">Last {{ trendDays }} days</span>
            </div>
            <div class="trend-chart">
              <svg :viewBox="`0 0 ${trendWidth} ${trendHeight}`" role="img" aria-label="Repair trend chart">
                <polyline
                  :points="trendPoints"
                  fill="none"
                  stroke="#2753e7"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <circle
                  v-for="(point, index) in trendPointList"
                  :key="index"
                  :cx="point.x"
                  :cy="point.y"
                  r="4"
                  fill="#2753e7"
                />
              </svg>
              <div class="trend-labels">
                <span v-for="label in trendLabels" :key="label">{{ label }}</span>
              </div>
            </div>
          </section>
          <section class="panel">
            <div class="panel-header">
              <h3>Status Breakdown</h3>
              <span class="panel-sub">{{ isAdmin ? 'Submitted to resolved' : 'Assigned vs progress' }}</span>
            </div>
            <div class="breakdown-list">
              <div class="breakdown-row">
                <span>{{ isAdmin ? 'Submitted' : 'Pending' }}</span>
                <div class="breakdown-bar">
                  <div class="breakdown-fill" :style="{ width: breakdown.pending + '%' }"></div>
                </div>
                <strong>{{ counts.pending }}</strong>
              </div>
              <div class="breakdown-row">
                <span>In Progress</span>
                <div class="breakdown-bar">
                  <div class="breakdown-fill in-progress" :style="{ width: breakdown.inProgress + '%' }"></div>
                </div>
                <strong>{{ counts.inProgress }}</strong>
              </div>
              <div class="breakdown-row">
                <span>Resolved</span>
                <div class="breakdown-bar">
                  <div class="breakdown-fill resolved" :style="{ width: breakdown.resolved + '%' }"></div>
                </div>
                <strong>{{ counts.resolved }}</strong>
              </div>
            </div>
          </section>
          <section class="panel">
            <div class="panel-header">
              <h3>Top Locations</h3>
              <span class="panel-sub">Most active areas</span>
            </div>
            <ul class="location-list">
              <li v-for="item in topLocations" :key="item.name">
                <span>{{ item.name }}</span>
                <strong>{{ item.count }}</strong>
              </li>
              <li v-if="topLocations.length === 0" class="empty-text">No location data yet.</li>
            </ul>
          </section>
        </div>
        <div class="dashboard-column">
          <section class="panel queue-panel">
            <div class="panel-header">
              <h3>My Queue</h3>
              <span class="panel-sub">Tasks needing attention</span>
            </div>
            <div v-if="queueItems.length === 0" class="empty-text">No urgent tasks right now.</div>
            <div v-else class="queue-list">
              <button
                v-for="item in queueItems"
                :key="item.id"
                class="queue-item"
                @click="openTicket(item.id)"
              >
                <div class="queue-main">
                  <div>
                    <h4>{{ item.title }}</h4>
                    <p>{{ item.location }}</p>
                  </div>
                  <span class="urgency-pill" :class="item.urgencyClass">{{ item.urgency }}</span>
                </div>
                <div class="queue-meta">
                  <span>{{ item.waiting }}</span>
                  <span class="queue-status">{{ item.statusLabel }}</span>
                </div>
                <div class="queue-actions" @click.stop>
                  <button
                    v-if="item.canStart"
                    class="btn btn-primary btn-sm"
                    @click="startTicket(item.id)"
                  >
                    Start
                  </button>
                  <button
                    v-if="item.canUpdate"
                    class="btn btn-secondary btn-sm"
                    @click="openTicket(item.id)"
                  >
                    Update
                  </button>
                  <button
                    v-if="item.canResolve"
                    class="btn btn-success btn-sm"
                    @click="resolveTicket(item.id)"
                  >
                    Resolve
                  </button>
                  <button
                    v-if="item.canReview"
                    class="btn btn-primary btn-sm"
                    @click="openTicket(item.id)"
                  >
                    Details
                  </button>
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
    <div v-else class="student-dashboard">
      <div class="kpi-cards">
        <div class="kpi-card" v-for="(value, key) in kpiData" :key="key">
          <div class="kpi-label">{{ getKpiLabel(key) }}</div>
          <div class="kpi-value">{{ formatKpiValue(key, value) }}</div>
        </div>
      </div>
      <section class="panel recent-panel">
        <div class="panel-header">
          <h3>Recent Repairs</h3>
          <span class="panel-sub">Latest 3 submissions</span>
        </div>
        <div v-if="recentRepairs.length === 0" class="empty-text">No repairs yet.</div>
        <div v-else class="recent-list">
          <button
            v-for="ticket in recentRepairs"
            :key="ticket.id"
            class="recent-item"
            @click="openStudentTicket(ticket.id)"
          >
            <div class="recent-main">
              <div>
                <h4>{{ ticket.title }}</h4>
                <p>{{ ticket.location }}</p>
              </div>
              <span class="status-pill" :class="statusClass(ticket.status)">{{ ticket.status }}</span>
            </div>
            <div class="recent-meta">
              <span class="urgency-pill" :class="`urgency-${ticket.urgency.toLowerCase()}`">
                {{ ticket.urgency }}
              </span>
              <span>{{ formatDate(ticket.createdAt) }}</span>
            </div>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTicketStore } from '@/stores/tickets'
import { useKpiStore } from '@/stores/kpi'
import type { KPI, Ticket } from '@/types'
import { TicketStatus } from '@/types'
import { repairsApi } from '@/services/supabaseApi'

const router = useRouter()
const authStore = useAuthStore()
const ticketStore = useTicketStore()
const kpiStore = useKpiStore()
const kpiData = ref<Partial<KPI>>({})
const dashboardTickets = ref<Ticket[]>([])
const trendDays = 7
const trendWidth = 360
const trendHeight = 120

const getKpiLabel = (key: string) => {
  const labels: Record<string, string> = {
    totalTickets: 'Total Repairs',
    pendingTickets: 'Pending',
    inProgressTickets: 'In Progress',
    resolvedTickets: 'Resolved',
    avgResolutionTime: 'Avg Resolution Time (hours)',
    urgentTickets: 'Urgent Repairs',
    total_repairs: 'Total Repairs',
    pending_count: 'Pending',
    in_progress_count: 'In Progress',
    resolved_count: 'Resolved',
    urgent_repairs_count: 'Urgent Repairs',
    avg_resolution_time_hours: 'Avg Resolution Time (hours)'
  }
  return labels[key] || key
}

const getKpiSubtext = (key: string) => {
  const subs: Record<string, string> = {
    totalTickets: subtextValues.value.total,
    pendingTickets: subtextValues.value.slaRisk,
    inProgressTickets: subtextValues.value.active,
    resolvedTickets: subtextValues.value.completedToday,
    avgResolutionTime: subtextValues.value.avgResolution,
    urgentTickets: subtextValues.value.needsAttention,
    total_repairs: subtextValues.value.total,
    pending_count: subtextValues.value.slaRisk,
    in_progress_count: subtextValues.value.active,
    resolved_count: subtextValues.value.completedToday,
    urgent_repairs_count: subtextValues.value.needsAttention,
    avg_resolution_time_hours: subtextValues.value.avgResolution
  }
  return subs[key] || '—'
}

const formatKpiValue = (key: string, value: unknown) => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(numericValue)) {
    return value ?? '-'
  }
  if (key === 'avgResolutionTime' || key === 'avg_resolution_time_hours') {
    return numericValue.toFixed(2)
  }
  return numericValue
}

const isWorker = computed(() => authStore.isWorker)
const isAdmin = computed(() => authStore.isAdmin)

const subtextValues = computed(() => {
  if (!dashboardTickets.value.length) {
    return {
      total: 'vs last week: 0',
      slaRisk: 'SLA at risk: 0',
      active: 'Active tasks: 0',
      completedToday: 'Completed today: 0',
      needsAttention: 'Needs attention: 0',
      avgResolution: 'Last 7d avg: -'
    }
  }

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000
  const weekMs = 7 * dayMs
  const startThisWeek = now - weekMs
  const startLastWeek = now - weekMs * 2
  const startToday = new Date()
  startToday.setHours(0, 0, 0, 0)
  const startTodayMs = startToday.getTime()

  const createdThisWeek = dashboardTickets.value.filter(t => new Date(t.createdAt).getTime() >= startThisWeek)
  const createdLastWeek = dashboardTickets.value.filter(t => {
    const created = new Date(t.createdAt).getTime()
    return created >= startLastWeek && created < startThisWeek
  })
  const totalDiff = createdThisWeek.length - createdLastWeek.length
  const totalText = `vs last week: ${totalDiff >= 0 ? '+' : ''}${totalDiff}`

  const slaRiskCount = dashboardTickets.value.filter(t => {
    if (isAdmin.value) {
      if (t.status !== TicketStatus.Submitted) return false
    } else if (t.status !== TicketStatus.Assigned) {
      return false
    }
    const created = new Date(t.createdAt).getTime()
    return now - created > dayMs
  }).length

  const activeCount = dashboardTickets.value.filter(t => t.status === TicketStatus.InProgress).length

  const completedTodayCount = dashboardTickets.value.filter(t => {
    const completedAt = t.resolvedAt || t.closedAt || t.updatedAt
    return completedAt ? new Date(completedAt).getTime() >= startTodayMs : false
  }).length

  const needsAttentionCount = dashboardTickets.value.filter(t => {
    return (t.urgency === 'Urgent' || t.urgency === 'Emergency') &&
      (t.status === TicketStatus.Assigned || t.status === TicketStatus.InProgress || t.status === TicketStatus.Submitted)
  }).length

  const recentResolved = dashboardTickets.value.filter(t => {
    const completedAt = t.resolvedAt || t.closedAt
    return completedAt ? new Date(completedAt).getTime() >= startThisWeek : false
  })
  const avgHours = recentResolved.length
    ? recentResolved.reduce((sum, t) => {
        const completedAt = new Date(t.resolvedAt || t.closedAt || t.updatedAt).getTime()
        const createdAt = new Date(t.createdAt).getTime()
        return sum + Math.max((completedAt - createdAt) / dayMs * 24, 0)
      }, 0) / recentResolved.length
    : null

  return {
    total: totalText,
    slaRisk: `SLA at risk: ${slaRiskCount}`,
    active: `Active tasks: ${activeCount}`,
    completedToday: `Completed today: ${completedTodayCount}`,
    needsAttention: `Needs attention: ${needsAttentionCount}`,
    avgResolution: avgHours === null ? 'Last 7d avg: -' : `Last 7d avg: ${avgHours.toFixed(1)}h`
  }
})

const counts = computed(() => {
  return dashboardTickets.value.reduce(
    (acc, ticket) => {
      if (ticket.status === TicketStatus.Assigned || ticket.status === TicketStatus.Submitted) acc.pending += 1
      if (ticket.status === TicketStatus.InProgress) acc.inProgress += 1
      if (ticket.status === TicketStatus.Resolved || ticket.status === TicketStatus.Closed) acc.resolved += 1
      return acc
    },
    { pending: 0, inProgress: 0, resolved: 0 }
  )
})

const breakdown = computed(() => {
  const total = counts.value.pending + counts.value.inProgress + counts.value.resolved || 1
  return {
    pending: Math.round((counts.value.pending / total) * 100),
    inProgress: Math.round((counts.value.inProgress / total) * 100),
    resolved: Math.round((counts.value.resolved / total) * 100)
  }
})

const trendData = computed(() => {
  const days = Array.from({ length: trendDays }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (trendDays - 1 - i))
    return { date, count: 0 }
  })
  dashboardTickets.value.forEach(ticket => {
    const date = new Date(ticket.createdAt)
    const key = date.toDateString()
    const bucket = days.find(d => d.date.toDateString() === key)
    if (bucket) bucket.count += 1
  })
  return days
})

const trendMax = computed(() => Math.max(...trendData.value.map(d => d.count), 1))
const trendPointList = computed(() => {
  const padding = 8
  const width = trendWidth - padding * 2
  const height = trendHeight - padding * 2
  return trendData.value.map((point, index) => {
    const x = padding + (width / (trendDays - 1)) * index
    const y = padding + height - (point.count / trendMax.value) * height
    return { x, y }
  })
})

const trendPoints = computed(() => trendPointList.value.map(p => `${p.x},${p.y}`).join(' '))
const trendLabels = computed(() =>
  trendData.value.map(point => `${point.date.getMonth() + 1}/${point.date.getDate()}`)
)

const topLocations = computed(() => {
  const counts = dashboardTickets.value.reduce<Record<string, number>>((acc, ticket) => {
    const key = ticket.location.trim() || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))
})

const queueItems = computed(() => {
  return dashboardTickets.value
    .filter(ticket => {
      if (isAdmin.value) {
        return (
          ticket.status === TicketStatus.Submitted ||
          ticket.status === TicketStatus.Assigned ||
          ticket.status === TicketStatus.InProgress
        )
      }
      return ticket.status === TicketStatus.Assigned || ticket.status === TicketStatus.InProgress
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 5)
    .map(ticket => {
      const waiting = formatWaiting(ticket.createdAt)
      const statusLabel = ticket.status === TicketStatus.Submitted ? 'Submitted' : ticket.status === TicketStatus.Assigned ? 'Pending' : 'In Progress'
      return {
        id: ticket.id,
        title: ticket.title,
        location: ticket.location,
        urgency: ticket.urgency,
        urgencyClass: `urgency-${ticket.urgency.toLowerCase()}`,
        waiting,
        statusLabel,
        canStart: !isAdmin.value && ticket.status === TicketStatus.Assigned,
        canUpdate: !isAdmin.value && ticket.status === TicketStatus.InProgress,
        canResolve: !isAdmin.value && ticket.status === TicketStatus.InProgress,
        canReview: isAdmin.value
      }
    })
})

const recentRepairs = computed(() => {
  return [...dashboardTickets.value]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
})

const formatWaiting = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime()
  const hours = Math.max(Math.floor(diff / (1000 * 60 * 60)), 0)
  if (hours < 1) return 'Waiting <1h'
  if (hours < 24) return `Waiting ${hours}h`
  const days = Math.floor(hours / 24)
  return `Waiting ${days}d`
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

const statusClass = (status: string) => {
  const normalized = status.toLowerCase()
  return `status-${normalized}`
}

const openStudentTicket = (id: string) => {
  router.push(`/student/tickets/${id}`)
}

const openTicket = (id: string) => {
  if (isAdmin.value) {
    router.push(`/admin/tickets/${id}`)
    return
  }
  router.push(`/worker/tickets/${id}`)
}

const startTicket = async (id: string) => {
  await ticketStore.updateTicketStatus({ ticketId: id, status: TicketStatus.InProgress })
  await refreshDashboardTickets()
}

const resolveTicket = async (id: string) => {
  await ticketStore.updateTicketStatus({ ticketId: id, status: TicketStatus.Resolved })
  await refreshDashboardTickets()
}

const refreshDashboardTickets = async () => {
  if (!authStore.user) {
    await authStore.fetchCurrentUser()
  }
  const all = await repairsApi.list()
  dashboardTickets.value = isWorker.value
    ? all.filter(ticket => ticket.currentAssignee === authStore.user?.id)
    : all
}

onMounted(async () => {
  try {
    await kpiStore.fetchKPI()
    if (kpiStore.kpi) {
      kpiData.value = kpiStore.kpi
    }
    if (isWorker.value || isAdmin.value) {
      await refreshDashboardTickets()
    } else {
      await refreshDashboardTickets()
    }
  } catch (error) {
    console.error('Failed to load KPI:', error)
  }
})
</script>

<style scoped>
.dashboard {
  padding: 24px 10px;
}

.dashboard h2 {
  margin-bottom: 20px;
  color: #0f1b3d;
  font-size: 28px;
  letter-spacing: -0.6px;
}

.dashboard-shell {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.student-dashboard {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.kpi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

.kpi-card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 10px 24px rgba(15, 27, 61, 0.12);
  border: 1px solid rgba(39, 83, 231, 0.08);
}

.kpi-label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #5f6b8a;
  margin-bottom: 10px;
}

.kpi-value {
  font-size: 30px;
  font-weight: 700;
  color: #0f1b3d;
}

.kpi-sub {
  font-size: 12px;
  color: #5f6b8a;
  margin-top: 6px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 18px;
}

.dashboard-column {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 10px 24px rgba(15, 27, 61, 0.12);
  border: 1px solid rgba(39, 83, 231, 0.08);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}

.panel-header h3 {
  margin: 0;
  color: #0f1b3d;
}

.panel-sub {
  font-size: 12px;
  color: #5f6b8a;
}

.trend-chart svg {
  width: 100%;
  height: 120px;
}

.trend-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 11px;
  color: #5f6b8a;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.breakdown-row {
  display: grid;
  grid-template-columns: 100px 1fr 40px;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #0f1b3d;
}

.breakdown-bar {
  height: 8px;
  border-radius: 999px;
  background: rgba(15, 27, 61, 0.08);
  overflow: hidden;
}

.breakdown-fill {
  height: 100%;
  background: #60a5fa;
  border-radius: 999px;
}

.breakdown-fill.in-progress {
  background: #2563eb;
}

.breakdown-fill.resolved {
  background: #22c55e;
}

.location-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.location-list li {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #0f1b3d;
}

.queue-panel {
  min-height: 320px;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-panel {
  min-height: 260px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-item {
  border: 1px solid rgba(39, 83, 231, 0.08);
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.recent-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 27, 61, 0.12);
}

.recent-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recent-main h4 {
  margin: 0;
  font-size: 16px;
  color: #0f1b3d;
}

.recent-main p {
  margin: 4px 0 0;
  color: #5f6b8a;
  font-size: 13px;
}

.recent-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #5f6b8a;
}

.status-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.status-submitted {
  background: rgba(39, 83, 231, 0.12);
  color: #2753e7;
}

.status-accepted,
.status-assigned,
.status-reassigned {
  background: rgba(255, 168, 0, 0.16);
  color: #b45b00;
}

.status-in_progress {
  background: rgba(28, 122, 255, 0.16);
  color: #1c7aff;
}

.status-resolved,
.status-closed {
  background: rgba(30, 181, 80, 0.16);
  color: #1e8f4c;
}

.urgency-pill {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.urgency-normal {
  background: rgba(96, 106, 135, 0.12);
  color: #5f6b8a;
}

.urgency-urgent {
  background: rgba(255, 140, 0, 0.16);
  color: #c46200;
}

.urgency-emergency {
  background: rgba(231, 76, 60, 0.16);
  color: #c0392b;
}

.queue-item {
  border: 1px solid rgba(15, 27, 61, 0.08);
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(15, 27, 61, 0.03);
  text-align: left;
  cursor: pointer;
}

.queue-main {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.queue-main h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  color: #0f1b3d;
}

.queue-main p {
  margin: 0;
  font-size: 12px;
  color: #5f6b8a;
}

.queue-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #5f6b8a;
}

.queue-status {
  font-weight: 600;
  color: #2753e7;
}

.queue-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.urgency-pill {
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  padding: 4px 10px;
  background: rgba(15, 27, 61, 0.08);
}

.urgency-urgent {
  background: rgba(251, 146, 60, 0.2);
  color: #f97316;
}

.urgency-emergency {
  background: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}

.urgency-normal {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.empty-text {
  font-size: 13px;
  color: #5f6b8a;
}

.btn-secondary {
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
