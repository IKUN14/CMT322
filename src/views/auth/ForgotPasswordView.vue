<template>
  <div class="forgot-password-container">
    <div class="forgot-password-card">
      <h2>Forgot Password</h2>
      <form @submit.prevent="handleForgotPassword">
        <div class="form-group">
          <label>Email</label>
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="Please enter your registered email"
            required
          />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send Reset Link' }}
          </button>
          <router-link to="/login" class="link">Back to Login</router-link>
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const form = ref({
  email: ''
})

const loading = ref(false)
const error = ref('')
const success = ref('')

const handleForgotPassword = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const { error: resetError } = await authStore.forgotPassword(form.value)
    if (resetError) {
      throw resetError
    }
    success.value = 'Password reset email sent. Please check your inbox.'
  } catch (err: any) {
    error.value = err.message || 'Failed to send'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%),
              url('/images/background.jpg') center center / cover no-repeat;
  position: relative;
}

.forgot-password-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(2px);
  z-index: 0;
}

.forgot-password-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 40px;
  width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.forgot-password-card h2 {
  margin-bottom: 30px;
  text-align: center;
  color: #303133;
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
  flex-direction: column;
  gap: 12px;
  margin-top: 30px;
}

.link {
  color: #409eff;
  text-decoration: none;
  font-size: 14px;
  text-align: center;
}

.link:hover {
  text-decoration: underline;
}

.error-message {
  margin-top: 12px;
  padding: 8px;
  background-color: #fef0f0;
  color: #f56c6c;
  border-radius: 4px;
  font-size: 14px;
}

.success-message {
  margin-top: 12px;
  padding: 8px;
  background-color: #f0f9ff;
  color: #67c23a;
  border-radius: 4px;
  font-size: 14px;
}
</style>
