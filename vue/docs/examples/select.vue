<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'beui-vue'
import { ref } from 'vue'
const framework = ref('next')
</script>
<template>
  <div class="framework">
    <Select v-model="framework">
      <SelectTrigger><SelectValue placeholder="Pick a framework" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="next">Next.js</SelectItem>
        <SelectItem value="remix">Remix</SelectItem>
        <SelectItem value="astro">Astro</SelectItem>
        <SelectItem value="vite">Vite</SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
<style scoped>.framework { width: 14rem; }</style>
