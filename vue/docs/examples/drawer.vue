<script setup lang="ts">
import { ref } from 'vue'
import { Drawer } from 'beui-vue'

const open = ref(false)
const side = ref<'left' | 'right'>('right')

function openWith(next: 'left' | 'right') {
  side.value = next
  open.value = true
}
</script>

<template>
  <div class="actions">
    <button type="button" class="secondary" @click="openWith('left')">Open left</button>
    <button type="button" class="primary" @click="openWith('right')">Open right</button>

    <Drawer v-model:open="open" :side="side" label="Demo drawer" class="panel">
      <h2>Drawer</h2>
      <p>Slides in from the {{ side }}. Press Esc or click outside to close.</p>
      <button type="button" class="secondary close" @click="open = false">Close</button>
    </Drawer>
  </div>
</template>

<style scoped>
.actions { display: flex; align-items: center; gap: .75rem; }
button { display: inline-flex; box-sizing: border-box; align-items: center; justify-content: center; height: 2.5rem; padding: 0 1.25rem; border: 1px solid transparent; border-radius: 999px; font: inherit; font-size: .875rem; font-weight: 500; line-height: 1.25rem; cursor: pointer; transition: background-color .15s, color .15s; }
.secondary { border-color: var(--beui-border); background: var(--beui-card); color: var(--beui-foreground); }
.secondary:hover { background: color-mix(in srgb, var(--beui-card) 70%, transparent); }
.primary { background: var(--beui-primary); color: var(--beui-primary-foreground); }
.primary:hover { background: color-mix(in srgb, var(--beui-primary) 90%, transparent); }
:global(.be-drawer.panel) { gap: 1rem; padding: 1.5rem; }
h2 { margin: 0; font-size: .875rem; line-height: 1.25rem; font-weight: 600; color: var(--beui-foreground); }
p { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.close { margin-top: auto; }
</style>
