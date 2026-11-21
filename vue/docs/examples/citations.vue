<script setup lang="ts">
import { Citation, Citations, type CitationItem } from 'beui-vue'
import { computed, h, onMounted, shallowRef, watch } from 'vue'

const FileText = () => h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
  h('path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }),
  h('path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }), h('path', { d: 'M10 9H8' }), h('path', { d: 'M16 13H8' }), h('path', { d: 'M16 17H8' }),
])
const ITEMS: CitationItem[] = [
  { id: 'motion', title: 'Motion documentation', domain: 'motion.dev', url: 'https://motion.dev/docs/react' },
  { id: 'wai', title: 'WAI accessibility patterns', domain: 'w3.org', url: 'https://www.w3.org/WAI/ARIA/apg/' },
  { id: 'guidelines', title: 'Motion guidelines', domain: 'Design handbook · PDF', icon: FileText },
]
const run = shallowRef(0)
const visible = shallowRef(ITEMS.length)
const mounted = shallowRef(false)
const citations = computed(() => ITEMS.slice(0, visible.value))
onMounted(() => { mounted.value = true })
watch([run, mounted], (_, __, cleanup) => {
  if (!mounted.value) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { visible.value = ITEMS.length; return }
  visible.value = 0
  const timers = ITEMS.map((_, index) => setTimeout(() => { visible.value = index + 1 }, 500 + index * 700))
  cleanup(() => timers.forEach(clearTimeout))
}, { immediate: true })
</script>

<template>
  <div style="position:relative;width:100%;max-width:32rem;height:410px">
    <div :key="run" style="display:grid;gap:1rem">
      <p style="margin:0;font-size:.875rem;line-height:1.5rem;color:color-mix(in oklab,var(--beui-foreground) 90%,transparent)">
        Use layout-aware motion for newly appended results{{ ' ' }}<Citation citation-id="motion" :index="1" id-prefix="preview-source" /> and preserve accessible
        disclosure behavior <Citation citation-id="wai" :index="2" id-prefix="preview-source" /> as the list
        grows, keeping exits shorter than entrances{{ ' ' }}<Citation citation-id="guidelines" :index="3" id-prefix="preview-source" label="Citation 3: Motion guidelines" />.
      </p>
      <Citations id-prefix="preview-source" :citations="citations" default-open />
    </div>
    <button type="button" class="be-agent-replay" @click="run++"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
  </div>
</template>
