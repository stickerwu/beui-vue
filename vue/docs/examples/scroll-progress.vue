<script setup lang="ts">
import { ScrollProgress } from 'beui-vue'
import { useTemplateRef } from 'vue'
const region = useTemplateRef('region')
</script>
<template><div class="progress-frame"><ScrollProgress :container="region" :fixed="false" :height="3" data-testid="progress-bar" /><div class="circle"><ScrollProgress :container="region" variant="circle" :size="36" /></div>
  <div ref="region" role="region" aria-label="Sections" tabindex="0" class="scroller"><div v-for="section in 18" :key="section" class="section">Section {{ section }}</div></div>
</div></template>
<style scoped>.progress-frame { position: relative; width: 100%; max-width: 32rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); } .scroller { height: 16rem; overflow: auto; padding: 1rem; box-sizing: border-box; } .circle { position: absolute; right: .75rem; top: .75rem; z-index: 1; padding: .25rem; border-radius: 50%; background: var(--beui-background); pointer-events: none; } .section { border-radius: .5rem; padding: 1rem .75rem; margin-bottom: .75rem; background: var(--beui-muted); color: var(--beui-muted-foreground); font-size: .875rem; }</style>
