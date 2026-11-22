<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { onBeforeUnmount, useTemplateRef } from 'vue'
import { easeOut, layoutSpring } from '../core/motion'
import type { TreemapTile } from './models/treemap'

const props = defineProps<{
  tile: TreemapTile; width: number; height: number; label: string; tabbable: boolean; selected: boolean; describedBy?: string
  valueText: string; index: number
}>()
defineSlots<{ default?(props: { tile: TreemapTile }): unknown }>()
const emit = defineEmits<{ enter: [event: PointerEvent]; move: [event: PointerEvent]; press: []; focus: [] }>()
const reduce = useReducedMotion()
const button = useTemplateRef<{ $el: HTMLElement }>('button')
// Small tiles stay inspectable; their label lives in the accessible name and the data table.
const showLabel = () => props.tile.width >= 52 && props.tile.height >= 32
const showValue = () => props.tile.width >= 70 && props.tile.height >= 56
// An exiting tile is still in the DOM for its fade; it must neither take pointers nor stay in the tab/accessibility tree.
onBeforeUnmount(() => {
  const element = button.value?.$el
  if (!element) return
  element.inert = true
  element.setAttribute('aria-hidden', 'true')
  element.style.pointerEvents = 'none'
})
</script>

<template>
  <motion.button
    ref="button" type="button" class="tile" :data-treemap-tile="tile.id" :data-index="index" :layout="!reduce" :tabindex="tabbable ? 0 : -1"
    :aria-label="label" :aria-describedby="selected ? describedBy : undefined"
    :style="{ left: `${(tile.x / width) * 100}%`, top: `${(tile.y / height) * 100}%`, width: `${(tile.width / width) * 100}%`, height: `${(tile.height / height) * 100}%`, backgroundColor: tile.color, color: tile.textColor }"
    :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
    :transition="{ layout: reduce ? { duration: 0 } : layoutSpring, opacity: { type: 'tween', duration: 0.18, ease: easeOut } }"
    @pointerenter="emit('enter', $event)" @pointermove="emit('move', $event)" @pointerdown="emit('press')" @click="emit('press')" @focus="emit('focus')"
  >
    <motion.span aria-hidden="true" class="content" :layout="reduce ? false : 'position'" :transition="reduce ? { duration: 0 } : layoutSpring">
      <slot :tile="tile">
        <template v-if="showLabel()">
          <span class="name">{{ tile.label }}</span>
          <span v-if="showValue()" class="value">{{ valueText }}</span>
        </template>
      </slot>
    </motion.span>
    <motion.span aria-hidden="true" class="sheen" :initial="false" :animate="{ opacity: selected ? 1 : 0 }" :transition="{ type: 'tween', duration: 0.1, ease: easeOut }" />
  </motion.button>
</template>

<style scoped>
.tile { position: absolute; box-sizing: border-box; overflow: hidden; margin: 0; padding: 0; border: 2px solid var(--beui-background); border-radius: 8px; text-align: left; font: inherit; cursor: pointer; outline: none; }
.tile:focus-visible { box-shadow: inset 0 0 0 2px #fff; }
.content { position: absolute; top: 12px; right: 12px; left: 12px; min-width: 0; }
.name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 20px; font-weight: 600; }
.value { display: block; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; opacity: .8; }
@media (max-width: 639px) { .content { top: 8px; right: 8px; left: 8px; } .name { font-size: 12px; line-height: 16px; } .value { font-size: 10px; line-height: 15px; } }
.sheen { position: absolute; inset: 0; background: rgb(255 255 255 / .1); pointer-events: none; }
</style>
