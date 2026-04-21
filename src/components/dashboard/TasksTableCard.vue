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
        <template #item.tags="{ value }">
          <div class="d-flex flex-wrap ga-1 py-1">
            <v-chip
              v-for="tagName in (Array.isArray(value) ? value : [])"
              :key="tagName"
              color="primary"
              size="x-small"
              variant="tonal"
            >
              {{ tagName }}
            </v-chip>

            <v-chip
              v-if="!Array.isArray(value) || value.length === 0"
              size="x-small"
              variant="outlined"
            >
              Sin tags
            </v-chip>
          </div>
        </template>

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

        <v-btn
          class="ml-2"
          color="success"
          variant="tonal"
          @click="abrirModalCrear"
        >
          Crear
        </v-btn>
      </div>
    </v-card-text>
  </v-card>

  <v-dialog
    v-model="isCreateModalOpen"
    max-width="760"
  >
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <span class="text-h6">Crear tarea</span>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="isCreateModalOpen = false"
        />
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="createTitle"
          autocomplete="off"
          :disabled="isCreatingTask"
          label="Título"
          placeholder="Escribe el título de la tarea"
        />

        <v-text-field
          v-model="createDescription"
          autocomplete="off"
          :disabled="isCreatingTask"
          label="Descripción"
          placeholder="Escribe la descripción"
        />

        <v-switch
          v-model="createCompletion"
          color="success"
          :disabled="isCreatingTask"
          hide-details
          inset
          label="Completada"
        />

        <div class="mt-4">
          <div class="text-subtitle-2 mb-2">Tags</div>

          <div class="d-flex flex-wrap ga-2 mb-4">
            <v-chip
              v-if="isCreateTagsLoading"
              size="small"
              variant="tonal"
            >
              Cargando tags...
            </v-chip>

            <template v-else>
              <v-chip
                v-for="tag in createAvailableTags"
                :key="`create-${tag.id}`"
                clickable
                :color="isCreateTagSelected(tag.id) ? 'success' : 'grey'"
                :disabled="isCreatingTask"
                size="small"
                :variant="isCreateTagSelected(tag.id) ? 'elevated' : 'outlined'"
                @click="toggleCreateTag(tag.id)"
              >
                {{ tag.name }}
              </v-chip>

              <v-chip
                v-if="createAvailableTags.length === 0"
                size="small"
                variant="outlined"
              >
                Aún no hay tags disponibles
              </v-chip>
            </template>
          </div>

          <div class="d-flex align-center ga-2">
            <v-text-field
              v-model="createNewTagName"
              autocomplete="off"
              class="flex-grow-1"
              :disabled="isCreatingTask || isCreatingTagFromCreate"
              hide-details
              label="Nuevo tag"
              placeholder="Escribe el nombre del tag"
              @keydown.enter.prevent="onCrearTagDesdeCrear"
            />
            <v-btn
              color="success"
              :disabled="isCreatingTask"
              :loading="isCreatingTagFromCreate"
              @click="onCrearTagDesdeCrear"
            >
              Agregar
            </v-btn>
          </div>
        </div>

        <div class="d-flex justify-end mt-6">
          <v-btn
            color="success"
            :loading="isCreatingTask"
            @click="onCrearTarea"
          >
            Crear
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'

  const API_BASE_URL = '/api'

  type Tarea = {
    id: number
    title: string
    description: string
    completion: boolean
    tags: string[]
  }

  const emit = defineEmits<{
    (e: 'select', id: number): void
  }>()

  const headers = [
    { title: 'Título', key: 'title' },
    { title: 'Tags', key: 'tags' },
    { title: 'Completada', key: 'completion' },
  ]

  const serverItems = ref<Tarea[]>([])
  const totalItems = ref(0)
  const loading = ref(false)
  const searchInput = ref('')
  const itemsPerPage = ref(10)

  const isCreateModalOpen = ref(false)
  const isCreatingTask = ref(false)
  const createTitle = ref('')
  const createDescription = ref('')
  const createCompletion = ref(false)

  const createAvailableTags = ref<Array<{ id: number, name: string }>>([])
  const isCreateTagsLoading = ref(false)
  const createSelectedTagIds = ref<number[]>([])
  const createNewTagName = ref('')
  const isCreatingTagFromCreate = ref(false)

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
      const csrfToken = getCookie('csrf_token')

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
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
    const tags = Array.isArray(raw.Tags)
      ? raw.Tags.map((tag: any) => String(tag?.name ?? '')).filter((name: string) => name.length > 0)
      : (Array.isArray(raw.tags)
        ? raw.tags.map((tag: any) => String(tag?.name ?? tag ?? '')).filter((name: string) => name.length > 0)
        : [])

    return {
      id,
      title,
      description,
      completion: Boolean(completionRaw),
      tags,
    }
  }

  async function cargarTagsDeTarea (taskId: number): Promise<string[]> {
    try {
      const response = await cliente.get<{ tags?: Array<{ name?: string }> }>(`${API_BASE_URL}/tareas/${taskId}/tags`)
      return Array.isArray(response.data.tags)
        ? response.data.tags.map(tag => String(tag?.name ?? '')).filter(name => name.length > 0)
        : []
    } catch {
      return []
    }
  }

  async function completarTags (tareas: Tarea[]): Promise<Tarea[]> {
    return Promise.all(
      tareas.map(async tarea => {
        if (tarea.tags.length > 0) return tarea

        const tags = await cargarTagsDeTarea(tarea.id)
        return {
          ...tarea,
          tags,
        }
      }),
    )
  }

  async function getAllTasks () {
    loading.value = true
    try {
      const tareasResponse = await cliente.get<{
        mensaje?: string
        total?: number
        tareas?: any[]
      }>(`${API_BASE_URL}/tareas/con-tags`)

      const tareasBase = (tareasResponse.data.tareas ?? [])
        .map(raw => normalizeTask(raw))
        .filter(Boolean) as Tarea[]

      const tareas = await completarTags(tareasBase)

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

      const tareasBase = rawTasks
        .map(raw => normalizeTask(raw))
        .filter(Boolean) as Tarea[]

      const tareas = await completarTags(tareasBase)

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

  async function cargarTagsParaCrear () {
    isCreateTagsLoading.value = true
    try {
      const response = await cliente.get<{ tags?: Array<{ id: number, name: string }> }>(`${API_BASE_URL}/tareas/tags/disponibles`)
      createAvailableTags.value = Array.isArray(response.data.tags) ? response.data.tags : []
    } catch {
      createAvailableTags.value = []
    } finally {
      isCreateTagsLoading.value = false
    }
  }

  function isCreateTagSelected (tagId: number): boolean {
    return createSelectedTagIds.value.includes(tagId)
  }

  function toggleCreateTag (tagId: number) {
    if (isCreatingTask.value) return

    if (isCreateTagSelected(tagId)) {
      createSelectedTagIds.value = createSelectedTagIds.value.filter(id => id !== tagId)
      return
    }

    createSelectedTagIds.value = [...createSelectedTagIds.value, tagId]
  }

  async function onCrearTagDesdeCrear () {
    const name = createNewTagName.value.trim()
    if (!name) return

    isCreatingTagFromCreate.value = true
    try {
      const response = await cliente.post<{ tag?: { id: number, name: string } }>(`${API_BASE_URL}/tareas/tags`, { name })
      const createdTag = response.data.tag
      if (!createdTag) return

      if (!createAvailableTags.value.some(tag => tag.id === createdTag.id)) {
        const next = [...createAvailableTags.value, createdTag]
        createAvailableTags.value = next.reduce<Array<{ id: number, name: string }>>((acc, tag) => {
          const insertAt = acc.findIndex(item => item.name.localeCompare(tag.name) > 0)
          if (insertAt === -1) {
            acc.push(tag)
          } else {
            acc.splice(insertAt, 0, tag)
          }
          return acc
        }, [])
      }

      if (!isCreateTagSelected(createdTag.id)) {
        createSelectedTagIds.value = [...createSelectedTagIds.value, createdTag.id]
      }

      createNewTagName.value = ''
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error creando tag desde modal Crear: ${message}`)
    } finally {
      isCreatingTagFromCreate.value = false
    }
  }

  async function abrirModalCrear () {
    createTitle.value = ''
    createDescription.value = ''
    createCompletion.value = false
    createSelectedTagIds.value = []
    createNewTagName.value = ''

    isCreateModalOpen.value = true
    await cargarTagsParaCrear()
  }

  async function onCrearTarea () {
    const title = createTitle.value.trim()
    if (!title) return

    isCreatingTask.value = true
    try {
      const response = await cliente.post<{ tarea?: { id?: number }, tareaDb?: { id?: number } }>(`${API_BASE_URL}/tareas`, {
        title,
        description: createDescription.value.trim(),
        completion: createCompletion.value,
      })

      const createdTaskId = Number(response.data.tareaDb?.id ?? response.data.tarea?.id)

      if (Number.isFinite(createdTaskId) && createdTaskId > 0 && createSelectedTagIds.value.length > 0) {
        await Promise.all(
          createSelectedTagIds.value.map(tagId =>
            cliente.post(`${API_BASE_URL}/tareas/${createdTaskId}/tags/${tagId}`, {}),
          ),
        )
      }

      isCreateModalOpen.value = false
      await loadItems()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error creando tarea: ${message}`)
    } finally {
      isCreatingTask.value = false
    }
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
