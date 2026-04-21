<template>
  <div class="notebook-bg">
    <Title />
    <LogIn />
    <v-container class="py-10">
      <Debug />
    </v-container>
  </div>
</template>

<script lang="ts" setup>
  import Debug from '@/components/login/Debug.vue'
  import LogIn from '@/components/login/LogIn.vue'
  import Title from '@/components/Title.vue'
</script>
