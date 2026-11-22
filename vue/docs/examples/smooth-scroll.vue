<script lang="ts">
import { useSmoothScroll } from 'beui-vue'
import { defineComponent, h } from 'vue'
import { LucideIcon } from './layout-icons'

/** The scroll-to-top control, built on `useSmoothScroll()` like the upstream preview. */
const ScrollTopButton = defineComponent({
  name: 'ScrollTopButton',
  setup() {
    const api = useSmoothScroll()
    return () => h('button', { type: 'button', class: 'top', 'aria-label': 'Scroll to top', onClick: () => api?.scrollTo(0) }, [h(LucideIcon, { name: 'ArrowUp', size: 16 })])
  },
})
</script>

<script setup lang="ts">
import { SmoothScroll } from 'beui-vue'

// In production <SmoothScroll> wraps the page (root). Here it runs in contained
// mode (root=false) so the box itself smooth-scrolls, and the button uses
// useSmoothScroll() to glide back to the top.
const SECTIONS = Array.from({ length: 16 }, (_, index) => index + 1)
</script>

<template>
  <SmoothScroll :root="false" class="box">
    <div class="sections">
      <div v-for="n in SECTIONS" :key="n" class="section">Section {{ n }}</div>
    </div>
    <ScrollTopButton />
  </SmoothScroll>
</template>

<style scoped>
.box { height: 16rem; width: 100%; max-width: 32rem; box-sizing: border-box; overflow-y: auto; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-card); scrollbar-width: none; }
.box::-webkit-scrollbar { display: none; }
.sections { padding: 1rem; }
.section:not(:last-child) { margin-bottom: .75rem; }
.section { border-radius: .5rem; background: color-mix(in srgb, var(--beui-muted) 60%, transparent); padding: 1rem .75rem; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.box :deep(.top) { position: sticky; bottom: .75rem; left: calc(100% - 3rem); z-index: 10; display: grid; width: 2.25rem; height: 2.25rem; place-items: center; padding: 0; border: 1px solid var(--beui-border); border-radius: 9999px; background: color-mix(in srgb, var(--beui-background) 80%, transparent); color: var(--beui-foreground); backdrop-filter: blur(8px); cursor: pointer; transition: background-color .15s; }
.box :deep(.top:hover) { background: var(--beui-background); }
</style>
