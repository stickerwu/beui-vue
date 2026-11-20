<script setup lang="ts">
import {computed, ref} from 'vue'
import type {RangeProps} from './types'
import {snapRange} from './types'

const props = withDefaults(defineProps<RangeProps>(), {
  variant: 'standard', min: 0, max: 100, step: 1, defaultValue: 0,
  bars: 32, gap: 10, majorEvery: 5, showTicks: true,
})
const emit = defineEmits<{'update:modelValue':[value:number]; valueChange:[value:number]}>()
const draft = ref(props.defaultValue)
const maximum = computed(() => Math.max(props.min, props.max))
const stride = computed(() => props.step > 0 ? props.step : 1)
const value = computed(() => Math.max(props.min, Math.min(maximum.value, props.modelValue ?? draft.value)))
const percent = computed(() => (value.value - props.min) / (maximum.value - props.min || 1))
const readout = computed(() => props.format?.(value.value) ?? `${value.value}${props.variant==='fluid'?'%':''}`)
const barCount = computed(() => Math.max(1, Math.min(256, Math.floor(props.bars))))
const steps = computed(() => Math.floor((maximum.value - props.min) / stride.value))
const rulerTicks = computed(() => {
  const center = Math.round((value.value - props.min) / stride.value)
  const start = Math.max(0, center - 160)
  const end = Math.min(steps.value, center + 160)
  return Array.from({length: end-start+1}, (_,index) => start+index)
})
const active = ref<number>(), velocity = ref(0)
let startX = 0, startValue = 0, previousX = 0, previousTime = 0
function commit(raw: number) {
  const next = snapRange(raw, props.min, maximum.value, stride.value)
  if (next === value.value) return
  draft.value = next
  emit('update:modelValue', next)
  emit('valueChange', next)
}
function move(event: PointerEvent) {
  if (event.pointerId !== active.value || props.disabled) return
  const now = event.timeStamp
  if (now > previousTime) velocity.value = Math.max(-1,Math.min(1,(event.clientX-previousX)/(now-previousTime)))
  previousTime = now
  previousX = event.clientX
  if (props.variant === 'ruler') {
    commit(startValue + (startX - event.clientX) / Math.max(1,props.gap) * stride.value)
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (rect.width) commit(props.min + (event.clientX - rect.left) / rect.width * (maximum.value - props.min))
}
function begin(event: PointerEvent) {
  if (event.button !== 0 || props.disabled || active.value !== undefined) return
  const target = event.currentTarget as HTMLElement
  startValue = value.value
  startX = previousX = event.clientX
  previousTime = event.timeStamp
  active.value = event.pointerId
  target.focus({preventScroll:true})
  target.setPointerCapture(event.pointerId)
  move(event)
}
function end(event: PointerEvent) {
  if (event.pointerId === active.value) { active.value = undefined; velocity.value = 0 }
}
function key(event: KeyboardEvent) {
  if (props.disabled) return
  const increments: Record<string,number> = {ArrowLeft:-1, ArrowDown:-1, ArrowRight:1, ArrowUp:1, PageUp:10, PageDown:-10}
  if (event.key === 'Home') commit(props.min)
  else if (event.key === 'End') commit(maximum.value)
  else if (event.key in increments) commit(value.value + stride.value * increments[event.key])
  else return
  event.preventDefault()
}
function crest(index:number) {
  const head = percent.value * (barCount.value-1)
  return .22 + Math.exp(-((index-head)**2)/(2*2.6**2)) * (active.value===undefined ? .6 : .78)
}
</script>
<template>
  <div class="be-range" role="slider" :tabindex="disabled?-1:0" :aria-disabled="disabled || undefined" :aria-valuemin="min" :aria-valuemax="maximum" :aria-valuenow="value" :aria-valuetext="formatValueText?.(value)??format?.(value)" :aria-label="label || 'Value'" :data-variant="variant" :data-active="active!==undefined" :style="{'--pct':`${percent*100}%`}"
    @pointerdown="begin" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end" @keydown="key">
    <div v-if="variant==='wave'" class="wave" aria-hidden="true">
      <i v-for="bar in barCount" :key="bar" :class="{filled:bar-1<=Math.round(percent*(barCount-1))}" :style="{transform:`scaleY(${crest(bar-1)})`}"/>
    </div>
    <div v-else-if="variant==='ruler'" class="ruler" aria-hidden="true">
      <strong>{{ readout }} <small>{{ unit }}</small></strong>
      <div class="strip"><i v-for="tick in rulerTicks" :key="tick" :class="{major:tick%majorEvery===0}" :style="{left:`calc(50% + ${(tick-(value-min)/stride)*gap}px)`}"><small v-if="tick%majorEvery===0">{{ Number((min+tick*stride).toFixed(6)) }}</small></i><b/></div>
    </div>
    <template v-else-if="variant==='fluid' || variant==='inline'">
      <div class="row" aria-hidden="true"><span>{{ label }}</span>{{ readout }}</div>
      <div class="row fill-row" aria-hidden="true"><span>{{ label }}</span>{{ readout }}</div>
      <i v-if="variant==='inline'" class="inline-handle"/>
    </template>
    <div v-else class="rail" aria-hidden="true">
      <div class="fill"/><template v-if="showTicks && variant==='standard' && steps>0 && steps<=50"><i v-for="tick in steps+1" :key="tick" class="tick" :style="{left:`${(tick-1)/steps*100}%`}"/></template>
      <span class="thumb"/>
      <Transition name="pop"><span v-if="variant==='bubble' && active!==undefined" class="bubble" :style="{rotate:`${velocity*15}deg`}">{{ readout }}</span></Transition>
    </div>
  </div>
</template>
<style scoped>
.be-range{position:relative;display:grid;align-items:center;width:100%;min-width:5rem;height:3rem;touch-action:none;user-select:none;cursor:grab;color:var(--beui-foreground);outline-offset:3px;border-radius:1rem}
.be-range:focus-visible{outline:2px solid var(--beui-ring)}.be-range[aria-disabled=true]{opacity:.5;cursor:default}.be-range[data-active=true]{cursor:grabbing}
.rail{position:relative;height:.5rem;border-radius:1rem;background:color-mix(in srgb,currentColor 25%,transparent)}.fill{width:var(--pct);height:100%;border-radius:inherit;background:currentColor}.thumb{position:absolute;top:50%;left:clamp(0px,var(--pct),100%);width:1rem;height:1.65rem;border:2px solid var(--beui-background);border-radius:1rem;background:currentColor;transform:translate(-50%,-50%);box-shadow:0 1px 4px #0003}.tick{position:absolute;top:50%;width:2px;height:2px;border-radius:100%;background:var(--beui-background)}
.be-range[data-variant=bubble] .thumb{width:1.3rem;height:1.3rem}.bubble{position:absolute;bottom:1.5rem;left:var(--pct);translate:-50% 0;padding:.25rem .625rem;border-radius:.55rem;color:var(--beui-background);background:var(--beui-foreground);transform-origin:center bottom}.pop-enter-active,.pop-leave-active{transition:.16s ease-out}.pop-enter-from,.pop-leave-to{opacity:0;transform:scale(.4) translateY(10px)}
.be-range:is([data-variant=fluid],[data-variant=inline]){overflow:hidden;border-radius:99px;background:var(--beui-muted)}.row{position:absolute;inset:0;display:flex;justify-content:space-between;align-items:center;padding:0 1.25rem;font-size:.875rem;font-weight:500}.fill-row{color:var(--beui-background);background:var(--beui-foreground);clip-path:inset(0 calc(100% - var(--pct)) 0 0 round 999px)}.be-range[data-variant=inline]{border-radius:12px}.be-range[data-variant=inline] .fill-row{display:none}.inline-handle{position:absolute;left:clamp(8px,var(--pct),calc(100% - 12px));height:1.5rem;width:4px;border-radius:8px;background:currentColor}
.be-range[data-variant=wave]{height:5rem}.wave{display:flex;align-items:center;justify-content:space-between;gap:4px}.wave i{height:3.5rem;flex:1;border-radius:99px;background:currentColor;opacity:.45;transition:transform .15s ease-out}.wave .filled{opacity:1}
.be-range[data-variant=ruler]{height:auto;overflow:hidden}.ruler{text-align:center;font-variant-numeric:tabular-nums}.ruler strong{font-size:1.875rem}.ruler small{font-size:.75rem;font-weight:400}.strip{position:relative;height:3.5rem;mask-image:linear-gradient(90deg,transparent,#000 18% 82%,transparent)}.strip i{position:absolute;bottom:18px;width:1px;height:14px;background:currentColor;opacity:.5}.strip .major{height:28px;opacity:.8}.strip small{position:absolute;top:100%;left:0;translate:-50% 0;font-style:normal}.strip b{position:absolute;left:50%;bottom:18px;width:3px;height:36px;background:currentColor}
@media(prefers-reduced-motion:reduce){.be-range *{transition:none!important}.wave i{transform:scaleY(.4)!important}.bubble{rotate:0deg!important}}
</style>
