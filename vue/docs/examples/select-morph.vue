<script setup lang="ts">
import { MorphSelect, MorphSelectContent, MorphSelectItem, MorphSelectTrigger, MorphSelectValue } from 'beui-vue'
import { ref } from 'vue'
const framework = ref('next')
</script>
<template>
  <div class="framework">
    <MorphSelect v-model="framework">
      <MorphSelectTrigger><MorphSelectValue placeholder="Pick a framework" /></MorphSelectTrigger>
      <MorphSelectContent>
        <MorphSelectItem value="next">Next.js</MorphSelectItem>
        <MorphSelectItem value="remix">Remix</MorphSelectItem>
        <MorphSelectItem value="astro">Astro</MorphSelectItem>
        <MorphSelectItem value="vite">Vite</MorphSelectItem>
      </MorphSelectContent>
    </MorphSelect>
  </div>
</template>
<style scoped>.framework { width: 14rem; }</style>
