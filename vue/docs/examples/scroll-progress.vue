<script setup lang="ts">
import { ScrollProgress } from 'beui-vue'
import { useTemplateRef } from 'vue'
// Real usage: drop <ScrollProgress /> anywhere; it reads the page scroll and pins itself with `fixed`.
// Here it is scoped to a box by passing the scroller as `container` and `:fixed="false"`.
const region = useTemplateRef('region')
</script>
<template>
  <div class="progress-frame">
    <ScrollProgress :container="region" :fixed="false" :height="3" data-testid="progress-bar" />
    <div class="circle"><ScrollProgress :container="region" variant="circle" :size="36" /></div>
    <div ref="region" role="region" aria-label="Sections" tabindex="0" class="scroller">
      <div class="rows"><div v-for="section in 18" :key="section" class="row">Section {{ section }}</div></div>
    </div>
  </div>
</template>
<style scoped>
.progress-frame { box-sizing: border-box; position: relative; width: 100%; max-width: 32rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); }
.scroller { height: 16rem; overflow-y: auto; scrollbar-width: none; }
.scroller::-webkit-scrollbar { display: none; }
.rows { display: flex; flex-direction: column; gap: .75rem; padding: 1rem; }
.circle { position: absolute; right: .75rem; top: .75rem; z-index: 10; padding: .25rem; border-radius: 999px; background: color-mix(in srgb, var(--beui-background) 70%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); line-height: 0; pointer-events: none; }
.row { border-radius: .5rem; padding: 1rem .75rem; background: color-mix(in srgb, var(--beui-muted) 60%, transparent); font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
</style>
