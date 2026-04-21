/**
 * router/index.ts
 *
 * Manual routes for ./src/pages/*.vue
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/pages/dashboard.vue'
import Index from '@/pages/index.vue'
import Signup from '@/pages/signup.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: Index,
    },
    {
      path: '/dashboard',
      component: Dashboard,
    },
    {
      path: '/signup',
      component: Signup,
    },
  ],
})

export default router
