<template>
  <div class="create-ticket">
    <div class="page-header">
      <div>
        <h2>Quick Repair</h2>
        <p class="subtitle">Submit a new maintenance request</p>
      </div>
    </div>
    <div class="card">
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Title *</label>
          <input v-model="form.title" type="text" class="input" placeholder="Please enter repair title" required />
        </div>
        <div class="form-group">
          <label>Description *</label>
          <textarea
            v-model="form.description"
            class="textarea"
            placeholder="Please describe the problem in detail"
            required
          ></textarea>
        </div>
        <div class="form-group">
          <label>Images (Optional)</label>
          <ImageUpload v-model="form.images" />
        </div>
        <div class="form-group">
          <label>Location *</label>
          <input v-model="form.location" type="text" class="input" placeholder="e.g., Building A Room 201" required />
        </div>
        <div class="form-group">
          <label>Urgency *</label>
          <select v-model="form.urgency" class="select" required>
            <option value="Normal">Normal</option>
            <option value="Urgent">Urgent</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>
        <div class="form-group">
          <label>Scheduled Time (Optional)</label>
          <input v-model="form.scheduledTime" type="datetime-local" class="input" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Submitting...' : 'Submit' }}
          </button>
          <router-link to="/student/tickets" class="btn btn-danger cancel-link">Cancel</router-link>
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTicketStore } from '@/stores/tickets'
import { Urgency, TicketStatus } from '@/types'
import { attachmentsApi } from '@/services/supabaseApi'
import { dataUrlToFile } from '@/utils/dataUrlToFile'
import ImageUpload from '@/components/ImageUpload.vue'

const router = useRouter()
const ticketStore = useTicketStore()

const form = ref({
  title: '',
  description: '',
  images: [] as string[],
  location: '',
  urgency: Urgency.Normal,
  scheduledTime: ''
})

const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  try {
    const ticket = await ticketStore.createTicket({
      ...form.value,
      scheduledTime: form.value.scheduledTime || undefined
    })
    if (!ticket) {
      throw new Error('Failed to create ticket')
    }
    if (ticket && form.value.images.length > 0) {
      await Promise.all(
        form.value.images.map((image, index) => {
          const file = dataUrlToFile(image, `repair-${Date.now()}-${index}.jpg`)
          return attachmentsApi.upload(ticket.id, file, 'repair')
        })
      )
    }
    // First create as draft, then automatically submit
    await ticketStore.updateTicketStatus({
      ticketId: ticket.id,
      status: TicketStatus.Submitted
    })
    router.push(`/student/tickets/${ticket.id}`)
  } catch (err: any) {
    error.value = err.message || 'Submission failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.create-ticket {
  padding: 20px;
}

.page-header {
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

.card {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 12px 26px rgba(15, 27, 61, 0.1);
  border: 1px solid rgba(39, 83, 231, 0.08);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #606266;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
  flex-wrap: wrap;
}

.cancel-link {
  text-decoration: none;
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
