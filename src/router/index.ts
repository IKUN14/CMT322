import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { UserRole } from '@/types'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { requiresAuth: true }
      },
      // Student routes
      {
        path: 'student/tickets',
        name: 'StudentTickets',
        component: () => import('@/views/student/TicketListView.vue'),
        meta: { requiresAuth: true, roles: [UserRole.Student] }
      },
      {
        path: 'student/tickets/create',
        name: 'StudentCreateTicket',
        component: () => import('@/views/student/CreateTicketView.vue'),
        meta: { requiresAuth: true, roles: [UserRole.Student] }
      },
      {
        path: 'student/tickets/:id',
        name: 'StudentTicketDetail',
        component: () => import('@/views/student/TicketDetailView.vue'),
        meta: { requiresAuth: true, roles: [UserRole.Student] }
      },
      // Admin routes
      {
        path: 'admin/tickets',
        name: 'AdminTickets',
        component: () => import('@/views/admin/TicketListView.vue'),
        meta: { requiresAuth: true, roles: [UserRole.Admin] }
      },
      {
        path: 'admin/tickets/:id',
        name: 'AdminTicketDetail',
        component: () => import('@/views/admin/TicketDetailView.vue'),
        meta: { requiresAuth: true, roles: [UserRole.Admin] }
      },
      {
        path: 'admin/workers',
        name: 'AdminWorkers',
        component: () => import('@/views/admin/WorkersView.vue'),
        meta: { requiresAuth: true, roles: [UserRole.Admin] }
      },
      // Worker routes
      {
        path: 'worker/tickets',
        name: 'WorkerTickets',
        component: () => import('@/views/worker/TicketListView.vue'),
        meta: { requiresAuth: true, roles: [UserRole.Worker] }
      },
      {
        path: 'worker/tickets/:id',
        name: 'WorkerTicketDetail',
        component: () => import('@/views/worker/TicketDetailView.vue'),
        meta: { requiresAuth: true, roles: [UserRole.Worker] }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Route guard
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  if (!authStore.initialized) {
    await authStore.fetchCurrentUser()
  }

  // Check if authentication is required
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // If already logged in, redirect to dashboard when accessing login page
  if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Dashboard' })
    return
  }

  // Check role permissions
  if (to.meta.roles && authStore.role) {
    const allowedRoles = to.meta.roles as UserRole[]
    if (!allowedRoles.includes(authStore.role)) {
      // No permission, redirect to dashboard
      next({ name: 'Dashboard' })
      return
    }
  }

  next()
})

export default router
