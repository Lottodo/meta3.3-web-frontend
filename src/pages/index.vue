<template>
  <v-container class="py-10">

    <h1 class="text-h3">Lista de Tareas</h1>
    <p>UABC, FIM, Diseño de Aplicaciones Web 2026-1</p>

    <LogIn />
    <Debug />
  </v-container>
</template>

<script lang="ts" setup>
  import Debug from '@/components/Debug.vue'
  import LogIn from '@/components/LogIn.vue'
</script>
