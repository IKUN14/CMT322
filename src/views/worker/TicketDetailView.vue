<template>
  <div class="ticket-detail">
    <div v-if="ticketStore.loading" class="loading">Loading...</div>
    <div v-else-if="ticketStore.currentTicket" class="detail-content">
      <div class="card">
        <h2>{{ ticketStore.currentTicket.title }}</h2>
        <div class="detail-info">
          <p><strong>Description:</strong>{{ ticketStore.currentTicket.description }}</p>
          <p><strong>Location:</strong>{{ ticketStore.currentTicket.location }}</p>
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
        </div>
        <div v-if="ticketStore.currentTicket.status === TicketStatus.Assigned" class="actions">
          <button @click="handleAccept" class="btn btn-primary">Accept</button>
        </div>
        <div v-if="ticketStore.currentTicket.status === TicketStatus.InProgress" class="actions">
          <button @click="showReportDialog = true" class="btn btn-success">Submit Report</button>
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
          <span v-if="ticketStore.currentTicket.completedAt" class="report-time">
            Completed: {{ formatTime(ticketStore.currentTicket.completedAt) }}
          </span>
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
      
      <!-- Submit Report Dialog -->
      <div v-if="showReportDialog" class="dialog-overlay" @click="showReportDialog = false">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>Submit Repair Report</h3>
            <button @click="showReportDialog = false" class="close-btn">×</button>
          </div>
          <form @submit.prevent="handleSubmitReport" class="dialog-body">
            <div class="form-group">
              <label>Repair Report *</label>
              <textarea
                v-model="reportForm.report"
                class="textarea"
                placeholder="Please describe the repair process and results in detail"
                required
                rows="6"
              ></textarea>
            </div>
            <div class="form-group">
              <label>Repair Images (Optional)</label>
              <ImageUpload v-model="reportForm.images" />
            </div>
            <div class="dialog-actions">
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                {{ submitting ? 'Submitting...' : 'Submit' }}
              </button>
              <button type="button" @click="showReportDialog = false" class="btn">Cancel</button>
            </div>
            <div v-if="reportError" class="error-message">{{ reportError }}</div>
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
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTicketStore } from '@/stores/tickets'
import { useFeedbackStore } from '@/stores/feedback'
import { getStatusLabel, getStatusColor, getStatusBgColor } from '@/utils/ticketStateMachine'
import { TicketStatus } from '@/types'
import TicketStatusTimeline from '@/components/TicketStatusTimeline.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { attachmentsApi } from '@/services/supabaseApi'
import { dataUrlToFile } from '@/utils/dataUrlToFile'
import ImagePreview from '@/components/ImagePreview.vue'

const route = useRoute()
const ticketStore = useTicketStore()
const feedbackStore = useFeedbackStore()
const showReportDialog = ref(false)
const submitting = ref(false)
const reportError = ref('')
const showImagePreview = ref(false)
const previewImageList = ref<string[]>([])
const previewImageIndex = ref(0)

const reportForm = ref({
  report: '',
  images: [] as string[]
})

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('en-US')
}

const openImagePreview = (images: string[], index: number) => {
  previewImageList.value = images
  previewImageIndex.value = index
  showImagePreview.value = true
}

const handleAccept = async () => {
  try {
    await ticketStore.updateTicketStatus({
      ticketId: ticketStore.currentTicket!.id,
      status: TicketStatus.InProgress
    })
    alert('Accepted successfully')
  } catch (error: any) {
    alert(error.message || 'Operation failed')
  }
}

const handleSubmitReport = async () => {
  if (!ticketStore.currentTicket) return

  submitting.value = true
  reportError.value = ''
  
  try {
    if (reportForm.value.images.length > 0) {
      await Promise.all(
        reportForm.value.images.map((image, index) => {
          const file = dataUrlToFile(image, `report-${Date.now()}-${index}.jpg`)
          return attachmentsApi.upload(ticketStore.currentTicket!.id, file, 'report')
        })
      )
    }
    await ticketStore.submitReport({
      ticketId: ticketStore.currentTicket.id,
      report: reportForm.value.report,
      images: reportForm.value.images.length > 0 ? reportForm.value.images : undefined
    })
    
    // Reset form
    reportForm.value = { report: '', images: [] }
    
    showReportDialog.value = false
    alert('Report submitted successfully')
    
    // Refresh ticket details
    await ticketStore.fetchTicket(ticketStore.currentTicket.id)
  } catch (error: any) {
    reportError.value = error.message || 'Submission failed'
  } finally {
    submitting.value = false
  }
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
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detail-info p {
  margin-bottom: 12px;
  color: #606266;
}

.actions {
  margin-top: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #909399;
}

/* Feedback styles */
.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.feedback-header h3 {
  margin: 0;
  color: #303133;
}

.empty-feedback {
  text-align: center;
  padding: 20px;
  color: #909399;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-item {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border-left: 3px solid #3b82f6;
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
  color: #303133;
}

.feedback-time {
  color: #909399;
  font-size: 14px;
}

.feedback-rating {
  color: #f59e0b;
  font-weight: 600;
}

.feedback-content {
  color: #606266;
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
  transition: transform 0.2s, box-shadow 0.2s;
}

.feedback-images img:hover {
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
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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
  color: #303133;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #909399;
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
  background-color: #f5f7fa;
  color: #303133;
}

.dialog-body {
  padding: 20px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-end;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.error-message {
  margin-top: 12px;
  padding: 8px;
  background-color: #fef0f0;
  color: #f56c6c;
  border-radius: 4px;
  font-size: 14px;
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
  color: #303133;
}

.report-time {
  color: #909399;
  font-size: 14px;
}

.report-content {
  color: #606266;
  line-height: 1.8;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
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
