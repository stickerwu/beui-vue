<script setup lang="ts">
import { onScopeDispose, shallowRef, watch } from 'vue'
const {holdDuration = 1600, direction = 'vertical', disabled = false, labels} = defineProps<{
  holdDuration?:number; direction?:'vertical'|'horizontal'; disabled?:boolean; labels?:{holding?:string; complete?:string}
}>()
const emit = defineEmits<{holdComplete:[]}>()
const state = shallowRef<'idle'|'holding'|'complete'>('idle')
let timer: ReturnType<typeof setTimeout> | undefined
function cancel() { clearTimeout(timer); state.value = 'idle' }
function start() {
  if (disabled || state.value !== 'idle') return
  state.value = 'holding'
  timer = setTimeout(() => {state.value = 'complete'; emit('holdComplete')}, Math.max(0,holdDuration))
}
function press(event: PointerEvent) {
  if (event.button || !event.isPrimary) return
  start()
  try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId) } catch {}
}
function move(event: PointerEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) cancel()
}
function key(event: KeyboardEvent) {
  if (event.key !== ' ' && event.key !== 'Enter') return
  event.preventDefault()
  if (event.type === 'keyup') cancel()
  else if (!event.repeat) start()
}
watch(() => disabled, flag => {if (flag) cancel()})
onScopeDispose(cancel)
</script>
<template>
  <button type="button" class="hold" :disabled="disabled" :style="{'--duration':`${holdDuration}ms`}" :data-state="state" :data-direction="direction" @pointerdown="press" @pointermove="move" @pointerup="cancel" @lostpointercapture="cancel" @pointercancel="cancel" @blur="cancel" @keydown="key" @keyup="key">
    <span class="fill" aria-hidden="true" /><span class="name" :class="{hidden:state !== 'idle'}"><slot /></span>
    <span v-if="state !== 'idle'" aria-hidden="true" class="name">{{ state === 'complete' ? labels?.complete ?? 'Done' : labels?.holding ?? 'Keep holding' }}</span>
  </button>
</template>
<style scoped>
.hold { position:relative; isolation:isolate; overflow:hidden; border:0; border-radius:20px; padding:1rem 2rem; background:var(--beui-muted); color:var(--beui-foreground); font:inherit; font-weight:500; cursor:pointer; touch-action:none; user-select:none; }
.fill { position:absolute; inset:0; background:#38bdf8; transform:translateY(110%); transition:transform .24s cubic-bezier(.16,1,.3,1); }
.hold[data-direction=horizontal] .fill { transform:translateX(-100%); }
.hold:not([data-state=idle]) .fill { transform:translate(0); transition:transform var(--duration) linear; }
.name { position:relative; }
.hidden { position:absolute; clip-path:inset(50%); }
@media(prefers-reduced-motion:reduce) { .hold .fill { transform:none; opacity:0; } .hold:not([data-state=idle]) .fill { opacity:1; transition:opacity var(--duration) linear; } }
</style>
