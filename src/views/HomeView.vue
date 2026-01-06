<template>
  <div class="home">
    <div class="home-shell">
      <header class="topbar">
        <div class="topbar-brand">
          <span class="brand-mark">
            <img src="/images/logo.png" alt="USM logo" />
          </span>
          <div>
            <span class="brand-title">Dormitory Facilities Repair & Feedback</span>
            <span class="brand-sub">Unified maintenance workflow</span>
          </div>
        </div>
        <div v-if="!authStore.isAuthenticated" class="topbar-actions">
          <button class="btn btn-primary" @click="goTo('/login')">Login</button>
          <button class="btn btn-secondary" @click="goTo('/register')">Create account</button>
        </div>
        <div v-else class="topbar-actions">
          <button class="btn btn-primary" @click="goTo('/dashboard')">Dashboard</button>
        </div>
      </header>
      <section class="hero">
        <div class="hero-content">
          <img src="/images/homepage6.png" alt="USM emblem" class="hero-logo" />
          <span class="eyebrow">USM Dormitory Services</span>
          <h1>Facilities repair that feels coordinated, not chaotic.</h1>
          <p>
            A single platform for reporting issues, assigning repairs, tracking progress, and closing
            feedback loops across dormitories.
          </p>
          <div class="hero-actions">
            <button
              v-if="!authStore.isAuthenticated"
              class="btn btn-primary"
              @click="scrollToRoles"
            >
              Get started
            </button>
            <button
              v-else
              class="btn btn-primary"
              @click="goTo('/dashboard')"
            >
              Go to my dashboard
            </button>
          </div>
          <div class="hero-benefits">
            <div>
              <h4>Fast reporting</h4>
              <p>Submit issues in under a minute.</p>
            </div>
            <div>
              <h4>Clear ownership</h4>
              <p>Know who is handling each repair.</p>
            </div>
          </div>
          <div class="hero-gallery">
            <img src="/images/homepage7.webp" alt="Dormitory operations" />
          </div>
        </div>
        <div class="hero-visual">
          <img src="/images/homepage1.webp" alt="Dashboard preview" class="hero-image" />
          <div class="kpi-strip">
            <div class="metric">
              <span>Live repairs</span>
              <strong>{{ stats.total }}</strong>
            </div>
            <div class="metric">
              <span>Urgent</span>
              <strong>{{ stats.urgent }}</strong>
            </div>
            <div class="metric">
              <span>Resolved</span>
              <strong>{{ stats.resolved }}</strong>
            </div>
          </div>
          <div class="visual-stack">
            <div class="visual-card">
              <h3>Repair flow</h3>
              <div class="visual-grid">
                <span>Report</span>
                <span>Assign</span>
                <span>Resolve</span>
              </div>
            </div>
            <div class="visual-card secondary">
              <h3>Live queue</h3>
              <ul>
                <li>Pipe leak · Urgent</li>
                <li>Lighting · In Progress</li>
                <li>Door lock · Submitted</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section v-if="!authStore.isAuthenticated" id="roles" class="role-cards">
        <div class="section-title">
          <h2>I am a…</h2>
          <p>Choose a role to continue to the right workspace.</p>
        </div>
        <div class="role-gallery">
          <img src="/images/homepage4.jpg" alt="Dormitory facilities" />
          <img src="/images/homepage5.webp" alt="Campus services" />
        </div>
        <div class="role-grid">
          <article class="role-card">
            <span class="role-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4l8 3v6c0 4.4-3.1 7.2-8 9-4.9-1.8-8-4.6-8-9V7l8-3z" />
                <path d="M9 12h6" />
              </svg>
            </span>
            <h3>Student</h3>
            <p>Report & track issues</p>
            <button class="btn btn-primary" @click="goTo('/register')">Continue as Student</button>
          </article>
          <article class="role-card">
            <span class="role-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12h18" />
                <path d="M12 3v18" />
                <path d="M7 7l10 10" />
              </svg>
            </span>
            <h3>Worker</h3>
            <p>Handle assigned repairs</p>
            <button class="btn btn-primary" @click="goTo('/login')">Continue as Worker</button>
          </article>
          <article class="role-card">
            <span class="role-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16v10H4z" />
                <path d="M8 7V5h8v2" />
                <path d="M9 12h6" />
              </svg>
            </span>
            <h3>Admin</h3>
            <p>Coordinate and assign work</p>
            <button class="btn btn-primary" @click="goTo('/login')">Continue as Admin</button>
          </article>
        </div>
      </section>

      <section v-else class="role-dashboard">
        <div class="section-title">
          <h2>Quick Actions</h2>
          <p>{{ roleSubtitle }}</p>
        </div>
        <div class="action-grid">
          <button class="action-card" v-for="action in quickActions" :key="action.label" @click="goTo(action.to)">
            <div>
              <h3>{{ action.label }}</h3>
              <p>{{ action.desc }}</p>
            </div>
            <span class="action-cta">Open</span>
          </button>
        </div>

        <div class="section-title stats-title">
          <h2>At a glance</h2>
          <p>Live snapshot for your role.</p>
        </div>
        <div class="stats-grid">
          <div class="stat-card" v-for="item in statCards" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.sub }}</small>
          </div>
        </div>
      </section>

      <section class="how-it-works">
        <div class="section-title">
          <h2>How it works</h2>
          <p>Simple steps to move every repair from request to resolution.</p>
        </div>
        <div class="how-stepper">
          <div class="how-step">
            <span class="step-dot">1</span>
            <div>
              <h3>Report</h3>
              <p>Students submit issues with location, urgency, and images.</p>
            </div>
          </div>
          <div class="step-line"></div>
          <div class="how-step">
            <span class="step-dot">2</span>
            <div>
              <h3>Assign</h3>
              <p>Admins review, prioritize, and assign to maintenance staff.</p>
            </div>
          </div>
          <div class="step-line"></div>
          <div class="how-step">
            <span class="step-dot">3</span>
            <div>
              <h3>Resolve</h3>
              <p>Workers update progress, upload reports, and close the loop.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="feature-split">
        <div class="split-card">
          <div class="split-media">
            <img src="/images/homepage2.webp" alt="Campus facilities" />
            <div class="media-badges">
              <span class="badge-chip">Dormitory blocks</span>
              <span class="badge-chip">24/7 coverage</span>
            </div>
          </div>
          <h2>Built for dormitory operations</h2>
          <p>
            Track repairs by block, urgency, and status. Export data, assign workers, and keep
            residents informed with clear status updates.
          </p>
          <ul>
            <li>Unified repair timeline and audit trail</li>
            <li>Role-based workflows for every stakeholder</li>
            <li>Feedback loop with photo evidence</li>
          </ul>
          <button class="btn btn-primary" @click="goTo('/dashboard')">Explore dashboard</button>
        </div>
        <div class="split-preview">
          <div class="preview-card">
            <span>Upcoming tasks</span>
            <strong>12</strong>
          </div>
          <div class="preview-card">
            <span>Average resolution</span>
            <strong>3.4h</strong>
          </div>
          <div class="preview-card wide">
            <span>Blocks covered</span>
            <strong>A, B, C, D</strong>
          </div>
          <div class="preview-card wide secondary">
            <span>Weekly volume</span>
            <strong>+18% from last week</strong>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { TicketStatus } from '@/types'
import { repairsApi } from '@/services/supabaseApi'

const router = useRouter()
const authStore = useAuthStore()
const stats = ref({ total: 0, urgent: 0, resolved: 0 })
const roleStats = ref({
  primary: 0,
  secondary: 0,
  tertiary: 0
})

const goTo = (path: string) => {
  router.push(path)
}

const scrollToRoles = () => {
  const target = document.getElementById('roles')
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const quickActions = computed(() => {
  if (authStore.isAdmin) {
    return [
      { label: 'Repair Management', desc: 'Review and assign repairs', to: '/admin/tickets' },
      { label: 'Maintenance Team', desc: 'Manage worker availability', to: '/admin/workers' },
      { label: 'Dashboard', desc: 'View operational metrics', to: '/dashboard' }
    ]
  }
  if (authStore.isWorker) {
    return [
      { label: 'My Repairs', desc: 'View assigned tasks', to: '/worker/tickets' },
      { label: 'Dashboard', desc: 'Check your queue', to: '/dashboard' }
    ]
  }
  return [
    { label: 'Submit Repair', desc: 'Create a new request', to: '/student/tickets/create' },
    { label: 'My Repairs', desc: 'Track your requests', to: '/student/tickets' },
    { label: 'Dashboard', desc: 'View status overview', to: '/dashboard' }
  ]
})

const roleSubtitle = computed(() => {
  if (authStore.isAdmin) return 'Monitor and coordinate repairs across the dormitory.'
  if (authStore.isWorker) return 'Stay focused on assigned repairs and updates.'
  return 'Submit issues and follow up on your requests.'
})

const statCards = computed(() => {
  if (authStore.isAdmin) {
    return [
      { label: 'Open Repairs', value: roleStats.value.primary, sub: 'Submitted / Assigned' },
      { label: 'In Progress', value: roleStats.value.secondary, sub: 'Active work' },
      { label: 'Resolved', value: roleStats.value.tertiary, sub: 'Closed recently' }
    ]
  }
  if (authStore.isWorker) {
    return [
      { label: 'Pending', value: roleStats.value.primary, sub: 'Awaiting start' },
      { label: 'In Progress', value: roleStats.value.secondary, sub: 'Active now' },
      { label: 'History', value: roleStats.value.tertiary, sub: 'Resolved / Closed' }
    ]
  }
  return [
    { label: 'My Repairs', value: roleStats.value.primary, sub: 'Total requests' },
    { label: 'In Progress', value: roleStats.value.secondary, sub: 'Being handled' },
    { label: 'Resolved', value: roleStats.value.tertiary, sub: 'Completed' }
  ]
})

const refreshStats = async () => {
  if (!authStore.isAuthenticated) {
    stats.value = { total: 0, urgent: 0, resolved: 0 }
    return
  }
  const tickets = await repairsApi.list()
  stats.value = {
    total: tickets.length,
    urgent: tickets.filter(t => t.urgency === 'Urgent' || t.urgency === 'Emergency').length,
    resolved: tickets.filter(t => t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed).length
  }

  if (authStore.isAdmin) {
    roleStats.value = {
      primary: tickets.filter(t =>
        t.status === TicketStatus.Submitted ||
        t.status === TicketStatus.Assigned ||
        t.status === TicketStatus.Reassigned
      ).length,
      secondary: tickets.filter(t => t.status === TicketStatus.InProgress).length,
      tertiary: tickets.filter(t => t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed).length
    }
  } else if (authStore.isWorker) {
    const workerId = authStore.user?.id
    const mine = tickets.filter(t => t.currentAssignee === workerId)
    roleStats.value = {
      primary: mine.filter(t => t.status === TicketStatus.Assigned).length,
      secondary: mine.filter(t => t.status === TicketStatus.InProgress).length,
      tertiary: mine.filter(t => t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed).length
    }
  } else {
    const studentId = authStore.user?.id
    const mine = tickets.filter(t => t.createdBy === studentId)
    roleStats.value = {
      primary: mine.length,
      secondary: mine.filter(t => t.status === TicketStatus.InProgress).length,
      tertiary: mine.filter(t => t.status === TicketStatus.Resolved || t.status === TicketStatus.Closed).length
    }
  }
}

onMounted(async () => {
  if (!authStore.initialized) {
    await authStore.fetchCurrentUser()
  }
  await refreshStats()
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  padding: 28px 16px 60px;
}

.home-shell {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 0 10px;
}

.topbar-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #0f1b3d;
  font-weight: 700;
}

.brand-mark {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 10px 20px rgba(15, 27, 61, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(15, 27, 61, 0.1);
}

.brand-mark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-title {
  display: block;
  font-size: 14px;
}

.brand-sub {
  display: block;
  font-size: 12px;
  color: #5f6b8a;
}

.topbar-actions {
  display: flex;
  gap: 10px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 20px;
  align-items: center;
  padding: 0 0 6px;
}

.hero-content h1 {
  font-size: 48px;
  line-height: 1.1;
  margin-bottom: 16px;
  color: #0f1b3d;
  max-width: 20ch;
}

.hero-content p {
  color: #5f6b8a;
  font-size: 16px;
  line-height: 1.6;
  max-width: 52ch;
}

.eyebrow {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #2753e7;
  font-weight: 700;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.hero-logo {
  width: 100%;
  height: 120px;
  margin-bottom: 12px;
  border-radius: 16px;
  box-shadow: 0 12px 24px rgba(15, 27, 61, 0.1);
  object-fit: contain;
  object-position: left center;
  background: rgba(255, 255, 255, 0.7);
  padding: 0;
}
.hero-benefits {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.hero-gallery {
  margin-top: 16px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(15, 27, 61, 0.08);
  box-shadow: 0 12px 24px rgba(15, 27, 61, 0.12);
}

.hero-gallery img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.hero-benefits h4 {
  margin: 0 0 6px;
  font-size: 14px;
  color: #0f1b3d;
}

.hero-benefits p {
  margin: 0;
  font-size: 13px;
  color: #5f6b8a;
}

.hero-visual {
  display: grid;
  gap: 16px;
}

.hero-image {
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(15, 27, 61, 0.08);
  box-shadow: 0 18px 32px rgba(15, 27, 61, 0.18);
  object-fit: cover;
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 14px;
  border: 1px solid rgba(15, 27, 61, 0.08);
  backdrop-filter: blur(6px);
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #5f6b8a;
}

.metric strong {
  font-size: 20px;
  color: #0f1b3d;
}

.visual-stack {
  display: grid;
  gap: 12px;
}

.visual-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(15, 27, 61, 0.08);
  box-shadow: 0 12px 24px rgba(15, 27, 61, 0.08);
}

.visual-card.secondary {
  background: rgba(255, 255, 255, 0.7);
}

.visual-card h3 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #0f1b3d;
}

.visual-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  font-size: 12px;
  color: #5f6b8a;
}

.visual-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #5f6b8a;
}

.section-title h2 {
  margin-bottom: 8px;
  color: #0f1b3d;
}

.section-title p {
  color: #5f6b8a;
}

.role-grid,
.how-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.role-gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.role-gallery img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid rgba(15, 27, 61, 0.08);
  box-shadow: 0 12px 24px rgba(15, 27, 61, 0.12);
}

.role-card,
.action-card,
.stat-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 8px 18px rgba(15, 27, 61, 0.08);
  border: 1px solid rgba(15, 27, 61, 0.08);
}

.role-card h3,
.action-card h3 {
  margin-bottom: 8px;
  color: #0f1b3d;
}

.role-card p,
.action-card p {
  color: #5f6b8a;
  font-size: 14px;
}

.role-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(39, 83, 231, 0.12);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  color: #2753e7;
}

.role-icon svg {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  stroke-width: 2;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.action-grid,
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.action-card {
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  cursor: pointer;
}

.action-cta {
  font-weight: 700;
  color: #2753e7;
}

.stat-card span {
  font-size: 12px;
  color: #5f6b8a;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-card strong {
  font-size: 24px;
  color: #0f1b3d;
  display: block;
  margin: 8px 0;
}

.stat-card small {
  color: #5f6b8a;
  font-size: 12px;
}

.how-card span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(39, 83, 231, 0.12);
  color: #2753e7;
  font-weight: 700;
  margin-bottom: 12px;
}

.how-stepper {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 18px;
  padding: 14px;
  border: 1px solid rgba(15, 27, 61, 0.08);
}

.how-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(15, 27, 61, 0.08);
  flex: 1;
}

.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(39, 83, 231, 0.15);
  color: #2753e7;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.step-line {
  flex: 0 0 40px;
  height: 2px;
  background: rgba(15, 27, 61, 0.1);
}

.feature-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid rgba(15, 27, 61, 0.08);
}

.split-media {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.split-media img {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(15, 27, 61, 0.08);
  box-shadow: 0 12px 24px rgba(15, 27, 61, 0.12);
  object-fit: cover;
}

.media-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge-chip {
  background: rgba(39, 83, 231, 0.12);
  color: #2753e7;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.preview-card.secondary {
  background: rgba(255, 255, 255, 0.8);
}

.split-card h2 {
  margin-bottom: 8px;
  color: #0f1b3d;
}

.split-card p {
  color: #5f6b8a;
  margin-bottom: 12px;
}

.split-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 14px;
  display: grid;
  gap: 6px;
  color: #5f6b8a;
  font-size: 14px;
}

.split-card li::before {
  content: '•';
  margin-right: 6px;
  color: #2753e7;
}

.split-preview {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.preview-image {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(15, 27, 61, 0.08);
  box-shadow: 0 12px 24px rgba(15, 27, 61, 0.12);
  grid-column: span 2;
  object-fit: cover;
}

.preview-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(15, 27, 61, 0.08);
  box-shadow: 0 10px 20px rgba(15, 27, 61, 0.08);
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #5f6b8a;
  min-height: 88px;
}

.preview-card strong {
  color: #0f1b3d;
  font-size: 18px;
}

.preview-card.wide {
  grid-column: span 2;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
  }

  .hero-content h1 {
    font-size: 30px;
  }

  .topbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .how-stepper {
    flex-direction: column;
    align-items: stretch;
  }

  .step-line {
    width: 2px;
    height: 24px;
  }

  .feature-split {
    grid-template-columns: 1fr;
  }

  .split-preview {
    grid-template-columns: 1fr;
  }

  .role-gallery {
    grid-template-columns: 1fr;
  }
}
</style>
