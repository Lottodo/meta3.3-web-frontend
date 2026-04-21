<template>
  <v-card class="flex-1-1-0" min-width="320" variant="elevated">
    <v-card-title class="text-h5">Detalles de la tarea</v-card-title>
    <v-card-text>
      <v-text-field
        v-model="editTitle"
        autocomplete="off"
        :disabled="!selectedTask || isLoading"
        label="Título"
        placeholder="Selecciona una tarea para ver sus detalles"
      />
      <v-textarea
        v-model="editDescription"
        auto-grow
        autocomplete="off"
        :disabled="!selectedTask || isLoading"
        label="Descripción"
        placeholder="(sin selección)"
      />

      <div class="mb-4">
        <div class="text-subtitle-2 mb-2">Tags asignados</div>
        <div class="d-flex align-center flex-wrap ga-2">
          <template v-if="!selectedTask">
            <v-chip
              size="small"
              variant="tonal"
            >
              Sin selección
            </v-chip>
          </template>

          <template v-else-if="isTagsLoading">
            <v-chip
              size="small"
              variant="tonal"
            >
              Cargando tags...
            </v-chip>
          </template>

          <template v-else>
            <v-chip
              v-for="tag in taskTags"
              :key="tag.id"
              color="primary"
              size="small"
              variant="tonal"
            >
              {{ tag.name }}
            </v-chip>

            <v-chip
              v-if="taskTags.length === 0"
              size="small"
              variant="outlined"
            >
              Sin tags asignados
            </v-chip>
          </template>

          <v-btn
            :disabled="!selectedTask"
            icon="mdi-plus"
            size="small"
            variant="outlined"
            @click="abrirModalTags"
          />
        </div>
      </div>

      <div class="d-flex align-center justify-space-between">
        <v-switch
          v-model="editCompletion"
          color="success"
          :disabled="!selectedTask || isLoading"
          hide-details
          inset
          label="Completada"
          @update:model-value="onCompletadaChange"
        />

        <div class="d-flex ga-2">
          <v-btn
            color="secondary"
            :disabled="!selectedTask || isLoading"
            @click="onEditar"
          >
            Editar
          </v-btn>
          <v-btn
            color="error"
            :disabled="!selectedTask || isLoading"
            @click="onEliminar"
          >
            Eliminar
          </v-btn>
        </div>
      </div>
    </v-card-text>
  </v-card>

  <v-dialog
    v-model="isTagsModalOpen"
    max-width="720"
  >
    <v-card>
      <v-card-title class="d-flex align-center ga-2">
        <span class="text-h6">Tags disponibles</span>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          @click="isTagsModalOpen = false"
        />
      </v-card-title>

      <v-card-text>
        <div class="d-flex flex-wrap ga-2 mb-6">
          <template v-if="isAvailableTagsLoading">
            <v-chip
              size="small"
              variant="tonal"
            >
              Cargando tags...
            </v-chip>
          </template>

          <template v-else>
            <v-chip
              v-for="tag in availableTags"
              :key="`available-${tag.id}`"
              clickable
              :color="isTagLinked(tag.id) ? 'success' : 'grey'"
              :disabled="!selectedTask || isTagUpdating(tag.id)"
              size="small"
              :variant="isTagLinked(tag.id) ? 'elevated' : 'outlined'"
              @click="onToggleTag(tag)"
            >
              {{ tag.name }}
            </v-chip>

            <v-chip
              v-if="availableTags.length === 0"
              size="small"
              variant="outlined"
            >
              Aún no hay tags disponibles
            </v-chip>
          </template>
        </div>

        <div class="d-flex align-center ga-2">
          <v-text-field
            v-model="newTagName"
            autocomplete="off"
            class="flex-grow-1"
            hide-details
            label="Nuevo tag"
            placeholder="Escribe el nombre del tag"
            @keydown.enter.prevent="onAgregarTag"
          />
          <v-btn
            color="success"
            :loading="isAddingTag"
            @click="onAgregarTag"
          >
            Agregar
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'

  type Tarea = {
    id: number
    title: string
    description: string
    completion: boolean
  }

  type Tag = {
    id: number
    name: string
  }

  const props = defineProps<{
    selectedTask: Tarea | null
    apiBaseUrl?: string
  }>()

  const emit = defineEmits<{
    (e: 'task-updated', value: Tarea): void
    (e: 'task-cleared' | 'reload'): void
  }>()

  const API_BASE_URL = props.apiBaseUrl ?? '/api'

  const isLoading = ref(false)
  const isTagsLoading = ref(false)
  const isTagsModalOpen = ref(false)
  const isAvailableTagsLoading = ref(false)
  const isAddingTag = ref(false)
  const tagsEnActualizacion = ref<number[]>([])

  const editTitle = ref('')
  const editDescription = ref('')
  const editCompletion = ref(false)
  const taskTags = ref<Tag[]>([])
  const availableTags = ref<Tag[]>([])
  const newTagName = ref('')

  const csrfTokenInicial = getCookie('csrf_token')
  if (csrfTokenInicial) {
    sessionStorage.setItem('csrf_token', csrfTokenInicial)
    localStorage.setItem('csrf_token', csrfTokenInicial)
  }

  watch(
    () => props.selectedTask,
    async task => {
      editTitle.value = task?.title ?? ''
      editDescription.value = task?.description ?? ''
      editCompletion.value = task?.completion ?? false
      await cargarTagsDeTarea(task?.id)
    },
    { immediate: true },
  )

  type ClienteOptions = {
    headers?: Record<string, string>
  }

  function getCookie (name: string): string {
    const prefix = `${name}=`
    const cookies = document.cookie.split(';')

    for (const cookie of cookies) {
      const trimmed = cookie.trim()
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length))
      }
    }

    return ''
  }

  function getCsrfToken (): string {
    return getCookie('csrf_token')
      || sessionStorage.getItem('csrf_token')
      || localStorage.getItem('csrf_token')
      || ''
  }

  async function parseBody (response: Response) {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) return response.json()
    return response.text()
  }

  const cliente = {
    async get<TResponse>(url: string, options: ClienteOptions = {}) {
      const csrfToken = getCsrfToken()

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
      const csrfToken = getCsrfToken()

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

    async put<TResponse>(url: string, body: unknown, options: ClienteOptions = {}) {
      const csrfToken = getCsrfToken()

      const response = await fetch(url, {
        method: 'PUT',
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

    async patch<TResponse>(url: string, body: unknown, options: ClienteOptions = {}) {
      const csrfToken = getCsrfToken()

      const response = await fetch(url, {
        method: 'PATCH',
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

    async delete<TResponse>(url: string, options: ClienteOptions = {}) {
      const csrfToken = getCsrfToken()

      const response = await fetch(url, {
        method: 'DELETE',
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

  async function cargarTagsDeTarea (taskId?: number) {
    if (!taskId) {
      taskTags.value = []
      return
    }

    isTagsLoading.value = true
    try {
      const response = await cliente.get<{ tags?: Tag[] }>(`${API_BASE_URL}/tareas/${taskId}/tags`)
      taskTags.value = Array.isArray(response.data.tags) ? response.data.tags : []
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error obteniendo tags (tarea id=${taskId}): ${message}`)
      taskTags.value = []
    } finally {
      isTagsLoading.value = false
    }
  }

  async function cargarTagsDisponibles () {
    isAvailableTagsLoading.value = true
    try {
      const response = await cliente.get<{ tags?: Tag[] }>(`${API_BASE_URL}/tareas/tags/disponibles`)
      availableTags.value = Array.isArray(response.data.tags) ? response.data.tags : []
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error obteniendo tags disponibles: ${message}`)
      availableTags.value = []
    } finally {
      isAvailableTagsLoading.value = false
    }
  }

  async function abrirModalTags () {
    isTagsModalOpen.value = true
    await cargarTagsDisponibles()
  }

  function isTagLinked (tagId: number): boolean {
    return taskTags.value.some(tag => tag.id === tagId)
  }

  function isTagUpdating (tagId: number): boolean {
    return tagsEnActualizacion.value.includes(tagId)
  }

  async function onToggleTag (tag: Tag) {
    const task = props.selectedTask
    if (!task) return
    if (isTagUpdating(tag.id)) return

    tagsEnActualizacion.value = [...tagsEnActualizacion.value, tag.id]
    try {
      if (isTagLinked(tag.id)) {
        await cliente.delete(`${API_BASE_URL}/tareas/${task.id}/tags/${tag.id}`)
        taskTags.value = taskTags.value.filter(item => item.id !== tag.id)
      } else {
        await cliente.post(`${API_BASE_URL}/tareas/${task.id}/tags/${tag.id}`, {})
        taskTags.value = [...taskTags.value, tag]
      }

      emit('reload')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error actualizando relación tarea-tag: ${message}`)
    } finally {
      tagsEnActualizacion.value = tagsEnActualizacion.value.filter(id => id !== tag.id)
    }
  }

  async function onAgregarTag () {
    const name = newTagName.value.trim()
    if (!name) return

    isAddingTag.value = true
    try {
      const response = await cliente.post<{ tag?: Tag }>(`${API_BASE_URL}/tareas/tags`, { name })
      const createdTag = response.data.tag

      if (createdTag && !availableTags.value.some(tag => tag.id === createdTag.id)) {
        const nextTags = [...availableTags.value, createdTag]
        availableTags.value = nextTags.reduce<Tag[]>((acc, tag) => {
          const insertAt = acc.findIndex(item => item.name.localeCompare(tag.name) > 0)
          if (insertAt === -1) {
            acc.push(tag)
          } else {
            acc.splice(insertAt, 0, tag)
          }
          return acc
        }, [])
      }

      newTagName.value = ''
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error creando tag: ${message}`)
    } finally {
      isAddingTag.value = false
    }
  }

  async function onCompletadaChange (value: unknown) {
    const task = props.selectedTask
    if (!task) return

    const completion = Boolean(value)
    isLoading.value = true
    try {
      const patchResponse = await cliente.patch<{
        tarea?: Partial<Tarea>
        tareaDb?: Partial<Tarea>
      }>(`${API_BASE_URL}/tareas/${task.id}`, { completion })

      const tarea = patchResponse.data.tareaDb ?? patchResponse.data.tarea
      const updatedTask: Tarea = {
        id: task.id,
        title: tarea?.title ?? task.title,
        description: tarea?.description ?? task.description,
        completion: tarea?.completion ?? completion,
      }

      editCompletion.value = updatedTask.completion
      emit('task-updated', updatedTask)
      emit('reload')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error actualizando tarea (id=${task.id}): ${message}`)
      editCompletion.value = task.completion
    } finally {
      isLoading.value = false
    }
  }

  async function onEditar () {
    const task = props.selectedTask
    if (!task) return

    isLoading.value = true
    try {
      const payloadPut = {
        title: editTitle.value,
        description: editDescription.value,
        completion: editCompletion.value,
      }

      const putResponse = await cliente.put<{
        tarea?: Partial<Tarea>
        tareaDb?: Partial<Tarea>
      }>(`${API_BASE_URL}/tareas/${task.id}`, payloadPut)

      const tarea = putResponse.data.tareaDb ?? putResponse.data.tarea
      const updatedTask: Tarea = {
        id: task.id,
        title: tarea?.title ?? payloadPut.title,
        description: tarea?.description ?? payloadPut.description,
        completion: tarea?.completion ?? payloadPut.completion,
      }

      editTitle.value = updatedTask.title
      editDescription.value = updatedTask.description
      editCompletion.value = updatedTask.completion

      emit('task-updated', updatedTask)
      emit('reload')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error editando tarea (id=${task.id}): ${message}`)
    } finally {
      isLoading.value = false
    }
  }

  async function onEliminar () {
    const task = props.selectedTask
    if (!task) return

    isLoading.value = true
    try {
      await cliente.delete(`${API_BASE_URL}/tareas/${task.id}`)

      emit('task-cleared')
      emit('reload')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error eliminando tarea (id=${task.id}): ${message}`)
    } finally {
      isLoading.value = false
    }
  }
</script>
