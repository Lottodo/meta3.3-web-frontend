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
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            v-if="!selectedTask"
            size="small"
            variant="tonal"
          >
            Sin selección
          </v-chip>

          <v-chip
            v-else-if="isTagsLoading"
            size="small"
            variant="tonal"
          >
            Cargando tags...
          </v-chip>

          <v-chip
            v-for="tag in taskTags"
            v-else
            :key="tag.id"
            color="primary"
            size="small"
            variant="tonal"
          >
            {{ tag.name }}
          </v-chip>

          <v-chip
            v-if="selectedTask && !isTagsLoading && taskTags.length === 0"
            size="small"
            variant="outlined"
          >
            Sin tags asignados
          </v-chip>
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

  const editTitle = ref('')
  const editDescription = ref('')
  const editCompletion = ref(false)
  const taskTags = ref<Tag[]>([])

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

    async put<TResponse>(url: string, body: unknown, options: ClienteOptions = {}) {
      const csrfToken = getCookie('csrf_token')

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
      const csrfToken = getCookie('csrf_token')

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
      const csrfToken = getCookie('csrf_token')

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
