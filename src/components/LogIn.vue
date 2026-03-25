<template>
  <div class="d-flex justify-center mt-6">
    <v-card
      class="w-100"
      max-width="460"
      variant="elevated"
    >
      <v-card-title class="text-h5">Iniciar sesión</v-card-title>

      <v-card-text>
        <v-form ref="form" @submit.prevent="validate">
          <v-text-field
            v-model="email"
            autocomplete="email"
            label="Correo electrónico"
            required
            :rules="emailRules"
            type="email"
          />

          <v-text-field
            v-model="password"
            autocomplete="off"
            label="Contraseña"
            required
            :rules="passwordRules"
            type="password"
          />

          <v-btn
            block
            class="mt-4"
            color="success"
            type="submit"
          >
            Iniciar sesión
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()
  const form = ref()

  const email = ref('')
  const emailRules = ref([
    (v: any) => !!v || 'Introduzca su correo electrónico',
    (v: any) => (v && v.length <= 254) || 'El correo es demasiado largo',
    (v: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Correo electrónico inválido',
  ])
  const password = ref('')
  const passwordRules = ref([
    (v: any) => !!v || 'Introduzca su contraseña',
    (v: any) => (v && v.length >= 8) || 'La contraseña debe tener al menos 8 caracteres',
    (v: any) => (v && v.length <= 128) || 'Contraseña demasiado larga',
  ])

  async function validate () {
    const { valid } = await form.value.validate()

    // if (valid) alert('Form is valid')
    if (!valid) return

    try {
      // 1. Login para obtener tokens
      console.log('1. Realizando login...')
      const loginResponse = await cliente.post<{
        usuario?: unknown
        csrfToken?: string
      }>(
        `${API_BASE_URL}/auth/login`,
        { email: email.value },
      )

      console.log('✅ Login exitoso')
      console.log(`Usuario: ${JSON.stringify(loginResponse.data.usuario)}`)
      csrfToken.value = loginResponse.data.csrfToken ?? ''
      if (getCookie('csrf_token')) {
        console.log(`Token CSRF recibido: ${csrfToken.value.slice(0, 20)}...`)
      } else {
        console.log('Token CSRF no recibido en la respuesta')
      }
      console.log('Cookies configuradas automáticamente por el navegador\n')
      console.log('Llendo al Dashboard')
      for (let i = 0; i < 3; i++) {
        await sleep(50)
        console.log('.')
        await sleep(50)
      }
      await router.push('/dashboard')

      status.value = 'Prueba completada. Revisa la salida.'
    } catch (error) {
      hasError.value = true
      const message = error instanceof Error ? error.message : String(error)
      console.log(`❌ Error en las pruebas: ${message}`)
      status.value = `Error: ${message}`
    } finally {
      isRunning.value = false
    }
  }

  function sleep (ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Usar proxy de Vite: /api -> http://localhost:3003
  const API_BASE_URL = '/api'

  const csrfToken = ref('')
  const isRunning = ref(false)
  const status = ref('')
  const hasError = ref(false)

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
</script>
