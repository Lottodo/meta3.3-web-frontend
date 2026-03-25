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
              v-model="search"
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
              @click="loadItems()"
            >
              Buscar
            </v-btn>
          </div>

          <v-data-table-server
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            item-value="id"
            :items="serverItems"
            :items-length="totalItems"
            :loading="loading"
            :search="search"
            @update:options="loadItems"
          >
            <template #item.completada="{ value }">
              <v-icon
                :color="value ? 'success' : 'error'"
                :icon="value ? 'mdi-check' : 'mdi-close'"
              />
            </template>
          </v-data-table-server>

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
  import { onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()
  const API_BASE_URL = '/api'

  type Tarea = {
    id: number
    titulo: string
    descripcion: string
    completada: boolean
  }

  const headers = [
    { title: 'Título', key: 'titulo' },
    { title: 'Completada', key: 'completada' },
  ]

  const serverItems = ref<Tarea[]>([])
  const totalItems = ref(0)
  const loading = ref(false)
  const search = ref('')
  const itemsPerPage = ref(10)
  type ClienteOptions = {
    headers?: Record<string, string>
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

  async function loadItems () {
    await getAllTasks()
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

  async function getAllTasks () {
    loading.value = true
    try {
      const tareasResponse = await cliente.get<{
        mensaje?: string
        total?: number
        tareas?: Tarea[]
      }>(`${API_BASE_URL}/tareas`)

      serverItems.value = tareasResponse.data.tareas ?? []
      totalItems.value = tareasResponse.data.total ?? serverItems.value.length
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error obteniendo tareas: ${message}`)
      serverItems.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  onMounted(async () => {
    await loadItems()
  })

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
