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
              v-model="searchInput"
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
              @click="onBuscar"
            >
              Buscar
            </v-btn>
          </div>

          <v-data-table-server
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            hover
            item-value="id"
            :items="serverItems"
            :items-length="totalItems"
            items-per-page-text="Tareas por página"
            :loading="loading"
            loading-text="Cargando tareas..."
            no-data-text="No hay tareas para mostrar"
            @click:row="onRowClick"
            @update:options="loadItems"
          >
            <template #item.completada="{ value }">
              <v-icon
                :color="value ? 'success' : 'error'"
                :icon="value ? 'mdi-check' : 'mdi-close'"
              />
            </template>
          </v-data-table-server>

          <div class="d-flex justify-end mt-2">
            <v-btn
              :disabled="mode === 'all'"
              variant="tonal"
              @click="onLimpiar"
            >
              Limpiar
            </v-btn>
          </div>

        </v-card-text>
      </v-card>

      <v-card class="flex-1-1-0" min-width="320" variant="elevated">
        <v-card-title class="text-h5">Detalles de la tarea</v-card-title>
        <v-card-text>
          <v-text-field
            autocomplete="off"
            label="Título"
            :model-value="selectedTask?.titulo ?? ''"
            placeholder="Selecciona una tarea para ver sus detalles"
          />
          <v-textarea
            auto-grow
            autocomplete="off"
            label="Descripción"
            :model-value="selectedTask?.descripcion ?? ''"
            placeholder="(sin selección)"
          />
          <v-switch
            color="primary"
            hide-details
            inset
            label="Completada"
            :model-value="selectedTask?.completada ?? false"
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
  const detailsLoading = ref(false)
  const searchInput = ref('')
  const itemsPerPage = ref(10)

  const selectedTask = ref<Tarea | null>(null)

  const mode = ref<'all' | 'title'>('all')
  const activeQuery = ref('')

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
    if (mode.value === 'title') {
      await getTasksByTitle(activeQuery.value)
      return
    }

    await getAllTasks()
  }

  onMounted(async () => {
    await loadItems()
  })

  async function onRowClick (_event: MouseEvent, row: any) {
    const id = row?.item?.raw?.id ?? row?.item?.id ?? row?.raw?.id ?? row?.id
    if (typeof id !== 'number') return

    await getTaskById(id)
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

  async function getTasksByTitle (q: string) {
    loading.value = true
    try {
      const response = await cliente.get<{
        mensaje?: string
        total?: number
        tareas?: Tarea[]
        tarea?: Tarea
      }>(`${API_BASE_URL}/tareas/buscar?q=${encodeURIComponent(q)}`)

      const tareas = response.data.tareas ?? (response.data.tarea ? [response.data.tarea] : [])
      serverItems.value = tareas
      totalItems.value = response.data.total ?? tareas.length
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error buscando tareas: ${message}`)
      serverItems.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }

  async function getTaskById (id: number) {
    detailsLoading.value = true
    try {
      const tareaEspecifica = await cliente.get<{
        tarea?: Partial<Tarea>
      }>(`${API_BASE_URL}/tareas/${id}`, {
        headers: {
          'x-csrf-token': getCookie('csrf_token'),
        },
      })

      const tarea = tareaEspecifica.data.tarea
      selectedTask.value = tarea
        ? {
          id,
          titulo: tarea.titulo ?? '',
          descripcion: tarea.descripcion ?? '',
          completada: Boolean(tarea.completada),
        }
        : null
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error obteniendo tarea (id=${id}): ${message}`)
      selectedTask.value = null
    } finally {
      detailsLoading.value = false
    }
  }

  async function onBuscar () {
    const q = searchInput.value.trim()
    if (!q) {
      console.log('Query vacio')
      return
    }

    mode.value = 'title'
    activeQuery.value = q
    await loadItems()
  }

  async function onLimpiar () {
    searchInput.value = ''
    activeQuery.value = ''
    mode.value = 'all'
    await loadItems()
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

<style scoped>
  :deep(.v-data-table tbody tr:hover) {
    cursor: pointer;
    background-color: rgba(var(--v-theme-on-surface), 0.06);
  }
</style>
