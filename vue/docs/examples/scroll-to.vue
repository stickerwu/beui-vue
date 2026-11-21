<script setup lang="ts">
import { ScrollTo, SmoothScroll } from 'beui-vue'
import { useId } from 'vue'
// ScrollTo uses the active SmoothScroll provider. Here it is contained (:root="false"); the nav buttons glide the box to each section.
const prefix = useId()
const sections = ['Intro', 'Features', 'Pricing', 'FAQ']
</script>
<template>
  <SmoothScroll :root="false" class="scroll-frame" role="region" aria-label="Scroll to section" tabindex="0">
    <nav class="nav" aria-label="Sections">
      <ScrollTo v-for="section in sections" :key="section" :to="`#${prefix}-${section}`" :offset="-48" class="link">{{ section }}</ScrollTo>
    </nav>
    <section v-for="section in sections" :id="`${prefix}-${section}`" :key="section" :data-pricing="section === 'Pricing' ? '' : undefined" class="section">{{ section }}</section>
  </SmoothScroll>
</template>
<style scoped>
.scroll-frame { box-sizing: border-box; position: relative; width: 100%; max-width: 32rem; height: 20rem; overflow-y: auto; scrollbar-width: none; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); }
.scroll-frame::-webkit-scrollbar { display: none; }
.nav { position: sticky; top: 0; z-index: 10; display: flex; gap: .375rem; padding: .5rem; border-bottom: 1px solid var(--beui-border); background: color-mix(in srgb, var(--beui-background) 80%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.link { padding: .25rem .75rem; border: 0; border-radius: 999px; background: transparent; font: inherit; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); cursor: pointer; transition: background-color .15s, color .15s; }
.link:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.section { display: flex; height: 16rem; align-items: center; justify-content: center; font-size: 1.125rem; line-height: 1.75rem; font-weight: 500; color: var(--beui-foreground); }
</style>
