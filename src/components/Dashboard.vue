<template>
  <v-container class="py-10">
    <div class="d-flex align-center justify-space-between">
      <div class="d-flex align-center ga-3">
        <img
          alt="Logo"
          height="44"
          src="/arc.png"
          width="44"
        >
        <h1 class="text-h3 ma-0">Lista de Tareas</h1>
      </div>
      <v-btn
        prepend-icon="mdi-logout"
        variant="tonal"
        @click="logout()"
      >
        Cerrar sesión
      </v-btn>
    </div>

    <div class="d-flex mt-6 ga-4 flex-wrap">
      <v-card class="flex-1-1-0" min-width="320" variant="elevated">
        <v-card-title class="text-h5">Tareas</v-card-title>
        <v-card-text>
          <div class="d-flex align-center ga-2">
            <v-text-field
              autocomplete="off"
              class="flex-grow-1"
              label="Buscar tarea"
              placeholder="Escribe para buscar una tarea..."
              variant="underlined"
            />
            <v-btn
              color="primary"
              prepend-icon="mdi-magnify"
              variant="tonal"
            >
              Buscar
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="flex-1-1-0" min-width="320" variant="elevated">
        <v-card-title class="text-h5">Detalle de la tarea</v-card-title>
        <v-card-text>
          <v-text-field
            autocomplete="off"
            label="Título"
            placeholder="Selecciona una tarea para ver sus detalles"
            readonly
          />
          <v-textarea
            auto-grow
            autocomplete="off"
            label="Descripción"
            placeholder="(sin selección)"
            readonly
          />
          <v-text-field
            autocomplete="off"
            label="Estado"
            placeholder="(pendiente / completada)"
            readonly
          />
        </v-card-text>
      </v-card>
    </div>

  </v-container>
</template>

<script setup lang="ts">
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
