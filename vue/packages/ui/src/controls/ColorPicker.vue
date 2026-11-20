<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import FloatingPanel from './FloatingPanel.vue'
import { bound, fromHsl, fromRgb, parseColor, toHex, toHsl, toRgb, type Hsva } from './colors'

const { label = 'Color', presets = [], disabled, name } = defineProps<{
  label?: string; presets?: readonly { value: string; label: string }[]; disabled?: boolean; name?: string
}>()
const model = defineModel<string>({ default: '#3478f6' })
const open = defineModel<boolean>('open', { default: false })
const anchor = useTemplateRef('anchor')
const area = useTemplateRef('area')
const initial: Hsva = { hue: 220, saturation: 80, brightness: 96, alpha: 1 }
const channels = shallowRef(parseColor(model.value, initial) ?? initial)
const hex = computed(() => toHex(channels.value))
const format = shallowRef<'hex' | 'rgb' | 'hsl'>('hex')
const formats = ['hex','rgb','hsl'] as const
const values = computed(() => format.value === 'rgb' ? toRgb(channels.value) : toHsl(channels.value))
const labels = computed(() => format.value === 'rgb' ? ['Red','Green','Blue'] : ['Hue','Saturation','Lightness'])
const dragging = shallowRef(false)
type Dropper = { open: (options: { signal: AbortSignal }) => Promise<{ sRGBHex: string }> }
const eye = shallowRef<new () => Dropper>()
let sampling: AbortController | undefined
onMounted(() => { eye.value = (window as Window & { EyeDropper?: new () => Dropper }).EyeDropper })
onBeforeUnmount(() => sampling?.abort())
watch(model, next => { if (next !== hex.value) channels.value = parseColor(next, channels.value) ?? channels.value })

function update(next: Hsva) { channels.value = next; model.value = toHex(next) }
function applyHex(value: string) { const parsed = parseColor(value, channels.value); if (parsed) update(parsed) }
function setChannel(index: number, value: number) {
  const next = [...values.value]
  next[index] = value
  update(format.value === 'rgb' ? fromRgb(next, channels.value) : fromHsl(next, channels.value))
}
function areaDrag(event: PointerEvent) {
  if (!area.value || !dragging.value) return
  const box = area.value.getBoundingClientRect()
  update({ ...channels.value, saturation: bound((event.clientX - box.left) / box.width * 100), brightness: bound((1 - (event.clientY - box.top) / box.height) * 100) })
}
function areaKey(event: KeyboardEvent) {
  const step = event.shiftKey ? 10 : 1
  const delta: Record<string,[number,number]> = { ArrowUp: [0,step], ArrowDown: [0,-step], ArrowLeft: [-step,0], ArrowRight: [step,0] }
  if (!delta[event.key]) return
  event.preventDefault()
  const [horizontal, vertical] = delta[event.key]!
  update({ ...channels.value, saturation: bound(channels.value.saturation + horizontal), brightness: bound(channels.value.brightness + vertical) })
}
async function sample() {
  if (!eye.value) return
  sampling?.abort(); sampling = new AbortController()
  try { const color = await new eye.value().open({ signal: sampling.signal }); applyHex(color.sRGBHex) }
  catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) throw error }
}
function close(reason: string) { open.value = false; if (reason === 'escape') anchor.value?.focus() }
</script>
<template><div class="picker"><input v-if="name" type="hidden" :name="name" :value="hex" :disabled="disabled" /><button ref="anchor" type="button" class="trigger" :disabled="disabled" :aria-expanded="open" aria-haspopup="dialog" :aria-label="label" @click="open = !open"><span class="chip" :style="{ background: hex }" />{{ hex.toUpperCase() }}</button>
  <FloatingPanel :open="open" :anchor="anchor" role="dialog" :aria-label="label" variant="morph" class="panel" @dismiss="close" @placed="area?.focus({ preventScroll: true })">
    <div ref="area" role="slider" tabindex="0" aria-label="Saturation and brightness" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(channels.saturation)" :aria-valuetext="`${Math.round(channels.saturation)}% saturation, ${Math.round(channels.brightness)}% brightness`"
      class="plane" :style="{ backgroundColor: `hsl(${channels.hue} 100% 50%)` }" @keydown="areaKey" @pointerdown="event => { if (event.button === 0) { dragging = true; area?.setPointerCapture(event.pointerId); areaDrag(event) } }" @pointermove="areaDrag" @pointerup="dragging = false" @lostpointercapture="dragging = false" @pointercancel="dragging = false">
      <span class="thumb" :style="{ left: `${channels.saturation}%`, top: `${100 - channels.brightness}%`, background: hex }" :data-drag="dragging" />
    </div>
    <input class="range hue" type="range" min="0" max="360" :value="channels.hue" aria-label="Hue" @input="update({ ...channels, hue: ($event.target as HTMLInputElement).valueAsNumber })" />
    <input class="range alpha" type="range" min="0" max="100" :value="Math.round(channels.alpha * 100)" aria-label="Opacity" :style="{ '--color': toHex({ ...channels, alpha: 1 }) }" @input="update({ ...channels, alpha: ($event.target as HTMLInputElement).valueAsNumber / 100 })" />
    <div class="inputs"><button type="button" :aria-label="`Switch from ${format.toUpperCase()} format`" @click="format = formats[(formats.indexOf(format) + 1) % 3]!">{{ format.toUpperCase() }}</button>
      <input v-if="format === 'hex'" aria-label="Hex color" :value="hex" @change="event => { const field = event.target as HTMLInputElement; applyHex(field.value); field.value = hex }" />
      <template v-else><input v-for="(value, index) in values" :key="index" type="number" :aria-label="labels[index]" :value="value" min="0" :max="format === 'rgb' ? 255 : index === 0 ? 360 : 100" @change="setChannel(index, ($event.target as HTMLInputElement).valueAsNumber)" /></template>
      <button v-if="eye" type="button" aria-label="Pick color from screen" @click="sample">⌖</button>
    </div>
    <div v-if="presets.length" class="presets" role="group" aria-label="Presets"><button v-for="preset in presets" :key="preset.value" type="button" :style="{ background: preset.value }" :aria-label="preset.label" :aria-pressed="hex.toLowerCase() === preset.value.toLowerCase()" @click="applyHex(preset.value)" /></div>
  </FloatingPanel></div></template>
<style scoped>.trigger,.inputs button,.inputs input { border: 1px solid var(--beui-border); border-radius: .5rem; padding: .4rem .5rem; background: var(--beui-background); font: inherit; font-size: .8rem; color: var(--beui-foreground); } .trigger { display: inline-flex; gap: .6rem; align-items: center; cursor: pointer; } .chip { width: 1.4rem; height: 1.4rem; border-radius: .35rem; } .panel { display: grid; width: 17rem; padding: .7rem; gap: .65rem; }
.plane { position: relative; height: 9rem; cursor: crosshair; overflow: hidden; touch-action: none; border-radius: .55rem; background-image: linear-gradient(to top, black, transparent),linear-gradient(to right,white,transparent); }
.thumb { position: absolute; pointer-events: none; width: .9rem; height: .9rem; border: 2px solid white; border-radius: 50%; transform: translate(-50%,-50%); box-shadow: 0 0 2px black; } .thumb[data-drag=true] { transform: translate(-50%,-130%) scale(1.45); }
.range { appearance: none; width: 100%; height: .65rem; border-radius: 99px; margin: .3rem 0; accent-color: white; } .hue { background: linear-gradient(to right, red,yellow,lime,cyan,blue,magenta,red); } .alpha { background: linear-gradient(to right,transparent,var(--color)), repeating-conic-gradient(#bbb 0 25%,white 0 50%) 0/8px 8px; }
.inputs,.presets { display: flex; gap: .35rem; } .inputs input { min-width: 0; flex: 1; } .inputs button { cursor: pointer; } .presets { justify-content: space-between; flex-wrap: wrap; } .presets button { width: 20px; height: 20px; border: 0; border-radius: 50%; cursor: pointer; } .presets [aria-pressed=true] { outline: 1px solid currentColor; outline-offset: 2px; } @media(prefers-reduced-motion:reduce){.thumb[data-drag=true]{ transform: translate(-50%,-50%); }}</style>
