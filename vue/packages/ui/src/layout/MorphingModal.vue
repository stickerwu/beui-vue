<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import DialogSurface from './DialogSurface.vue'

const view = defineModel<string | null>('viewId', { default: null })
const { label = 'Options' } = defineProps<{ label?: string }>()
const body = useTemplateRef('body')
watch(view, async (next, previous) => {
  if (!next || !previous || !body.value) return
  const before = body.value.offsetHeight
  await nextTick()
  if (!body.value || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  body.value.animate([{ height: `${before}px`, opacity: .65 }, { height: `${body.value.offsetHeight}px`, opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' })
  body.value.focus({ preventScroll: true })
})
</script>
<template><DialogSurface :open="view !== null" :label="label" @close="view = null"><div ref="body" class="body" tabindex="-1"><slot :view="view" :close="() => view = null" /></div></DialogSurface></template>
<style scoped>.body { overflow: hidden; outline: none; }</style>
