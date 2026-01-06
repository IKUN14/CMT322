<template>
  <div class="ticket-detail">
    <div v-if="ticketStore.loading" class="loading">Loading...</div>
    <div v-else-if="ticketStore.currentTicket" class="detail-content">
      <div class="card">
        <div class="detail-header">
          <h2>{{ ticketStore.currentTicket.title }}</h2>
          <span 
            class="status-badge" 
            :style="{ 
              color: getStatusColor(ticketStore.currentTicket.status),
              backgroundColor: getStatusBgColor(ticketStore.currentTicket.status)
            }"
          >
            {{ getStatusLabel(ticketStore.currentTicket.status) }}
          </span>
        </div>
        <div class="detail-info">
          <p><strong>Description:</strong>{{ ticketStore.currentTicket.description }}</p>
          <p><strong>Location:</strong>{{ ticketStore.currentTicket.location }}</p>
          <p><strong>Urgency:</strong>{{ ticketStore.currentTicket.urgency }}</p>
          <p><strong>Created At:</strong>{{ formatTime(ticketStore.currentTicket.createdAt) }}</p>
          <p v-if="ticketStore.currentTicket.currentAssigneeName">
            <strong>Assignee:</strong>{{ ticketStore.currentTicket.currentAssigneeName }}
          </p>
          <p
            v-if="ticketStore.currentTicket.status === TicketStatus.Canceled && ticketStore.currentTicket.statusReason"
          >
            <strong>Reason:</strong>{{ ticketStore.currentTicket.statusReason }}
          </p>
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

      <div v-if="canCancel" class="card">
        <h3>Request Actions</h3>
        <div class="form-actions">
          <button @click="openReasonDialog('cancel')" class="btn btn-danger">Cancel Request</button>
        </div>
      </div>
      
      <!-- Repair Report Section -->
      <div v-if="ticketStore.currentTicket.report || (ticketStore.currentTicket.reportImages && ticketStore.currentTicket.reportImages.length > 0)" class="card">
        <div class="report-header">
          <h3>Repair Report</h3>
          <span v-if="ticketStore.currentTicket.completedAt" class="report-time">
            Completed: {{ formatTime(ticketStore.currentTicket.completedAt) }}
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
      
      <!-- Acceptance -->
      <div v-if="ticketStore.currentTicket.status === TicketStatus.Resolved" class="card">
        <h3>Acceptance</h3>
        <div class="form-actions">
          <button @click="handleConfirm(true)" class="btn btn-success">Approve</button>
          <button @click="openReasonDialog('reject')" class="btn btn-danger">Reject</button>
        </div>
      </div>

      <!-- Feedback Section -->
      <div class="card">
        <div class="feedback-header">
          <h3>Feedback</h3>
          <button v-if="ticketStore.currentTicket.status === TicketStatus.Closed" 
                  @click="showFeedbackDialog = true" 
                  class="btn btn-primary btn-sm">
            Add Feedback
          </button>
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

      <!-- Feedback Dialog -->
      <div v-if="showFeedbackDialog" class="dialog-overlay" @click="showFeedbackDialog = false">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>Add Feedback</h3>
            <button @click="showFeedbackDialog = false" class="close-btn">×</button>
          </div>
          <form @submit.prevent="handleSubmitFeedback" class="dialog-body">
            <div class="form-group">
              <label>Rating</label>
              <div class="rating-input">
                <div class="rating-display">
                  <button
                    v-for="i in 5"
                    :key="i"
                    type="button"
                    @click="feedbackForm.rating = i"
                    :class="['rating-star', { active: feedbackForm.rating >= i }]"
                    :aria-pressed="feedbackForm.rating >= i"
                  >
                    ★
                  </button>
                </div>
                <span class="rating-value">{{ feedbackForm.rating }}/5</span>
              </div>
            </div>
            <div class="form-group">
              <label>Feedback Content *</label>
              <textarea
                v-model="feedbackForm.content"
                class="textarea"
                placeholder="Please enter your feedback"
                required
                rows="4"
              ></textarea>
            </div>
            <div class="form-group">
              <label>Images (Optional)</label>
              <ImageUpload v-model="feedbackForm.images" />
            </div>
            <div class="dialog-actions">
              <button type="submit" class="btn btn-primary" :disabled="submittingFeedback">
                {{ submittingFeedback ? 'Submitting...' : 'Submit' }}
              </button>
              <button type="button" @click="showFeedbackDialog = false" class="btn">Cancel</button>
            </div>
            <div v-if="feedbackError" class="error-message">{{ feedbackError }}</div>
          </form>
        </div>
      </div>

      <!-- Reason Dialog -->
      <div v-if="showReasonDialog" class="dialog-overlay" @click="closeReasonDialog">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>{{ reasonDialogTitle }}</h3>
            <button @click="closeReasonDialog" class="close-btn">×</button>
          </div>
          <form @submit.prevent="handleReasonSubmit" class="dialog-body">
            <div class="form-group">
              <label>{{ reasonDialogLabel }}</label>
              <textarea
                v-model="reasonForm.reason"
                class="textarea"
                :placeholder="reasonDialogPlaceholder"
                required
                rows="4"
              ></textarea>
            </div>
            <div class="dialog-actions">
              <button type="submit" class="btn btn-danger" :disabled="submittingReason">
                {{ submittingReason ? 'Submitting...' : reasonDialogActionLabel }}
              </button>
              <button type="button" @click="closeReasonDialog" class="btn">Cancel</button>
            </div>
            <div v-if="reasonError" class="error-message">{{ reasonError }}</div>
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
import { useFeedbackStore } from '@/stores/feedback'
import { getStatusLabel, getStatusColor, getStatusBgColor, canStudentCancel } from '@/utils/ticketStateMachine'
import { TicketStatus } from '@/types'
import TicketStatusTimeline from '@/components/TicketStatusTimeline.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import { attachmentsApi } from '@/services/supabaseApi'
import { dataUrlToFile } from '@/utils/dataUrlToFile'

const route = useRoute()
const ticketStore = useTicketStore()
const feedbackStore = useFeedbackStore()

const showFeedbackDialog = ref(false)
const submittingFeedback = ref(false)
const feedbackError = ref('')
const showReasonDialog = ref(false)
const submittingReason = ref(false)
const reasonError = ref('')
const reasonMode = ref<'cancel' | 'reject'>('cancel')
const showImagePreview = ref(false)
const previewImageList = ref<string[]>([])
const previewImageIndex = ref(0)

const feedbackForm = ref({
  content: '',
  rating: 5,
  images: [] as string[]
})

const reasonForm = ref({
  reason: ''
})

const canCancel = computed(() => {
  const ticket = ticketStore.currentTicket
  if (!ticket) return false
  return canStudentCancel(ticket.status)
})

const reasonDialogTitle = computed(() => {
  return reasonMode.value === 'cancel' ? 'Cancel Repair Request' : 'Reject Repair'
})

const reasonDialogLabel = computed(() => {
  return reasonMode.value === 'cancel' ? 'Cancellation Reason *' : 'Rejection Reason *'
})

const reasonDialogPlaceholder = computed(() => {
  return reasonMode.value === 'cancel'
    ? 'Please share why you want to cancel this request'
    : 'Please share why you are rejecting this repair'
})

const reasonDialogActionLabel = computed(() => {
  return reasonMode.value === 'cancel' ? 'Confirm Cancel' : 'Submit Rejection'
})

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('en-US')
}

const openReasonDialog = (mode: 'cancel' | 'reject') => {
  reasonMode.value = mode
  reasonForm.value.reason = ''
  reasonError.value = ''
  showReasonDialog.value = true
}

const closeReasonDialog = () => {
  showReasonDialog.value = false
}

const handleReasonSubmit = async () => {
  if (!ticketStore.currentTicket) return

  const reason = reasonForm.value.reason.trim()
  if (!reason) {
    reasonError.value = 'Please enter a reason'
    return
  }

  submittingReason.value = true
  reasonError.value = ''
  try {
    const ticketId = ticketStore.currentTicket.id
    if (reasonMode.value === 'cancel') {
      await ticketStore.updateTicketStatus({
        ticketId,
        status: TicketStatus.Canceled,
        reason
      })
      alert('Repair request canceled')
    } else {
      await ticketStore.confirmTicket({
        ticketId,
        approved: false,
        reason
      })
      alert('Rejection reason submitted')
    }
    showReasonDialog.value = false
    await ticketStore.fetchTicket(ticketId)
  } catch (error: any) {
    alert(error.message || 'Operation failed')
  } finally {
    submittingReason.value = false
  }
}

const handleConfirm = async (approved: boolean) => {
  try {
    await ticketStore.confirmTicket({
      ticketId: ticketStore.currentTicket!.id,
      approved,
      reason: undefined
    })
    alert('Approved')
    await ticketStore.fetchTicket(ticketStore.currentTicket!.id)
  } catch (error: any) {
    alert(error.message || 'Operation failed')
  }
}

const handleSubmitFeedback = async () => {
  if (!ticketStore.currentTicket) return

  if (!feedbackForm.value.rating || feedbackForm.value.rating < 1) {
    feedbackError.value = 'Please select a rating'
    return
  }

  submittingFeedback.value = true
  feedbackError.value = ''
  
  try {
    await feedbackStore.createFeedback({
      ticketId: ticketStore.currentTicket.id,
      content: feedbackForm.value.content,
      rating: feedbackForm.value.rating,
      images: feedbackForm.value.images.length > 0 ? feedbackForm.value.images : undefined
    })
    if (feedbackForm.value.images.length > 0) {
      await Promise.all(
        feedbackForm.value.images.map((image, index) => {
          const file = dataUrlToFile(image, `feedback-${Date.now()}-${index}.jpg`)
          return attachmentsApi.upload(ticketStore.currentTicket!.id, file, 'feedback')
        })
      )
    }
    
    feedbackForm.value = { content: '', rating: 5, images: [] }
    showFeedbackDialog.value = false
    alert('Feedback submitted successfully')
    
    await feedbackStore.fetchFeedbackByTicket(ticketStore.currentTicket.id)
  } catch (error: any) {
    feedbackError.value = error.message || 'Submission failed'
  } finally {
    submittingFeedback.value = false
  }
}

const openImagePreview = (images: string[], index: number) => {
  previewImageList.value = images
  previewImageIndex.value = index
  showImagePreview.value = true
}

onMounted(async () => {
  const id = route.params.id as string
  await ticketStore.fetchTicket(id)
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

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.detail-header h2 {
  margin: 0;
  color: #0f1b3d;
}

.status-badge {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-block;
}

.detail-info p {
  margin-bottom: 12px;
  color: #5f6b8a;
  line-height: 1.6;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #5f6b8a;
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

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
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
}

.feedback-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.feedback-user {
  font-weight: 600;
  color: #0f1b3d;
}

.feedback-time {
  color: #5f6b8a;
}

.feedback-rating {
  color: #e6a23c;
  font-weight: 600;
}

.feedback-content {
  color: #5f6b8a;
  line-height: 1.6;
  margin-bottom: 8px;
}

.feedback-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.feedback-images img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
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

.report-images img:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

.rating-input {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rating-star {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  color: rgba(15, 27, 61, 0.15);
  transition: all 0.3s;
}

.rating-star.active {
  color: #f59e0b;
  text-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
}

.rating-star:hover {
  transform: scale(1.2);
}

.rating-display {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rating-value {
  font-size: 14px;
  font-weight: 600;
  color: #0f1b3d;
  background: rgba(15, 27, 61, 0.06);
  border-radius: 999px;
  padding: 4px 10px;
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
</style>
