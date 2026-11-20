<script setup lang="ts">
import { computed, shallowRef, watchEffect } from 'vue'
import { buildTreemap, layoutTreemap, TREEMAP_COLORS, type TreemapNode } from './models/treemap'

const props = withDefaults(defineProps<{
  data: readonly TreemapNode[]; label?: string; formatValue?: (value: number) => string; colors?: readonly string[]
  textColor?: string; activeId?: string | null; defaultActiveId?: string | null; labels?: Partial<Record<string, string>>
}>(), { formatValue: (value: number) => value.toLocaleString('en-US'), colors: () => TREEMAP_COLORS, textColor: '#ffffff' })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()
const model = computed(() => buildTreemap(props.data, props.colors, props.textColor))
const tiles = computed(() => layoutTreemap(model.value.nodes, 1000, 625))
const local = shallowRef(props.defaultActiveId ?? null)
const cursor = shallowRef<string | null>(null)
const open = shallowRef(false)
const active = computed(() => tiles.value.find(tile => tile.id === (props.activeId === undefined ? local.value : props.activeId)))
const tabstop = computed(() => tiles.value.find(tile => tile.id === cursor.value)?.id ?? tiles.value[0]?.id)
watchEffect(() => { if (!tiles.value.some(tile => tile.id === local.value)) local.value = null })
function inspect(id: string) {
  if (active.value?.id !== id) { if (props.activeId === undefined) local.value = id; emit('update:activeId', id); emit('activeChange', id) }
  open.value = true
}
function navigate(event: KeyboardEvent, index: number) {
  const offsets: Record<string, number> = { ArrowRight: index + 1, ArrowDown: index + 1, ArrowLeft: index - 1, ArrowUp: index - 1, Home: 0, End: tiles.value.length - 1 }
  if (!(event.key in offsets)) return
  event.preventDefault()
  const target = Math.max(0, Math.min(tiles.value.length - 1, offsets[event.key]))
  ;(event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLButtonElement>(`[data-index="${target}"]`)?.focus()
}
</script>

<template>
  <section class="treemap" data-slot="treemap" :aria-label="label ?? labels?.label ?? 'Treemap'">
    <div class="tiles" @pointerleave="open = false">
      <button v-for="(tile, index) in tiles" :key="tile.id" type="button" :data-index="index" :tabindex="tile.id === tabstop ? 0 : -1"
        :aria-label="`${tile.path.join(' / ')}, ${formatValue(tile.value)}, ${(tile.share * 100).toFixed(1)}%`"
        :style="{ left: `${tile.x / 10}%`, top: `${tile.y / 6.25}%`, width: `${tile.width / 10}%`, height: `${tile.height / 6.25}%`, backgroundColor: tile.color, color: tile.textColor, opacity: open && active && active.id !== tile.id ? .66 : 1 }"
        @focus="cursor = tile.id; inspect(tile.id)" @blur="open = false" @keydown="navigate($event, index)" @keydown.esc="open = false" @click="inspect(tile.id)" @pointerenter="$event.pointerType !== 'touch' && inspect(tile.id)">
        <strong>{{ tile.label }}</strong><small>{{ formatValue(tile.value) }}</small>
      </button>
    </div>
    <div v-if="open && active" role="tooltip" class="tip">{{ active.path.join(' / ') }} · {{ formatValue(active.value) }} · {{ (active.share * 100).toFixed(1) }}% <span v-if="active.description">{{ active.description }}</span></div>
    <div class="legend"><span v-for="node in model.nodes" :key="node.id"><i :style="{ backgroundColor: node.color }" />{{ node.label }}</span></div>
    <div class="data-table"><table><caption>{{ label ?? 'Treemap' }} data</caption><thead><tr><th scope="col">Item</th><th scope="col">Value</th></tr></thead><tbody><tr v-for="item in model.items" :key="item.id"><th scope="row">{{ item.path.join(' / ') }}</th><td>{{ formatValue(item.value) }}</td></tr></tbody></table></div>
  </section>
</template>

<style scoped>
.treemap { position: relative; width: 100%; }.tiles { position: relative; aspect-ratio: 1.6; }
.tiles button { position: absolute; box-sizing: border-box; padding: 6px; border: 2px solid Canvas; border-radius: 7px; display: grid; align-content: end; justify-items: start; text-align: left; overflow: hidden; cursor: pointer; transition: opacity .15s ease; }
.tiles strong { font-size: 13px; }.tiles small, .legend, .tip { font-size: 12px; }.tiles button:focus-visible { outline: 2px solid currentColor; outline-offset: -5px; }
.legend { display: flex; flex-wrap: wrap; gap: 8px; }.legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.tip { margin-top: 6px; }.data-table { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
