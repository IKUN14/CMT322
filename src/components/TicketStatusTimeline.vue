<template>
  <div class="status-timeline">
    <h3>Status Timeline</h3>
    <div class="timeline">
      <div
        v-for="(history, index) in statusHistory"
        :key="history.id"
        class="timeline-item"
        :class="{ active: index === statusHistory.length - 1 }"
      >
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div class="timeline-status">
            <span class="status-label" :style="{ color: getStatusColor(history.toStatus) }">
              {{ getStatusLabel(history.toStatus) }}
            </span>
            <span class="timeline-time">{{ formatTime(history.changedAt) }}</span>
          </div>
          <div class="timeline-user">
            Operator: {{ history.changedByName }}
          </div>
          <div v-if="history.reason" class="timeline-reason">
            Reason: {{ history.reason }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatusHistory } from '@/types'
import { getStatusLabel, getStatusColor } from '@/utils/ticketStateMachine'

interface Props {
  statusHistory: StatusHistory[]
}

const props = defineProps<Props>()

const formatTime = (time?: string | null) => {
  if (!time) return '-'
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US')
}
</script>

<style scoped>
.status-timeline {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-timeline h3 {
  margin-bottom: 20px;
  font-size: 18px;
  color: #303133;
}

.timeline {
  position: relative;
  padding-left: 30px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #e4e7ed;
}

.timeline-item {
  position: relative;
  padding-bottom: 20px;
  padding-left: 20px;
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -22px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #c0c4cc;
  border: 2px solid white;
  box-shadow: 0 0 0 2px #e4e7ed;
}

.timeline-item.active .timeline-dot {
  background-color: #409eff;
  box-shadow: 0 0 0 2px #409eff;
}

.timeline-content {
  background-color: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
}

.timeline-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.status-label {
  font-weight: 600;
  font-size: 14px;
}

.timeline-time {
  font-size: 12px;
  color: #909399;
}

.timeline-user {
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.timeline-reason {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
