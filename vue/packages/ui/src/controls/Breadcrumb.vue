<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef } from 'vue'

interface Crumb { label: string; href?: string }
const { items, maxItems = Infinity, label = 'Breadcrumb' } = defineProps<{ items: readonly Crumb[]; maxItems?: number; label?: string }>()
const emit = defineEmits<{ navigate: [item: Crumb, index: number, event: MouseEvent] }>()
const expanded = shallowRef(false)
const list = useTemplateRef('list')
const cut = computed(() => Math.max(1, items.length - Math.max(2, maxItems) + 1))
const shown = computed(() => items.map((item, index) => ({ item, index })).filter(({ index }) => expanded.value || items.length <= maxItems || index === 0 || index >= cut.value))
async function expand() {
  expanded.value = true
  await nextTick()
  list.value?.querySelector<HTMLElement>('[data-index="1"]')?.focus()
}
</script>
<template><nav :aria-label="label"><ol ref="list" class="trail">
  <template v-for="{ item, index } in shown" :key="`${index}-${item.label}`">
    <li v-if="index === cut && items.length > maxItems && !expanded" class="crumb"><span aria-hidden="true">›</span><button type="button" aria-label="Show hidden pages" @click="expand">…</button></li>
    <li class="crumb"><span v-if="index" aria-hidden="true">›</span><span v-if="index === items.length - 1" aria-current="page" tabindex="-1">{{ item.label }}</span>
      <a v-else-if="item.href" :href="item.href" :data-index="index" @click="emit('navigate', item, index, $event)">{{ item.label }}</a>
      <button v-else type="button" :data-index="index" @click="emit('navigate', item, index, $event)">{{ item.label }}</button>
    </li>
  </template></ol></nav></template>
<style scoped>.trail { display: flex; align-items: center; flex-wrap: wrap; gap: .45rem; margin: 0; padding: 0; } .crumb { display: inline-flex; align-items: center; gap: .45rem; margin: 0; color: var(--beui-muted-foreground); font-size: .875rem; } .crumb :is(a,button) { color: inherit; border: 0; background: none; text-decoration: none; cursor: pointer; font: inherit; padding: .2rem; border-radius: .3rem; } .crumb :is(a,button):hover { background: var(--beui-muted); } .crumb [aria-current] { color: var(--beui-foreground); font-weight: 500; }</style>
