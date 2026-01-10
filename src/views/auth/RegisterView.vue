<template>
  <div class="register-container">
    <div class="register-card">
      <h2>Register</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label>Username</label>
          <input v-model="form.username" type="text" class="input" placeholder="Please enter username" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" class="input" placeholder="Please enter email" required />
        </div>
        <div class="form-group">
          <label>Name</label>
          <input v-model="form.name" type="text" class="input" placeholder="Please enter name" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" class="input" placeholder="Please enter password" required />
          <p class="field-hint">Use at least 6 characters. Letters, numbers, and symbols are supported.</p>
        </div>
        <div class="form-group">
          <label>Role</label>
          <select v-model="form.role" class="select" required>
            <option value="Student">Student</option>
            <option value="Worker">Worker</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Registering...' : 'Register' }}
          </button>
          <router-link to="/login" class="link">Already have an account? Login</router-link>
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
      </form>
    </div>
    <div v-if="toastMessage" :class="['toast', toastTypeClass]">{{ toastMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { UserRole } from '@/types'

const authStore = useAuthStore()

const form = ref({
  username: '',
  email: '',
  password: '',
  name: '',
  role: UserRole.Student
})

const loading = ref(false)
const error = ref('')
const toastMessage = ref('')
const toastTypeClass = ref<'toast-success' | 'toast-error'>('toast-success')
let toastTimer: number | undefined

const handleRegister = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await authStore.register(form.value)
    const needsEmailConfirm = !result?.data?.session
    const successMessage = needsEmailConfirm
      ? 'Registration successful. Please check your email to confirm.'
      : 'Registration successful.'
    showToast(successMessage, 'success')
  } catch (err: any) {
    error.value = err.message || 'Registration failed'
    showToast(error.value, 'error')
  } finally {
    loading.value = false
  }
}

const showToast = (message: string, type: 'success' | 'error') => {
  toastMessage.value = message
  toastTypeClass.value = type === 'success' ? 'toast-success' : 'toast-error'
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastMessage.value = ''
  }, 3000)
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%),
              url('/images/background.jpg') center center / cover no-repeat;
  position: relative;
}

.register-container::before {
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

.register-card {
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

.register-card h2 {
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

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
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

.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.toast-success {
  background-color: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}

.toast-error {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

</style>
