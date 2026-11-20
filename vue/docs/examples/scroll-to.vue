<script setup lang="ts">
import { ScrollTo } from 'beui-vue'
import { useId, useTemplateRef } from 'vue'
const region = useTemplateRef('region')
const prefix = useId()
const sections = ['Intro', 'Features', 'Pricing', 'FAQ']
</script>
<template><div ref="region" class="scroll-frame" role="region" aria-label="Scroll to section" tabindex="0">
  <nav class="sticky" aria-label="Sections"><ScrollTo v-for="section in sections" :key="section" :to="`#${prefix}-${section}`" :container="region" :offset="-48">{{ section }}</ScrollTo></nav>
  <section v-for="section in sections" :id="`${prefix}-${section}`" :key="section" :data-pricing="section === 'Pricing' ? '' : undefined" class="section">{{ section }}</section>
</div></template>
<style scoped>.scroll-frame { width: 100%; max-width: 32rem; height: 20rem; overflow: auto; position: relative; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); } .sticky { position: sticky; top: 0; display: flex; flex-wrap: wrap; gap: .375rem; background: var(--beui-background); padding: .5rem; border-bottom: 1px solid var(--beui-border); } .sticky button { padding: .25rem .75rem; color: var(--beui-muted-foreground); border: 0; border-radius: 999px; background: transparent; cursor: pointer; } .sticky button:hover { background: var(--beui-muted); color: var(--beui-foreground); } .section { height: 16rem; display: grid; place-items: center; font-size: 1.125rem; font-weight: 500; }</style>
