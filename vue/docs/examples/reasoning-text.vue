<script setup lang="ts">
import { ReasoningText } from 'beui-vue'

const EXAMPLES = [
  { label: 'Cascade', variant: 'cascade', phrases: ['Thinking', 'Reading the request', 'Working through the details', 'Preparing the answer'] },
  { label: 'Swap', variant: 'swap', phrases: ['Thinking', 'Reading the request', 'Working through the details', 'Preparing the answer'] },
  { label: 'Scramble', variant: 'scramble', phrases: ['Thinking', 'Searching', 'Reasoning', 'Composing'] },
] as const
</script>

<template>
  <div style="display:grid;width:100%;max-width:24rem;gap:1.75rem">
    <div v-for="example in EXAMPLES" :key="example.variant" style="display:grid;gap:.5rem">
      <span style="font-size:11px;line-height:1rem;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:color-mix(in oklab,var(--beui-muted-foreground) 60%,transparent)">{{ example.label }}</span>
      <ReasoningText :variant="example.variant" :phrases="[...example.phrases]" style="font-size:1rem;line-height:1.5rem" />
    </div>
  </div>
</template>
