<script setup lang="ts">
import CitationFavicon from './CitationFavicon.vue'
import type { CitationItem } from './shared'

withDefaults(defineProps<{ citations: CitationItem[], limit?: number }>(), { limit: 3 })
</script>

<template>
  <span class="cs" aria-hidden="true"><CitationFavicon v-for="citation in citations.slice(0, limit)" :key="citation.id" :url="citation.url" :icon="citation.icon" class="cs-item" /></span>
</template>

<style scoped>
.cs { display: flex; }
.cs .cs-item { width: 1.5rem; height: 1.5rem; border-radius: 9999px; background: var(--beui-background); box-shadow: 0 0 0 2px var(--beui-background); }
.cs .cs-item + .cs-item { margin-left: -.375rem; }
</style>
