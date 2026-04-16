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
      <TasksTableCard
        ref="tasksCardRef"
        @select="getTaskById"
      />

      <TaskDetailsCard
        v-model:completion="editCompletion"
        v-model:description="editDescription"
        v-model:title="editTitle"
        :selected-task="selectedTask"
        @completion-change="onCompletadaChange"
        @delete="onEliminar"
        @edit="onEditar"
      />
    </div>

  </v-container>
</template>

<script setup lang="ts">
  // import type { title } from 'process'
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import TaskDetailsCard from './TaskDetailsCard.vue'
  import TasksTableCard from './TasksTableCard.vue'

  const router = useRouter()
  const API_BASE_URL = '/api'

  type Tarea = {
    id: number
    title: string
    description: string
    completion: boolean
  }

  const tasksCardRef = ref<{ reload: () => Promise<void> } | null>(null)
  const detailsLoading = ref(false)

  const selectedTask = ref<Tarea | null>(null)

  const editTitle = ref('')
  const editDescription = ref('')
  const editCompletion = ref(false)

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

  async function getTaskById (id: number) {
    console.log('getTaskById:', id)
    detailsLoading.value = true
    try {
      const tareaEspecifica = await cliente.get<{
        tarea?: Partial<Tarea>
        tareaDb?: Partial<Tarea>
      }>(`${API_BASE_URL}/tareas/${id}`, {
        headers: {
          'x-csrf-token': getCookie('csrf_token'),
        },
      })

      const tarea = tareaEspecifica.data.tareaDb ?? tareaEspecifica.data.tarea
      const nextSelectedTask = tarea
        ? {
          id,
          title: tarea.title ?? '',
          description: tarea.description ?? '',
          completion: Boolean(tarea.completion),
        }
        : null

      selectedTask.value = nextSelectedTask

      editTitle.value = nextSelectedTask?.title ?? ''
      editDescription.value = nextSelectedTask?.description ?? ''
      editCompletion.value = nextSelectedTask?.completion ?? false
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error obteniendo tarea (id=${id}): ${message}`)
      selectedTask.value = null

      editTitle.value = ''
      editDescription.value = ''
      editCompletion.value = false
    } finally {
      detailsLoading.value = false
    }
  }

  async function onCompletadaChange (value: unknown) {
    const task = selectedTask.value
    if (!task) return

    const completion = Boolean(value)
    detailsLoading.value = true
    try {
      const patchResponse = await cliente.patch<{
        tarea?: Partial<Tarea>
        tareaDb?: Partial<Tarea>
      }>(`${API_BASE_URL}/tareas/${task.id}`, { completion })

      const tarea = patchResponse.data.tareaDb ?? patchResponse.data.tarea
      selectedTask.value = {
        id: task.id,
        title: tarea?.title ?? task.title,
        description: tarea?.description ?? task.description,
        completion: tarea?.completion ?? completion,
      }

      editCompletion.value = selectedTask.value.completion

      await tasksCardRef.value?.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error actualizando tarea (id=${task.id}): ${message}`)
    } finally {
      detailsLoading.value = false
    }
  }

  async function onEditar () {
    const task = selectedTask.value
    if (!task) return

    detailsLoading.value = true
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
      selectedTask.value = {
        id: task.id,
        title: tarea?.title ?? payloadPut.title,
        description: tarea?.description ?? payloadPut.description,
        completion: tarea?.completion ?? payloadPut.completion,
      }

      editTitle.value = selectedTask.value.title
      editDescription.value = selectedTask.value.description
      editCompletion.value = selectedTask.value.completion

      await tasksCardRef.value?.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error editando tarea (id=${task.id}): ${message}`)
    } finally {
      detailsLoading.value = false
    }
  }

  async function onEliminar () {
    const task = selectedTask.value
    if (!task) return

    detailsLoading.value = true
    try {
      await cliente.delete<{
        tarea?: Partial<Tarea>
        tareaDb?: Partial<Tarea>
      }>(`${API_BASE_URL}/tareas/${task.id}`)

      selectedTask.value = null
      editTitle.value = ''
      editDescription.value = ''
      editCompletion.value = false

      await tasksCardRef.value?.reload()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error eliminando tarea (id=${task.id}): ${message}`)
    } finally {
      detailsLoading.value = false
    }
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
