<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
const props = withDefaults(defineProps<{ followOutput?: boolean, followThreshold?: number, smooth?: boolean, label?: string, busy?: boolean, navigation?: 'rail', navigationLabel?: string, viewportClassName?: string, contentClassName?: string, railClassName?: string }>(), { followOutput: true, followThreshold: 64, smooth: true, label: 'Conversation', navigationLabel: 'Message navigation' })
const emit = defineEmits<{ followChange: [value: boolean] }>()
const viewport = shallowRef<HTMLElement | null>(null)
const content = shallowRef<HTMLElement | null>(null)
const rows = shallowRef<HTMLElement[]>([])
const overflow = shallowRef(false)
const active = shallowRef(0)
let following = props.followOutput
let programmatic = false
let mutation: MutationObserver | undefined
let resize: ResizeObserver | undefined
let timer: ReturnType<typeof setTimeout> | undefined
function follow(next: boolean) { if (following !== next) { following = next; emit('followChange', next) } }
function scroll(top: number) {
  if (!viewport.value) return
  programmatic = true
  const smooth = props.smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches
  viewport.value.scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' })
  clearTimeout(timer)
  timer = setTimeout(() => { programmatic = false }, smooth ? 350 : 0)
}
function scan() {
  if (!viewport.value || !content.value) return
  rows.value = Array.from(content.value.querySelectorAll<HTMLElement>('[data-slot="message"]'))
  overflow.value = viewport.value.scrollHeight > viewport.value.clientHeight + 1
  if (following && props.followOutput) { active.value = rows.value.length - 1; scroll(viewport.value.scrollHeight) }
}
function scrolled() {
  const host = viewport.value
  if (!host || programmatic) return
  follow(host.scrollHeight - host.scrollTop - host.clientHeight <= props.followThreshold)
  const center = host.getBoundingClientRect().top + host.clientHeight / 2
  let nearest = Infinity
  for (const [index, row] of rows.value.entries()) {
    const box = row.getBoundingClientRect()
    const distance = Math.abs(box.top + box.height / 2 - center)
    if (distance < nearest) { active.value = index; nearest = distance }
  }
}
function jump(index: number) {
  const host = viewport.value
  const row = rows.value[index]
  if (!host || !row) return
  active.value = index
  follow(index === rows.value.length - 1)
  scroll(following ? host.scrollHeight : host.scrollTop + row.getBoundingClientRect().top - host.getBoundingClientRect().top - (host.clientHeight - row.offsetHeight) / 2)
}
watch(() => props.followOutput, value => { follow(value); scan() })
onMounted(() => {
  resize = new ResizeObserver(scan)
  mutation = new MutationObserver(scan)
  if (viewport.value) resize.observe(viewport.value)
  if (content.value) { resize.observe(content.value); mutation.observe(content.value, { characterData: true, subtree: true, childList: true }) }
  scan()
})
onBeforeUnmount(() => { resize?.disconnect(); mutation?.disconnect(); clearTimeout(timer) })
</script>
<template><div class="be-scroller" data-slot="message-scroller"><section ref="viewport" :aria-label="label" tabindex="0" class="be-scroll-viewport" :class="viewportClassName" @scroll="scrolled" @wheel="programmatic = false" @touchstart="programmatic = false" @keydown="programmatic = false"><div ref="content" role="log" aria-live="polite" aria-relevant="additions text" :aria-busy="busy" :class="contentClassName"><slot /></div></section><nav v-if="navigation === 'rail' && overflow && rows.length > 1" :aria-label="navigationLabel" :class="railClassName"><button v-for="(row, index) in rows" :key="index" type="button" :aria-label="`Go to ${row.dataset.from} message ${index + 1} of ${rows.length}`" :aria-current="index === active || undefined" :title="row.textContent?.trim().slice(0, 88)" @click="jump(index)"><span /></button></nav></div></template>
<style scoped>
.be-scroller { position:relative; min-height:0; }.be-scroll-viewport { box-sizing:border-box; height:100%; overflow-y:auto; overscroll-behavior:contain; overflow-anchor:none; scrollbar-gutter:stable; }.be-scroller:has(nav) .be-scroll-viewport { padding-inline-end:2.5rem; scrollbar-width:none; }
nav { position:absolute; inset-block:0; inset-inline-end:.25rem; display:grid; align-content:center; }nav button { display:grid; place-items:center end; width:1.75rem; height:.875rem; color:var(--beui-muted-foreground); }nav span { width:.75rem; height:1px; background:currentColor; }nav button[aria-current] span { width:1.1rem; height:2px; }
</style>
