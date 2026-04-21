<template>
  <v-card
    class="w-100"
    max-width="460"
    variant="elevated"
  >
    <v-card-title class="text-h5">Registro de usuario</v-card-title>

    <v-card-text>
      <v-form ref="form" @submit.prevent="validate">
        <v-text-field
          v-model="name"
          autocomplete="name"
          label="Nombre"
          required
          :rules="nameRules"
          type="text"
        />

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
          Registrarse
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'

  const router = useRouter()
  const form = ref()

  const API_BASE_URL = '/api'

  const isRunning = ref(false)
  const status = ref('')
  const hasError = ref(false)

  const name = ref('')
  const nameRules = ref([
    (v: any) => !!v || 'Introduzca su nombre',
    (v: any) => (v && v.length <= 254) || 'El nombre es demasiado largo',
    (v: any) => /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/.test(String(v).trim()) || 'Nombre inválido',
  ])
  const email = ref('')
  const emailRules = ref([
    (v: any) => !!v || 'Introduzca su correo electrónico',
    (v: any) => (v && v.length <= 254) || 'El correo es demasiado largo',
    (v: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Nombre inválido',
  ])
  const password = ref('')
  const passwordRules = ref([
    (v: any) => !!v || 'Introduzca su contraseña',
    (v: any) => (v && v.length >= 4) || 'La contraseña debe tener al menos 4 caracteres',
    (v: any) => (v && v.length <= 128) || 'Contraseña demasiado larga',
  ])

  async function validate () {
    const { valid } = await form.value?.validate()
    if (!valid) return

    isRunning.value = true
    hasError.value = false
    status.value = ''

    try {
      // Backend esperado (lo harás tú): POST /api/auth/signup
      // Body: { name, email, password }
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          password: password.value,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text()

      if (!response.ok) {
        const message = typeof data === 'string'
          ? data
          : (data?.error || data?.mensaje || JSON.stringify(data))
        throw new Error(message)
      }

      status.value = 'Registro exitoso. Ahora puedes iniciar sesión.'
      await router.push('/')
    } catch (error) {
      hasError.value = true
      const message = error instanceof Error ? error.message : String(error)
      status.value = `Error: ${message}`
    } finally {
      isRunning.value = false
    }
  }

</script>
