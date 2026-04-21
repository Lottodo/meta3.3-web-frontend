<template>
  <div class="notebook-bg">
    <Title />

    <v-container class="mt-6 d-flex flex-column align-center">
      <SignupCard class="mt-4" />
      <div class="w-100 d-flex justify-end py-3" style="max-width: 460px">
        <v-btn
          prepend-icon="mdi-arrow-left"
          to="/"
          variant="tonal"
        >Volver</v-btn>
      </div>
    </v-container>
  </div>
</template>

<script lang="ts" setup>
  import SignupCard from '@/components/signup/SignupCard.vue'
  import Title from '@/components/Title.vue'
</script>
