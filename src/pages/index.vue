<template>
  <v-container class="py-10">

    <div class="d-flex align-center ga-3">
      <img
        alt="Logo"
        height="44"
        src="/arc.png"
        width="44"
      >
      <h1 class="text-h3 ma-0">Lista de Tareas</h1>
    </div>

    <p>UABC, FIM, Diseño de Aplicaciones Web 2026-1</p>

    <LogIn />
    <Debug />
  </v-container>
</template>

<script lang="ts" setup>
  import Debug from '@/components/Debug.vue'
  import LogIn from '@/components/LogIn.vue'
</script>
