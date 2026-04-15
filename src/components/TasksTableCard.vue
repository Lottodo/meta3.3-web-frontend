<template>
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
        <template #item.completion="{ value }">
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
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'

  const API_BASE_URL = '/api'

  type Tarea = {
    id: number
    title: string
    description: string
    completion: boolean
  }

  const emit = defineEmits<{
    (e: 'select', id: number): void
  }>()

  const headers = [
    { title: 'Título', key: 'title' },
    { title: 'Completada', key: 'completion' },
  ]

  const serverItems = ref<Tarea[]>([])
  const totalItems = ref(0)
  const loading = ref(false)
  const searchInput = ref('')
  const itemsPerPage = ref(10)

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

  function normalizeTask (raw: any): Tarea | null {
    if (!raw) return null

    const id = Number(raw.id)
    if (!Number.isFinite(id)) return null

    const title = String(raw.title ?? raw.titulo ?? '')
    const description = String(raw.description ?? raw.descripcion ?? '')
    const completionRaw = raw.completion ?? raw.completada

    return {
      id,
      title,
      description,
      completion: Boolean(completionRaw),
    }
  }

  async function getAllTasks () {
    loading.value = true
    try {
      const tareasResponse = await cliente.get<{
        mensaje?: string
        total?: number
        tareas?: any[]
      }>(`${API_BASE_URL}/tareas`)

      const tareas = (tareasResponse.data.tareas ?? [])
        .map(raw => normalizeTask(raw))
        .filter(Boolean) as Tarea[]

      serverItems.value = tareas
      totalItems.value = tareasResponse.data.total ?? tareas.length
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
        tareas?: any[]
        tarea?: any
        tareaDb?: any
      }>(`${API_BASE_URL}/tareas/buscar?q=${encodeURIComponent(q)}`)

      const rawTasks = response.data.tareas
        ?? (response.data.tareaDb ? [response.data.tareaDb] : (response.data.tarea ? [response.data.tarea] : []))

      const tareas = rawTasks
        .map(raw => normalizeTask(raw))
        .filter(Boolean) as Tarea[]

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

  async function loadItems () {
    if (mode.value === 'title') {
      await getTasksByTitle(activeQuery.value)
      return
    }

    await getAllTasks()
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

  async function onRowClick (_event: MouseEvent, row: any) {
    const id = row?.item?.raw?.id ?? row?.item?.id ?? row?.raw?.id ?? row?.id
    const numericId = Number(id)
    if (!Number.isFinite(numericId)) return

    emit('select', numericId)
  }

  onMounted(async () => {
    await loadItems()
  })

  defineExpose({
    reload: loadItems,
  })
</script>

<style scoped>
  :deep(.v-data-table tbody tr:hover) {
    cursor: pointer;
    background-color: rgba(var(--v-theme-on-surface), 0.06);
  }
</style>
