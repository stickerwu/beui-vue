<script setup lang="ts">
import { MorphingSearch, type MorphingSearchItem } from 'beui-vue'

// lucide FolderOpen, Blocks, Bot, BookOpen, Palette.
const icons: Record<string, string> = {
  'project-folder': '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  'motion-components': '<rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3"/>',
  'agent-interfaces': '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  installation: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  'design-tokens': '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
}

const items: MorphingSearchItem[] = [
  { id: 'project-folder', title: 'Project Folder', description: 'Block · Files and previews', keywords: ['files', 'overlay'] },
  { id: 'motion-components', title: 'Motion components', description: 'Collection · Interaction primitives', keywords: ['animation', 'components'] },
  { id: 'agent-interfaces', title: 'Agent interfaces', description: 'Collection · AI building blocks', keywords: ['ai', 'chat'] },
  { id: 'installation', title: 'Installation guide', description: 'Documentation · Add your first component', keywords: ['setup', 'shadcn'] },
  { id: 'design-tokens', title: 'Design tokens', description: 'Documentation · Color, type, and motion', keywords: ['theme', 'styles'] },
]
</script>

<template>
  <div class="search-stage">
    <MorphingSearch :items="items" placeholder="Find components">
      <template #icon="{ item }"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons[item.id]" /></template>
    </MorphingSearch>
    <MorphingSearch :items="items" placeholder="Find components" shortcut="" icon-only>
      <template #icon="{ item }"><svg viewBox="0 0 24 24" aria-hidden="true" v-html="icons[item.id]" /></template>
    </MorphingSearch>
  </div>
</template>

<style scoped>
.search-stage { display: flex; width: 100%; max-width: 22rem; align-items: center; gap: .75rem; }
</style>
