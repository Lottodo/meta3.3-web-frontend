<template>
  <div class="d-flex justify-center mt-6">
    <v-card
      class="w-100"
      :class="{ 'border-error': !!errorMessage }"
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
            style="font-size: 16px;"
            type="submit"
          >
            Iniciar sesión
          </v-btn>
        </v-form>

        <v-alert
          v-if="errorMessage"
          class="mt-4 mb-4"
          type="error"
        >
          {{ errorMessage }}
        </v-alert>

        <p>Si no tiene una cuenta, puede <router-link to="/signup">registrarse</router-link></p>
        <div class="google-oauth mt-2">
          <button class="btn-google" @click="loginWithGoogle">
            <svg class="google-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            </svg>
            <span>Iniciar sesión con Google</span>
          </button>
        </div>
        <p>Si no tiene una cuenta, puede <router-link to="/signup">registrarse</router-link></p>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { RouterLink, useRouter } from 'vue-router'

  const router = useRouter()
  const form = ref()

  const errorMessage = ref('')
  const email = ref('')
  const emailRules = ref([
    (v: any) => !!v || 'Introduzca su correo electrónico',
    (v: any) => (v && v.length <= 254) || 'El correo es demasiado largo',
    (v: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Correo electrónico inválido',
  ])
  const password = ref('')
  const passwordRules = ref([
    (v: any) => !!v || 'Introduzca su contraseña',
    (v: any) => (v && v.length >= 4) || 'La contraseña debe tener al menos 4 caracteres',
    (v: any) => (v && v.length <= 128) || 'Contraseña demasiado larga',
  ])

  async function validate () {
    const { valid } = await form.value.validate()

    // if (valid) alert('Form is valid')
    if (valid) {
      errorMessage.value = ''
    } else {
      errorMessage.value = 'Por favor completa todos los campos correctamente'
      return
    }

    try {
      // 1. Login para obtener tokens
      console.log('1. Realizando login...')
      const loginResponse = await cliente.post<{
        usuario?: unknown
        csrfToken?: string
      }>(
        `${API_BASE_URL}/auth/login`,
        { email: email.value, password: password.value },
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
      console.log(`❌ Error: ${message}`)
      errorMessage.value = message
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
        let message = ''
        if (typeof data === 'object' && data?.error) {
          message = data.error
        } else if (typeof data === 'string') {
          message = data
        } else {
          message = JSON.stringify(data)
        }
        throw new Error(message)
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
        let message = ''
        if (response.status === 502) {
          message = 'Error en el servidor. Por favor intenta más tarde.'
        } else if (typeof data === 'object' && data?.error) {
          message = data.error
        } else if (typeof data === 'string') {
          message = data
        } else {
          message = `Error ${response.status}: ${JSON.stringify(data)}`
        }
        throw new Error(message)
      }

      return { data: data as TResponse }
    },
  }
</script>

<style scoped>
  .border-error {
    border: 2px solid rgba(255, 0, 0, 0.548) !important;
  }
</style>

<style lang="css" scoped>
  .google-oauth {
    width: 100%;
  }
  .btn-google {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 24px;
  background-color: #3d3d3d;
  border: 1px solid #7a7b7c;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-google:hover {
  background-color: #363636;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #757575;
}

.btn-google:active {
  background-color: #313131;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.google-icon {
  width: 20px;
  height: 20px;
}
</style>
