<script setup lang="ts">
import { onBeforeUnmount, shallowRef, watch, type Component } from 'vue'
import AgentIcon from './AgentIcon.vue'

const props = defineProps<{ url?: string, icon?: Component }>()
const failed = shallowRef<string | null>(null)
const src = shallowRef<string | null>(null)
function resolve(url?: string) {
  if (!url) return null
  try { return new URL('/favicon.ico', url).toString() } catch { return null }
}
watch(() => props.icon ? undefined : props.url, url => { const next = resolve(url); src.value = next && next !== failed.value ? next : null }, { immediate: true })
const image = shallowRef<HTMLImageElement | null>(null)
let released = false
// `decode()` settles on the image's final state, so a failure that happened before hydration is still caught.
watch(image, node => {
  released = false
  const current = src.value
  if (node && current) node.decode().catch(() => { if (!released) failed.value = current })
})
watch(failed, value => { if (value && src.value === value) src.value = null })
onBeforeUnmount(() => { released = true })
</script>

<template>
  <span class="cf" aria-hidden="true">
    <slot><component :is="icon" v-if="icon" /><img v-else-if="src" ref="image" :src="src" alt="" width="16" height="16" referrerpolicy="no-referrer" @error="failed = src"><AgentIcon v-else name="Globe2" :size="14" /></slot>
  </span>
</template>

<style scoped>
.cf { display: grid; width: 1.25rem; height: 1.25rem; flex: none; place-items: center; color: var(--beui-muted-foreground); }
.cf :deep(svg) { width: .875rem; height: .875rem; }
.cf img { width: 1rem; height: 1rem; border-radius: .125rem; object-fit: contain; }
</style>
