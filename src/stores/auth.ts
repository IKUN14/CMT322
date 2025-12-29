import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginRequest, RegisterRequest, ForgotPasswordRequest } from '@/types'
import { UserRole } from '@/types'
import { authApi } from '@/services/supabaseApi'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const role = computed(() => user.value?.role || null)
  const isStudent = computed(() => role.value === UserRole.Student)
  const isAdmin = computed(() => role.value === UserRole.Admin)
  const isWorker = computed(() => role.value === UserRole.Worker)

  async function initSession() {
    await authApi.initSession(session => {
      if (session?.user) {
        // Supabase user has no role; you need to fetch profiles table separately if you store role there.
        // Here we map role from user metadata if present, else keep existing.
        const metadataRole = (session.user.user_metadata?.role as UserRole | undefined) || user.value?.role
        user.value = {
          id: session.user.id,
          username: session.user.email ?? session.user.id,
          email: session.user.email ?? '',
          role: metadataRole ?? UserRole.Student,
          name: (session.user.user_metadata?.name as string | undefined) || session.user.email || ''
        }
        token.value = session.access_token ?? null
      } else {
        user.value = null
        token.value = null
      }
    })
  }

  async function login(data: LoginRequest) {
    const res = await authApi.login(data.username, data.password)
    // Supabase returns session internally; initSession will handle state, but keep backward compat
    await initSession()
    return res
  }

  async function register(data: RegisterRequest) {
    const normalizedRole = data.role.toLowerCase() as 'student' | 'admin' | 'worker'
    const res = await authApi.register(data.email, data.password, normalizedRole, data.name)    
    await initSession()
    return res
  }

  async function forgotPassword(data: ForgotPasswordRequest) {
    return authApi.forgotPassword(data.email)
  }

  async function logout() {
    await authApi.logout()
    user.value = null
    token.value = null
  }

  // Legacy compatibility: fetchCurrentUser now just re-inits session
  async function fetchCurrentUser() {
    await initSession()
  }

  return {
    user,
    token,
    isAuthenticated,
    role,
    isStudent,
    isAdmin,
    isWorker,
    login,
    register,
    forgotPassword,
    logout,
    fetchCurrentUser
  }
})
