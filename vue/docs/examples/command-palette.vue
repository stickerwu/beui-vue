<script setup lang="ts">
import { h, ref } from 'vue'
import { CommandPalette } from 'beui-vue'

const open = ref(false)

// Lucide glyphs, as the original preview uses.
const glyph = (markup: string) => () => h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', innerHTML: markup })
const Home = glyph('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')
const User = glyph('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>')
const Settings = glyph('<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>')
const FileText = glyph('<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>')
const Plus = glyph('<path d="M5 12h14"/><path d="M12 5v14"/>')

const items = [
  { id: 'home', label: 'Go to Home', group: 'Navigation', icon: Home, hint: 'G H' },
  { id: 'profile', label: 'Open profile', group: 'Navigation', icon: User, hint: 'G P' },
  { id: 'settings', label: 'Settings', group: 'Navigation', icon: Settings },
  { id: 'new-doc', label: 'Create document', group: 'Actions', icon: FileText, hint: '⌘ N' },
  { id: 'new-project', label: 'New project', group: 'Actions', icon: Plus, hint: '⌘ ⇧ N' },
]
</script>

<template>
  <div class="palette-demo">
    <button type="button" class="palette-open" @click="open = true">Open command palette</button>
    <p class="palette-note">
      Press <kbd>⌘ J</kbd> (or <kbd>Ctrl J</kbd>) to open.
    </p>
    <CommandPalette v-model:open="open" no-trigger shortcut="j" :items="items" />
  </div>
</template>

<style scoped>
.palette-demo { display: flex; flex-direction: column; align-items: flex-start; gap: .75rem; }
.palette-open { display: inline-flex; height: 2.5rem; align-items: center; box-sizing: border-box; padding: 0 1.25rem; border: 1px solid var(--beui-border); border-radius: 9999px; background: var(--beui-card); color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 500; cursor: pointer; transition: transform .1s, border-color .15s; }
.palette-open:hover { border-color: color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.palette-open:active { transform: scale(.97); }
.palette-note { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.palette-note kbd { border: 1px solid var(--beui-border); border-radius: .25rem; background: var(--beui-card); padding: .125rem .375rem; font-family: var(--font-mono, "Geist Mono Variable", ui-monospace, monospace); font-size: .75rem; line-height: 1rem; color: var(--beui-foreground); }
</style>
