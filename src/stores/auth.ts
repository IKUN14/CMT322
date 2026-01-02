import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, LoginRequest, RegisterRequest, ForgotPasswordRequest } from '@/types'
import { UserRole } from '@/types'
import { authApi } from '@/services/supabaseApi'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const initialized = ref(false)
  const idleTimeoutMs = 15 * 60 * 1000
  let idleTimer: number | null = null
  let idleWatcherBound = false

  const isAuthenticated = computed(() => !!user.value && !!token.value)
  const role = computed(() => user.value?.role || null)
  const isStudent = computed(() => role.value === UserRole.Student)
  const isAdmin = computed(() => role.value === UserRole.Admin)
  const isWorker = computed(() => role.value === UserRole.Worker)

  function normalizeRole(value?: string | null): UserRole {
    const normalized = (value ?? '').toLowerCase()
    if (normalized === 'admin') return UserRole.Admin
    if (normalized === 'worker') return UserRole.Worker
    return UserRole.Student
  }

  const activityEvents = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click']

  function clearIdleTimer() {
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  function scheduleIdleLogout() {
    clearIdleTimer()
    idleTimer = window.setTimeout(async () => {
      if (isAuthenticated.value) {
        await logout()
      }
    }, idleTimeoutMs)
  }

  function handleActivity() {
    if (!isAuthenticated.value) return
    scheduleIdleLogout()
  }

  function ensureIdleWatcher() {
    if (typeof window === 'undefined' || idleWatcherBound) return
    activityEvents.forEach(eventName => {
      window.addEventListener(eventName, handleActivity, { passive: true })
    })
    idleWatcherBound = true
  }

  async function initSession() {
    await authApi.initSession(async session => {
      if (session?.user) {
        // Supabase user has no role; you need to fetch profiles table separately if you store role there.
        // Here we map role from user metadata if present, else keep existing.
        const metadataRole = session.user.user_metadata?.role as string | undefined
        let profileRole: string | undefined
        let profileName: string | undefined
        try {
          const { data } = await supabase
            .from('profiles')
            .select('role, name')
            .eq('id', session.user.id)
            .maybeSingle()
          profileRole = data?.role ?? undefined
          profileName = data?.name ?? undefined
        } catch {
          profileRole = undefined
        }
        user.value = {
          id: session.user.id,
          username: session.user.email ?? session.user.id,
          email: session.user.email ?? '',
          role: normalizeRole(profileRole ?? metadataRole ?? user.value?.role ?? UserRole.Student),
          name:
            profileName ||
            (session.user.user_metadata?.name as string | undefined) ||
            session.user.email ||
            ''
        }
        token.value = session.access_token ?? null
        ensureIdleWatcher()
        scheduleIdleLogout()
      } else {
        user.value = null
        token.value = null
        clearIdleTimer()
      }
      initialized.value = true
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

  async function resetPassword(newPassword: string) {
    return authApi.resetPassword(newPassword)
  }

  async function logout() {
    await authApi.logout()
    user.value = null
    token.value = null
    clearIdleTimer()
  }

  // Legacy compatibility: fetchCurrentUser now just re-inits session
  async function fetchCurrentUser() {
    await initSession()
  }

  return {
    user,
    token,
    initialized,
    isAuthenticated,
    role,
    isStudent,
    isAdmin,
    isWorker,
    login,
    register,
    forgotPassword,
    resetPassword,
    logout,
    fetchCurrentUser
  }
})
