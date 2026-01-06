<template>
  <div class="ticket-detail">
    <div v-if="ticketStore.loading" class="loading">Loading...</div>
    <div v-else-if="ticketStore.currentTicket" class="detail-content">
      <div class="card">
        <h2>{{ ticketStore.currentTicket.title }}</h2>
        <div class="detail-info">
          <p><strong>Description:</strong>{{ ticketStore.currentTicket.description }}</p>
          <p>
            <strong>Status:</strong>
            <span 
              class="status-badge" 
              :style="{ 
                color: getStatusColor(ticketStore.currentTicket.status),
                backgroundColor: getStatusBgColor(ticketStore.currentTicket.status)
              }"
            >
              {{ getStatusLabel(ticketStore.currentTicket.status) }}
            </span>
          </p>
          <p><strong>Location:</strong>{{ ticketStore.currentTicket.location }}</p>
          <p><strong>Urgency:</strong>{{ ticketStore.currentTicket.urgency }}</p>
          <p v-if="ticketStore.currentTicket.currentAssigneeName">
            <strong>Current Assignee:</strong>{{ ticketStore.currentTicket.currentAssigneeName }}
          </p>
        </div>
        <div class="actions">
          <button 
            v-if="canAssign" 
            @click="showAssignDialog = true" 
            class="btn btn-primary"
          >
            {{ ticketStore.currentTicket?.currentAssignee ? 'Reassign' : 'Assign' }}
          </button>
          <button 
            v-if="canAccept" 
            @click="handleAccept" 
            class="btn btn-success"
          >
            Accept
          </button>
          <button
            v-if="canReject"
            @click="openRejectDialog"
            class="btn btn-danger"
          >
            Reject
          </button>
        </div>
      </div>
      <div v-if="ticketStore.currentTicket.images && ticketStore.currentTicket.images.length > 0" class="card">
        <h3>Repair Images</h3>
        <div class="report-images">
          <img
            v-for="(img, index) in ticketStore.currentTicket.images"
            :key="index"
            :src="img"
            alt="Repair image"
            @click="openImagePreview(ticketStore.currentTicket.images, index)"
          />
        </div>
      </div>
      <TicketStatusTimeline :status-history="ticketStore.currentTicket.statusHistory" />
      
      <!-- Repair Report Section -->
      <div v-if="ticketStore.currentTicket.report || (ticketStore.currentTicket.reportImages && ticketStore.currentTicket.reportImages.length > 0)" class="card">
        <div class="report-header">
          <h3>Repair Report</h3>
          <span v-if="ticketStore.currentTicket.resolvedAt" class="report-time">
            Completed: {{ formatTime(ticketStore.currentTicket.resolvedAt) }}
          </span>
        </div>
        <div v-if="ticketStore.currentTicket.currentAssigneeName" class="report-meta">
          <span class="report-worker">Repaired by: {{ ticketStore.currentTicket.currentAssigneeName }}</span>
        </div>
        <div v-if="ticketStore.currentTicket.report" class="report-content">
          {{ ticketStore.currentTicket.report }}
        </div>
        <div v-if="ticketStore.currentTicket.reportImages && ticketStore.currentTicket.reportImages.length > 0" class="report-images">
          <img 
            v-for="(img, index) in ticketStore.currentTicket.reportImages" 
            :key="index" 
            :src="img" 
            alt="Repair report image"
            @click="openImagePreview(ticketStore.currentTicket.reportImages, index)"
          />
        </div>
      </div>
      
      <!-- Feedback Section -->
      <div class="card">
        <div class="feedback-header">
          <h3>Feedback</h3>
        </div>
        
        <div v-if="feedbackStore.feedbacks.length === 0" class="empty-feedback">
          No feedback yet
        </div>
        <div v-else class="feedback-list">
          <div v-for="feedback in feedbackStore.feedbacks" :key="feedback.id" class="feedback-item">
            <div class="feedback-meta">
              <span class="feedback-user">{{ feedback.userName }}</span>
              <span class="feedback-time">{{ formatTime(feedback.createdAt) }}</span>
              <span v-if="feedback.rating" class="feedback-rating">
                ⭐ {{ feedback.rating }}/5
              </span>
            </div>
            <div class="feedback-content">{{ feedback.content }}</div>
            <div v-if="feedback.images && feedback.images.length > 0" class="feedback-images">
              <img 
                v-for="(img, index) in feedback.images" 
                :key="index" 
                :src="img" 
                alt="Feedback image"
                @click="openImagePreview(feedback.images, index)"
              />
            </div>
          </div>
        </div>
      </div>
      
      <!-- Assign Dialog -->
      <div v-if="showAssignDialog" class="dialog-overlay" @click="showAssignDialog = false">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>{{ ticketStore.currentTicket?.currentAssignee ? 'Reassign Repair' : 'Assign Repair' }}</h3>
            <button @click="showAssignDialog = false" class="close-btn">×</button>
          </div>
          <form @submit.prevent="handleAssign" class="dialog-body">
            <div class="form-group">
              <label>Select Worker *</label>
              <select v-model="assignForm.workerId" class="select" required>
                <option value="">Please select a worker</option>
                <option 
                  v-for="worker in availableWorkers" 
                  :key="worker.id" 
                  :value="worker.id"
                >
                  {{ worker.name }} - {{ worker.department }} - {{ worker.status === 'available' ? 'Available' : worker.status === 'busy' ? 'Busy' : 'Offline' }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Assignment Reason (Optional)</label>
              <textarea
                v-model="assignForm.reason"
                class="textarea"
                placeholder="Please enter assignment reason"
                rows="3"
              ></textarea>
            </div>
            <div class="dialog-actions">
              <button type="submit" class="btn btn-primary" :disabled="assigning">
                {{ assigning ? 'Submitting...' : 'Confirm Assignment' }}
              </button>
              <button type="button" @click="showAssignDialog = false" class="btn">Cancel</button>
            </div>
            <div v-if="assignError" class="error-message">{{ assignError }}</div>
          </form>
        </div>
      </div>

      <!-- Reject Dialog -->
      <div v-if="showRejectDialog" class="dialog-overlay" @click="closeRejectDialog">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>Reject Repair Request</h3>
            <button @click="closeRejectDialog" class="close-btn">×</button>
          </div>
          <form @submit.prevent="handleReject" class="dialog-body">
            <div class="form-group">
              <label>Rejection Reason *</label>
              <textarea
                v-model="rejectReason"                class="textarea"
                placeholder="Please enter the reason for rejection"
                rows="4"
                required
              ></textarea>
            </div>
            <div class="dialog-actions">
              <button type="submit" class="btn btn-danger" :disabled="rejecting">
                {{ rejecting ? 'Submitting...' : 'Confirm Rejection' }}
              </button>
              <button type="button" @click="closeRejectDialog" class="btn">Cancel</button>
            </div>
            <div v-if="rejectError" class="error-message">{{ rejectError }}</div>
          </form>
        </div>
      </div>
      
      <!-- Image Preview -->
      <ImagePreview
        v-model:show="showImagePreview"
        :image-list="previewImageList"
        :initial-index="previewImageIndex"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTicketStore } from '@/stores/tickets'
import { useWorkerStore } from '@/stores/workers'
import { useFeedbackStore } from '@/stores/feedback'
import { getStatusLabel, getStatusColor, getStatusBgColor } from '@/utils/ticketStateMachine'
import { TicketStatus } from '@/types'
import TicketStatusTimeline from '@/components/TicketStatusTimeline.vue'
import ImagePreview from '@/components/ImagePreview.vue'

const route = useRoute()
const ticketStore = useTicketStore()
const workerStore = useWorkerStore()
const feedbackStore = useFeedbackStore()
const showAssignDialog = ref(false)
const assigning = ref(false)
const assignError = ref('')
const showRejectDialog = ref(false)
const rejectReason = ref('')
const rejectError = ref('')
const rejecting = ref(false)
const showImagePreview = ref(false)
const previewImageList = ref<string[]>([])
const previewImageIndex = ref(0)

const assignForm = ref({
  workerId: '',
  reason: ''
})

const availableWorkers = computed(() => {
  return workerStore.workers.filter(w => w.status === 'available' || w.status === 'busy')
})

const canAssign = computed(() => {
  const ticket = ticketStore.currentTicket
  if (!ticket) return false
  return ticket.status === TicketStatus.Accepted || 
         ticket.status === TicketStatus.Assigned || 
         ticket.status === TicketStatus.Reassigned
})

const canAccept = computed(() => {
  const ticket = ticketStore.currentTicket
  if (!ticket) return false
  return ticket.status === TicketStatus.Submitted
})

const canReject = computed(() => {
  const ticket = ticketStore.currentTicket
  if (!ticket) return false
  return ticket.status === TicketStatus.Submitted
})

const handleAccept = async () => {
  if (!ticketStore.currentTicket) return
  
  try {
    const ticketId = ticketStore.currentTicket.id
    await ticketStore.updateTicketStatus({
      ticketId,
      status: TicketStatus.Accepted
    })
    alert('Repair request accepted')
    // Refresh ticket data to ensure button state updates correctly
    await ticketStore.fetchTicket(ticketId)
  } catch (error: any) {
    alert(error.message || 'Operation failed')
  }
}

const openRejectDialog = () => {
  rejectReason.value = ''
  rejectError.value = ''
  showRejectDialog.value = true
}

const closeRejectDialog = () => {
  showRejectDialog.value = false
}

const handleReject = async () => {
  if (!ticketStore.currentTicket) return

  const reason = rejectReason.value.trim()
  if (!reason) {
    rejectError.value = 'Please enter a rejection reason'
    return
  }

  rejecting.value = true
  rejectError.value = ''
  try {
    const ticketId = ticketStore.currentTicket.id
    await ticketStore.updateTicketStatus({
      ticketId,
      status: TicketStatus.Canceled,
      reason
    })
    alert('Repair request rejected')
    showRejectDialog.value = false
    await ticketStore.fetchTicket(ticketId)
  } catch (error: any) {
    rejectError.value = error.message || 'Operation failed'
  } finally {
    rejecting.value = false
  }
}

const handleAssign = async () => {
  if (!ticketStore.currentTicket) return

  assigning.value = true
  assignError.value = ''
  
  try {
    const ticketId = ticketStore.currentTicket.id
    const isReassign = ticketStore.currentTicket.currentAssignee
    if (isReassign) {
      await ticketStore.reassignTicket({
        ticketId,
        workerId: assignForm.value.workerId,
        reason: assignForm.value.reason || undefined
      })
    } else {
      await ticketStore.assignTicket({
        ticketId,
        workerId: assignForm.value.workerId,
        reason: assignForm.value.reason || undefined
      })
    }
    
    assignForm.value = { workerId: '', reason: '' }
    showAssignDialog.value = false
    alert(isReassign ? 'Reassigned successfully' : 'Assigned successfully')
    
    // Refresh ticket data to ensure status updates correctly
    await ticketStore.fetchTicket(ticketId)
  } catch (error: any) {
    assignError.value = error.message || 'Assignment failed'
  } finally {
    assigning.value = false
  }
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('en-US')
}

const openImagePreview = (images: string[], index: number) => {
  previewImageList.value = images
  previewImageIndex.value = index
  showImagePreview.value = true
}

onMounted(async () => {
  const id = route.params.id as string
  await ticketStore.fetchTicket(id)
  await workerStore.fetchWorkers()
  await feedbackStore.fetchFeedbackByTicket(id)
})
</script>

<style scoped>
.ticket-detail {
  padding: 20px;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 10px 24px rgba(15, 27, 61, 0.12);
  border: 1px solid rgba(39, 83, 231, 0.08);
}

.detail-info p {
  margin-bottom: 12px;
  color: #5f6b8a;
}

.actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

/* Dialog styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 16px 40px rgba(15, 27, 61, 0.25);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.dialog-header h3 {
  margin: 0;
  color: #0f1b3d;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #5f6b8a;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s;
}

.close-btn:hover {
  background-color: rgba(15, 27, 61, 0.06);
  color: #0f1b3d;
}

.dialog-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #5f6b8a;
  font-size: 14px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-end;
}

.error-message {
  margin-top: 12px;
  padding: 8px;
  background-color: rgba(239, 68, 68, 0.12);
  color: #dc2626;
  border-radius: 4px;
  font-size: 14px;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.feedback-header h3 {
  margin: 0;
  color: #0f1b3d;
}

.empty-feedback {
  text-align: center;
  padding: 20px;
  color: #5f6b8a;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-item {
  padding: 16px;
  background-color: rgba(15, 27, 61, 0.04);
  border-radius: 10px;
  border-left: 3px solid #2753e7;
}

.feedback-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.feedback-user {
  font-weight: 600;
  color: #0f1b3d;
}

.feedback-time {
  color: #5f6b8a;
  font-size: 14px;
}

.feedback-rating {
  color: #f59e0b;
  font-weight: 600;
}

.feedback-content {
  color: #5f6b8a;
  line-height: 1.6;
  margin-bottom: 12px;
}

.feedback-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.feedback-images img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
}

.feedback-images img {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.feedback-images img:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.report-header h3 {
  margin: 0;
  color: #0f1b3d;
}

.report-time {
  color: #5f6b8a;
  font-size: 14px;
}

.report-meta {
  margin-bottom: 16px;
}

.report-worker {
  color: #5f6b8a;
  font-size: 14px;
  font-weight: 500;
}

.report-content {
  color: #5f6b8a;
  line-height: 1.8;
  padding: 16px;
  background-color: rgba(15, 27, 61, 0.04);
  border-radius: 10px;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.report-images {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.report-images img {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #e4e7ed;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.report-images img {
  cursor: pointer;
}

.report-images img:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.status-badge {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-block;
  margin-left: 8px;
}
</style>
