<template>
  <div class="dashboard">
    <h2>Dashboard</h2>
    <div class="kpi-cards">
      <div class="kpi-card" v-for="(value, key) in kpiData" :key="key">
        <div class="kpi-label">{{ getKpiLabel(key) }}</div>
        <div class="kpi-value">{{ value }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useKpiStore } from '@/stores/kpi'
import { useAuthStore } from '@/stores/auth'
import type { KPI } from '@/types'

const kpiStore = useKpiStore()
const authStore = useAuthStore()
const kpiData = ref<Partial<KPI>>({})

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

onMounted(async () => {
  try {
    await kpiStore.fetchKPI()
    if (kpiStore.kpi) {
      kpiData.value = kpiStore.kpi
    }
  } catch (error) {
    console.error('Failed to load KPI:', error)
  }
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.dashboard h2 {
  margin-bottom: 20px;
  color: #303133;
}

.kpi-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.kpi-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.kpi-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}
</style>
