import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WorkerProfile } from '@/types'
import { workersApi } from '@/services/supabaseApi'

export const useWorkerStore = defineStore('workers', () => {
  const workers = ref<WorkerProfile[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchWorkers(search?: string) {
    loading.value = true
    error.value = null
    try {
      workers.value = await workersApi.list(search)
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch workers'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateWorkerStatus(id: string, status: WorkerProfile['status']) {
    loading.value = true
    error.value = null
    try {
      const updated = await workersApi.updateStatus(id, status)
      if (updated) {
        const idx = workers.value.findIndex(w => w.id === id)
        if (idx !== -1) {
          workers.value[idx] = updated
        }
      }
      return updated
    } catch (err: any) {
      error.value = err.message || 'Failed to update worker'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createWorker(payload: {
    email: string
    password: string
    name: string
    department?: string
    phone?: string
  }) {
    loading.value = true
    error.value = null
    try {
      const created = await workersApi.create({
        email: payload.email,
        password: payload.password,
        name: payload.name,
        department: payload.department ?? '',
        phone: payload.phone ?? '',
        status: 'available',
        skills: []
      })
      if (created) {
        workers.value.unshift(created)
      }
      return created
    } catch (err: any) {
      error.value = err.message || 'Failed to create worker'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    workers,
    loading,
    error,
    fetchWorkers,
    updateWorkerStatus,
    createWorker
  }
})
