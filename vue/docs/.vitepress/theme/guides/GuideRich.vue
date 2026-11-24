<script setup lang="ts">
import { computed } from 'vue'

/** Guide copy with inline code: text between backticks renders as `<code>`, like upstream's rich `<code>` chunks. */
const props = defineProps<{ text: string }>()
const parts = computed(() => props.text.split('`').map((text, index) => ({ text, code: index % 2 === 1 })).filter(part => part.text))
</script>

<template>
  <template v-for="(part, index) in parts" :key="index"><code v-if="part.code" class="beui-ag-code">{{ part.text }}</code><template v-else>{{ part.text }}</template></template>
</template>
