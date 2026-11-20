<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { computed, shallowRef, useTemplateRef } from 'vue'
interface RailItem { id: string; label: string; ariaLabel?: string; description?: string; href?: string; target?: string; rel?: string }
const { items, orientation = 'vertical', label = 'Section navigation', itemSize = 24, previewSide = 'after', showPreview = true, highlightActive = false } = defineProps<{
  items: readonly RailItem[]; orientation?: 'vertical' | 'horizontal'; label?: string; itemSize?: number; previewSide?: 'before' | 'after'; showPreview?: boolean; highlightActive?: boolean
}>()
const active = defineModel<string>()
const emit = defineEmits<{ select: [item: RailItem] }>()
const hovered = shallowRef(''), focused = shallowRef(''), pinned = shallowRef('')
const rail = useTemplateRef('rail')
const shown = computed(() => items.find(item => item.id === (hovered.value || pinned.value || focused.value)))
const selected = computed(() => items.find(item => item.id === active.value)?.id ?? items[0]?.id)
let pointer = ''
onClickOutside(rail, () => { pinned.value = ''; focused.value = '' })
function activate(item: RailItem) {
  active.value = item.id
  pinned.value = pointer === 'touch' || pointer === 'pen' ? item.id : ''
  pointer = ''
  emit('select', item)
}
</script>
<template>
  <div ref="rail" class="rail" :class="[orientation, previewSide]" :style="{ '--step': `${itemSize}px` }" @keydown.esc="pinned=''; hovered=''; focused=''" @focusout="event => { if (!rail?.contains(event.relatedTarget as Node)) { pinned=''; focused='' } }">
    <nav :aria-label="label" @pointerleave="event => { if (event.pointerType === 'mouse') hovered='' }">
      <component :is="item.href ? 'a' : 'button'" v-for="item in items" :key="item.id" :type="item.href ? undefined : 'button'" :href="item.href" :target="item.target" :rel="item.rel" :aria-label="item.ariaLabel ?? item.label" :aria-current="selected === item.id ? 'true' : undefined" :class="{ current: shown?.id === item.id || highlightActive && selected === item.id }"
        @pointerenter="(event: PointerEvent) => { if (event.pointerType === 'mouse') hovered = item.id }" @pointerdown="(event: PointerEvent) => pointer = event.pointerType" @focus="focused=item.id" @click="activate(item)"><i /></component>
    </nav>
    <div v-if="showPreview" class="stage" aria-live="polite"><Transition name="preview" mode="out-in"><div v-if="shown" :key="shown.id"><slot name="preview" :item="shown"><article><strong>{{ shown.label }}</strong><p v-if="shown.description">{{ shown.description }}</p></article></slot></div><div v-else><slot /></div></Transition></div>
  </div>
</template>
<style scoped>.rail { display: flex; align-items: center; justify-content: center; width: 100%; gap: 1rem; } .rail.before { flex-direction: row-reverse; } .rail.horizontal { flex-direction: column; } .rail.horizontal.before { flex-direction: column-reverse; } nav { display: flex; flex-direction: column; } .horizontal nav { flex-direction: row; } nav :is(button,a) { display: grid; place-items: center; height: var(--step); width: 2.7rem; border: 0; background: transparent; cursor: pointer; } .horizontal nav :is(button,a) { width: var(--step); height: 2.7rem; } i { width: .85rem; height: 2px; border-radius: 99px; background: var(--beui-muted-foreground); transition: transform .18s; opacity: .65; } .horizontal i { height: .85rem; width: 2px; } .current i { transform: scaleX(1.8); opacity: 1; background: var(--beui-foreground); } .horizontal .current i { transform: scaleY(1.8); } .stage { width: min(18rem,65%); } article { border: 1px solid var(--beui-border); border-radius: 1rem; padding: 1rem; background: var(--beui-card); } p { font-size: .85rem; color: var(--beui-muted-foreground); margin: .25rem 0 0; } .preview-enter-active,.preview-leave-active { transition: opacity .12s,transform .12s; } .preview-enter-from,.preview-leave-to { opacity: 0; transform: translateY(3px); } @media(prefers-reduced-motion:reduce){ * { transition:none!important; } }</style>
