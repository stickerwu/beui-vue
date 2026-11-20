<script setup lang="ts">
import { Breadcrumb } from 'beui-vue'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
const path = ['Workspace','Projects','Website','Design system','Components','Navigation','Breadcrumb']
const depth = ref(5)
const root = useTemplateRef('root')
const items = computed(() => path.slice(0, depth.value + 1).map(label => ({ label, href: `#${encodeURIComponent(label.toLowerCase())}` })))
function select(index: number) {
  depth.value = index
  nextTick(() => root.value?.querySelector<HTMLElement>('[aria-current="page"]')?.focus())
}
function navigate(_item: unknown, index: number, event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  select(index)
}
</script>
<template>
  <div ref="root" class="path-demo"><Breadcrumb :items="items" :max-items="3" @navigate="navigate" />
    <button v-if="depth < path.length - 1" type="button" @click="select(depth + 1)">{{ path[depth + 1] }} ↗</button><small v-else>Choose a parent path to go back.</small>
  </div>
</template>
<style scoped>.path-demo { width: min(32rem,100%); display: grid; gap: 2rem; } .path-demo > button { border: 1px solid var(--beui-border); border-radius: .5rem; text-align: start; padding: .75rem 1rem; cursor: pointer; }</style>
