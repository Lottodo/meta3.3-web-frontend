<template>
  <div class="mt-6">
    <v-switch
      v-model="showDebug"
      hide-details
      label="debug"
    />

    <v-expand-transition>
      <div v-show="showDebug">
        <div class="mt-2 d-flex ga-3">
          <v-btn
            color="primary"
            :disabled="isRunning"
            :loading="isRunning"
            @click="probarAPI()"
          >
            Probar API
          </v-btn>

          <v-btn
            :disabled="isRunning || logs.length === 0"
            variant="tonal"
            @click="limpiar"
          >
            Limpiar
          </v-btn>
        </div>

        <v-alert
          v-if="status"
          class="mt-4"
          :type="statusType"
          variant="tonal"
        >
          {{ status }}
        </v-alert>

        <v-card class="mt-6" variant="tonal">
          <v-card-title>Salida</v-card-title>
          <v-card-text>
            <pre style="white-space: pre-wrap; margin: 0">{{ logs.join('\n') }}</pre>
          </v-card-text>
        </v-card>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'

  // Usar proxy de Vite: /api -> http://localhost:3003
  const API_BASE_URL = '/api'

  const isRunning = ref(false)
  const status = ref('')
  const hasError = ref(false)
  const logs = ref<string[]>([])
  const showDebug = ref(false)

  type ClienteOptions = {
    headers?: Record<string, string>
  }

  function getCookie (name: string): string {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='))
      ?.split('=')[1] || ''
  }

  function logLine (message: string) {
    logs.value.push(message)
    // Mantener también el log en consola
    console.log(message)
  }

  function limpiar () {
    logs.value = []
    status.value = ''
    hasError.value = false
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

  const statusType = computed(() => (hasError.value ? 'error' : 'success'))

  async function probarAPI (email = 'usuario@ejemplo.com') {
    limpiar()
    logLine('=== Probando API de Tareas con JWT y Cookies HTTP-Only ===\n')

    isRunning.value = true
    status.value = 'Ejecutando prueba...'
    hasError.value = false

    try {
      // 1. Login para obtener tokens
      logLine('1. Realizando login...')
      const loginResponse = await cliente.post<{
        usuario?: unknown
        csrfToken?: string
      }>(
        `${API_BASE_URL}/auth/login`,
        { email: email },
      )

      logLine('✅ Login exitoso')
      logLine(`Usuario: ${JSON.stringify(loginResponse.data.usuario)}`)
      if (getCookie('csrf_token')) {
        logLine(`Token CSRF recibido: ${getCookie('csrf_token').slice(0, 20)}...`)
      } else {
        logLine('Token CSRF no recibido en la respuesta')
      }
      logLine('Cookies configuradas automáticamente por el navegador\n')

      // 2. Verificar autenticación
      logLine('2. Verificando autenticación...')
      const verifyResponse = await cliente.get<{
        usuario?: { email?: string, id?: string | number }
      }>(`${API_BASE_URL}/auth/verify`, {
        headers: {
          'x-csrf-token': getCookie('csrf_token'),
        },
      })

      logLine('✅ Autenticación verificada')
      logLine(`Usuario autenticado: ${verifyResponse.data.usuario?.email ?? '(sin email)'}`)
      logLine(`ID de usuario: ${verifyResponse.data.usuario?.id ?? '(sin id)'}\n`)

      // 3. Crear una nueva tarea
      logLine('3. Creando nueva tarea...')
      const nuevaTarea = {
        titulo: 'Comprar víveres',
        descripcion: 'Leche, huevos, pan y frutas',
        completada: false,
      }

      const crearResponse = await cliente.post<{
        tarea?: { id?: string | number, usuarioId?: string | number, fechaCreacion?: string }
      }>(`${API_BASE_URL}/tareas`, nuevaTarea, {
        headers: {
          'x-csrf-token': getCookie('csrf_token'),
        },
      })

      logLine('✅ Tarea creada exitosamente')
      logLine(`Tarea creada: ${JSON.stringify(crearResponse.data.tarea)}`)
      logLine(`ID de tarea: ${String(crearResponse.data.tarea?.id ?? '(sin id)')}`)
      logLine(`Usuario ID: ${String(crearResponse.data.tarea?.usuarioId ?? '(sin usuarioId)')}`)
      logLine(`Fecha creación: ${String(crearResponse.data.tarea?.fechaCreacion ?? '(sin fecha)')}\n`)

      // 4. Crear otra tarea
      logLine('4. Creando segunda tarea...')
      const segundaTarea = {
        titulo: 'Estudiar Node.js',
        descripcion: 'Repasar autenticación JWT y cookies',
        completada: true,
      }

      await cliente.post(`${API_BASE_URL}/tareas`, segundaTarea, {
        headers: {
          'x-csrf-token': getCookie('csrf_token'),
        },
      })

      logLine('✅ Segunda tarea creada\n')

      // 5. Obtener todas las tareas
      logLine('5. Obteniendo todas las tareas...')
      const tareasResponse = await cliente.get<{
        total?: number
        tareas?: Array<{ titulo?: string, completada?: boolean }>
      }>(`${API_BASE_URL}/tareas`, {
        headers: {
          'x-csrf-token': getCookie('csrf_token'),
        },
      })

      logLine('✅ Tareas obtenidas exitosamente')
      logLine(`Total de tareas: ${String(tareasResponse.data.total ?? '(sin total)')}`)
      logLine('Lista de tareas:')
      for (const [index, tarea] of (tareasResponse.data.tareas ?? []).entries()) {
        const estado = tarea.completada ? '✅ Completada' : '⏳ Pendiente'
        logLine(`  ${index + 1}. ${tarea.titulo ?? '(sin título)'} - ${estado}`)
      }
      logLine('')

      // 6. Obtener una tarea específica
      logLine('6. Obteniendo tarea específica (ID: 1)...')
      const tareaEspecifica = await cliente.get<{
        tarea?: { titulo?: string, descripcion?: string, completada?: boolean }
      }>(`${API_BASE_URL}/tareas/1`, {
        headers: {
          'x-csrf-token': getCookie('csrf_token'),
        },
      })

      logLine('✅ Tarea específica obtenida')
      logLine('Detalles:')
      logLine(`  Título: ${tareaEspecifica.data.tarea?.titulo ?? '(sin título)'}`)
      logLine(`  Descripción: ${tareaEspecifica.data.tarea?.descripcion ?? '(sin descripción)'}`)
      logLine(`  Estado: ${tareaEspecifica.data.tarea?.completada ? 'Completada' : 'Pendiente'}\n`)

      // 7. Intentar acceder sin token CSRF (debería fallar)
      logLine('7. Probando protección CSRF (intento sin token CSRF)...')
      try {
        // Nota: cliente.get() siempre inyecta el header x-csrf-token.
        // Para probar "sin enviar token CSRF", hacemos fetch directo sin headers.
        const response = await fetch(`${API_BASE_URL}/tareas`, {
          method: 'GET',
          credentials: 'include',
        })

        const data = await parseBody(response)

        if (response.ok) {
          const message = typeof data === 'string' ? data : JSON.stringify(data)
          throw new Error(`❌ ERROR: Debería haber fallado sin token CSRF (respuesta: ${message})`)
        }

        logLine('✅ Correcto: Solicitud rechazada sin token CSRF')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (String(message).includes('Debería haber fallado')) {
          logLine(message)
        } else {
          logLine(`  Error: ${message}`)
        }
      }
      logLine('')
      // 8. Logout
      logLine('8. Realizando logout...')
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

      logLine(`✅ Logout exitoso: ${logoutResponse.data.mensaje ?? '(sin mensaje)'}`)
      logLine('')

      // 9. Intentar acceder después de logout (debería fallar)
      logLine('9. Intentando acceder después de logout...')
      try {
        await cliente.get(`${API_BASE_URL}/tareas`, {
          headers: {
            'x-csrf-token': getCookie('csrf_token'),
          },
        })
        logLine('❌ ERROR: Debería haber fallado después de logout')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logLine('✅ Correcto: Acceso denegado después de logout')
        logLine(`  Error: ${message}`)
      }

      logLine('\n=== Todas las pruebas completadas exitosamente ===')
      status.value = 'Prueba completada. Revisa la salida.'
    } catch (error) {
      hasError.value = true
      const message = error instanceof Error ? error.message : String(error)
      logLine(`❌ Error en las pruebas: ${message}`)
      status.value = `Error: ${message}`
    } finally {
      isRunning.value = false
    }
  }
</script>
