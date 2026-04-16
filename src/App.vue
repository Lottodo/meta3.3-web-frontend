<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
  //
</script>

<style>
.notebook-bg{
  min-height: 100vh;
  /* color base */

  /* cuadrícula */
  background-image:
    repeating-linear-gradient(0deg,
      rgba(189, 189, 189, 0.08) 0,
      rgba(189, 189, 189, 0.08) 1px,
      transparent 1px,
      transparent 24px
    ),
    repeating-linear-gradient(90deg,
      rgba(189, 189, 189, 0.08) 0,
      rgba(189, 189, 189, 0.08) 1px,
      transparent 1px,
      transparent 24px
    );
}
</style>
