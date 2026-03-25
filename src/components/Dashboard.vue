<template>
  <v-container class="py-10">
    <div class="d-flex align-center justify-space-between">
      <h1 class="text-h3">Dashboard</h1>
      <v-btn
        prepend-icon="mdi-logout"
        variant="tonal"
        @click="logout()"
      >
        Cerrar sesión
      </v-btn>
    </div>
    <div class="mt-6 d-flex ga-3">
      <v-btn
        color="primary"
      >
        Probar API
      </v-btn>
    </div>

  </v-container>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()
  const API_BASE_URL = '/api'

  type ClienteOptions = {
    headers?: Record<string, string>
  }

  function getCookie (name: string): string {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='))
      ?.split('=')[1] || ''
  }

  async function parseBody (response: Response) {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) return response.json()
    return response.text()
  }

  const cliente = {
    async get<TResponse>(url: string, options: ClienteOptions = {}) {
      const csrfToken = getCookie('csrf_token')

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-csrf-token': csrfToken,
          ...options.headers,
        },
        credentials: 'include',
      })

      const data = await parseBody(response)

      if (!response.ok) {
        const message = typeof data === 'string' ? data : JSON.stringify(data)
        throw new Error(`HTTP ${response.status}: ${message}`)
      }

      return { data: data as TResponse }
    },

    async post<TResponse>(url: string, body: unknown, options: ClienteOptions = {}) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await parseBody(response)

      if (!response.ok) {
        const message = typeof data === 'string' ? data : JSON.stringify(data)
        throw new Error(`HTTP ${response.status}: ${message}`)
      }

      return { data: data as TResponse }
    },
  }

  async function logout () {
    console.log('Realizando logout...')
    const logoutResponse = await cliente.post<{
      mensaje?: string
    }>(
      `${API_BASE_URL}/auth/logout`,
      {},
      {
        headers: {
          'x-csrf-token': getCookie('csrf_token'),
        },
      },
    )

    console.log(`✅ Logout exitoso: ${logoutResponse.data.mensaje ?? '(sin mensaje)'}`)
    console.log('')
    await router.push('/')
  }

</script>
