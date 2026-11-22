<script setup lang="ts">
import { animate, motion, useMotionValue } from 'motion-v'
import { onMounted, watch } from 'vue'
import { easeOut, panelSpring } from '../core/motion'

interface DepthLevel { price: number; size: number; total: number }
const props = defineProps<{
  row: DepthLevel; fraction: number; entranceIndex: number; formatPrice: (value: number) => string; formatSize: (value: number) => string
  reduce: boolean; inRange: boolean; selectable: boolean; side: 'bid' | 'ask'
}>()
const emit = defineEmits<{ inspect: [inspect: boolean]; select: [] }>()

const highlight = useMotionValue(0)
// Rows already on screen update in place; only first-mount rows stagger in.
let entered = false
onMounted(() => { entered = true })
const delay = () => props.reduce || entered ? 0 : Math.min(props.entranceIndex, 8) * 0.025

let previous = props.row.size
watch(() => [props.row.size, props.reduce] as const, ([size, reduce], _, cleanup) => {
  const changed = previous !== size
  previous = size
  if (!changed || reduce) { highlight.set(0); return }
  // A soft full-row tint identifies changed quantities. Retarget from the current opacity when interrupted.
  let fade: { stop: () => void } | undefined
  const rise = animate(highlight, 0.1, { duration: 0.08, ease: easeOut, onComplete: () => { fade = animate(highlight, 0, { duration: 0.2, ease: easeOut }) } })
  cleanup(() => { rise.stop(); fade?.stop() })
})
</script>

<template>
  <motion.tr tabindex="-1" class="ob-row" :class="side === 'ask' ? 'ask' : 'bid'" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
    :transition="{ duration: 0.18, ease: easeOut, delay: delay() }" @pointerenter="emit('inspect', true)">
    <td class="price">
      <div class="bars" aria-hidden="true">
        <motion.div tabindex="-1" class="fill" :initial="reduce ? false : { transform: `scaleX(${fraction * 0.85})`, opacity: 0 }" :animate="{ transform: `scaleX(${fraction})`, opacity: 1 }"
          :transition="reduce ? { duration: 0 } : { ...panelSpring, delay: delay() }"><div class="tint" /></motion.div>
        <motion.div tabindex="-1" class="flash" :style="{ opacity: highlight }" />
        <div class="hover" :class="{ range: inRange }" />
      </div>
      <button v-if="selectable" type="button" class="link" @click="emit('select')" @focus="emit('inspect', true)" @blur="emit('inspect', false)">{{ formatPrice(row.price) }}</button>
      <span v-else class="plain">{{ formatPrice(row.price) }}</span>
    </td>
    <td class="size">{{ formatSize(row.size) }}</td>
    <td class="total">{{ formatSize(row.total) }}</td>
  </motion.tr>
</template>

<style scoped>
.ob-row { background: transparent; border: 0; color: var(--ob-tone); }
.ob-row.ask { --ob-tone: var(--ob-ask); }
.ob-row.bid { --ob-tone: var(--ob-bid); }
.ob-row td { position: relative; padding: 0 16px; border: 0; background: transparent; height: 32px; font-size: 12px; line-height: 16px; vertical-align: middle; text-align: right; }
.ob-row td.price { text-align: left; }
.size { color: var(--beui-foreground); }
.total { color: var(--beui-muted-foreground); }
.bars { position: absolute; left: 4px; top: 1px; bottom: 1px; width: calc(300% - 8px); overflow: hidden; border-radius: 2px; pointer-events: none; }
.fill { position: absolute; inset: 0; overflow: hidden; border-radius: 2px; transform-origin: right; }
.tint { position: absolute; inset: 0; background: currentColor; opacity: .12; }
.flash { position: absolute; inset: 0; background: currentColor; }
.hover { position: absolute; inset: 0; background: currentColor; opacity: 0; transition: opacity .15s; }
.ob-row:hover .hover { opacity: .05; }
.ob-row .hover.range { opacity: .08; }
.plain, .link { position: relative; }
.link { padding: 0; border: 0; border-radius: 4px; background: transparent; color: inherit; font: inherit; cursor: pointer; outline: none; }
.link:hover { text-decoration: underline; }
.link:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>
