<script setup lang="ts">
import { ref } from 'vue'
import { BottomSheet } from 'beui-vue'

const open = ref(false)
const items = ['Share', 'Duplicate', 'Move to folder', 'Rename', 'Archive', 'Delete']
</script>

<template>
  <button type="button" class="trigger" @click="open = true">Open bottom sheet</button>
  <BottomSheet v-model:open="open" :snap-points="[0.4, 0.85]" title="Quick actions" description="Drag the handle, fling, or swipe down to dismiss.">
    <ul>
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
    <div class="hint">Fling up to expand, fling down to dismiss.</div>
  </BottomSheet>
</template>

<style scoped>
.trigger { display: inline-flex; box-sizing: border-box; align-items: center; height: 2.5rem; padding: 0 1.25rem; border: 1px solid var(--beui-border); border-radius: 999px; background: var(--beui-card); color: var(--beui-foreground); font: inherit; font-size: .875rem; font-weight: 500; line-height: 1.25rem; cursor: pointer; transition: border-color .15s, transform .1s; }
.trigger:hover { border-color: color-mix(in srgb, var(--beui-foreground) 18%, transparent); }
.trigger:active { transform: scale(.97); }
ul { margin: 0; padding: 0; list-style: none; }
li { padding: .75rem 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-foreground); }
li:not(:last-child) { border-bottom: 1px solid var(--beui-border); }
.hint { padding: 3rem 0; text-align: center; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
</style>
