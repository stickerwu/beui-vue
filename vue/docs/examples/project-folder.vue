<script setup lang="ts">
import { ProjectFolder } from 'beui-vue'

const previews = [
  { id: 'moss', color: 'bg-emerald-200', mark: 'A' },
  { id: 'clay', color: 'bg-orange-200', mark: 'B' },
  { id: 'sky', color: 'bg-sky-200', mark: 'C' },
  { id: 'lilac', color: 'bg-violet-200', mark: 'D' },
  { id: 'sand', color: 'bg-amber-100', mark: 'E' },
].map(({ id, color, mark }) => ({ id, color, mark }))

// The Tailwind 200 / 100 swatches the original sheets use.
const swatches: Record<string, string> = {
  'bg-emerald-200': '#a7f3d0',
  'bg-orange-200': '#fed7aa',
  'bg-sky-200': '#bae6fd',
  'bg-violet-200': '#ddd6fe',
  'bg-amber-100': '#fef3c7',
}
const info = new Map(previews.map(preview => [preview.id, preview]))
</script>

<template>
  <div class="folder-stage">
    <ProjectFolder title="Brand direction" description="Updated recently" :count="5" :previews="previews.map(({ id }) => ({ id }))">
      <template #preview="{ preview }">
        <span class="sheet" :style="{ background: swatches[info.get(preview.id)!.color] }">
          <span class="sheet-title" />
          <span class="sheet-rule sheet-rule-a" />
          <span class="sheet-rule sheet-rule-b" />
          <span class="sheet-mark">{{ info.get(preview.id)!.mark }}</span>
        </span>
      </template>
    </ProjectFolder>
  </div>
</template>

<style scoped>
.folder-stage { display: flex; min-height: 20rem; width: 100%; align-items: center; justify-content: center; box-sizing: border-box; padding: 2.5rem 1.5rem; }
.sheet { position: relative; display: block; width: 100%; height: 100%; }
.sheet > span { position: absolute; display: block; }
.sheet-title { left: .75rem; top: .75rem; width: 2rem; height: .5rem; border-radius: 9999px; background: rgb(0 0 0 / .15); }
.sheet-rule { left: .75rem; right: .75rem; height: 1px; background: rgb(0 0 0 / .1); }
.sheet-rule-a { top: 2rem; }
.sheet-rule-b { top: 2.75rem; }
.sheet-mark { right: .75rem; bottom: .75rem; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: rgb(0 0 0 / .5); }
</style>
