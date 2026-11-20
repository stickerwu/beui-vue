<script setup lang="ts">
import { useReducedMotion } from 'motion-v'
import { computed, onMounted, shallowRef, watchEffect } from 'vue'

const frames = {
  ascii: [...'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'],
  'ascii-line': ['|','/','-','\\'],
  'ascii-braille': [...'⣾⣽⣻⢿⡿⣟⣯⣷'],
  'ascii-blocks': [...'▁▂▃▄▅▆▇█▇▆▅▄▃▂'],
  'ascii-bounce': [...'⠁⠂⠄⡀⢀⠠⠐⠈'],
}
type Variant = keyof typeof frames | 'spinner'|'dots'|'bars'|'dot-matrix'|'dither'|'morph'|'comet'|'scramble'|'metaballs'|'newton'|'helix'|'percent'
const { variant = 'spinner', size = 32, speed = 1, label = 'Loading', scramble = 'LOADING', paused = false } = defineProps<{
  variant?: Variant; size?: number; speed?: number; label?: string; scramble?: string; paused?: boolean
}>()
const reduce = useReducedMotion()
const tick = shallowRef(0)
const glyphs = computed(() => frames[variant as keyof typeof frames])
const terminal = computed(() => {
  if (glyphs.value) return glyphs.value[tick.value % glyphs.value.length]
  if (variant === 'percent') return `${Math.round(tick.value % 51 * 2)}%`
  if (variant === 'scramble') {
    const step = tick.value % (scramble.length + 7)
    return [...scramble].map((letter,index) => index < step || reduce.value ? letter : '▐#%*+▓'[(tick.value * 7 + index * 3) % 6]).join('')
  }
  return ''
})
onMounted(() => watchEffect(cleanup => {
  tick.value = 0
  if (paused || !glyphs.value && variant !== 'percent' && variant !== 'scramble') return
  const samples = glyphs.value?.length ?? (variant === 'percent' ? 51 : 14)
  const timer = setInterval(() => tick.value++, Math.max(22, speed * 1000 * (reduce.value ? 2.5 : 1) / samples))
  cleanup(() => clearInterval(timer))
}))
const count = computed(() => ({ dots: 3, bars: 5, 'dot-matrix': 9, dither: 25, newton: 5, helix: 14, metaballs: 2 }[variant as string] ?? 1))
</script>
<template>
  <span role="status" :aria-label="label" class="loader" :class="[variant,{paused}]" :style="{ '--size':`${size}px`, '--speed':`${Math.max(.1,speed)}s` }">
    <span v-if="terminal" class="text" aria-hidden="true">{{ terminal }}</span>
    <span v-else class="parts" aria-hidden="true"><i v-for="part in count" :key="part" :style="{ '--part':part-1, '--wave': variant==='dot-matrix' ? (part-1)%3+Math.floor((part-1)/3) : variant==='dither' ? (part-1)%5+Math.floor((part-1)/5) : part-1 }" /></span>
  </span>
</template>
<style scoped>
.loader { display:inline-flex; align-items:center; justify-content:center; color:var(--beui-foreground); line-height:1; }
.parts { position:relative; display:flex; width:var(--size); height:var(--size); justify-content:center; align-items:center; gap:6%; }
i { display:block; flex:1; aspect-ratio:1; border-radius:50%; background:currentColor; animation:jump var(--speed) ease-in-out infinite; animation-delay:calc(var(--part)*var(--speed)*-.13); }
.spinner i,.comet i { box-sizing:border-box; width:100%; height:100%; background:none; border:calc(var(--size)*.09) solid color-mix(in srgb,currentColor 20%,transparent); border-top-color:currentColor; animation:turn var(--speed) linear infinite; }
.comet i { border-width:calc(var(--size)*.065); border-right-color:color-mix(in srgb,currentColor 60%,transparent); } .comet i::after { content:''; position:absolute; right:8%; top:7%; width:16%; height:16%; border-radius:50%; background:currentColor; }
.bars i { height:70%; border-radius:99px; aspect-ratio:auto; animation-name:bars; }
.dot-matrix .parts,.dither .parts { display:grid; grid-template-columns:repeat(3,1fr); gap:12%; }
.dither .parts { grid-template-columns:repeat(5,1fr); gap:5%; }
.dot-matrix i,.dither i { width:100%; animation:pulse var(--speed) ease-in-out calc(var(--wave)*var(--speed)*-.1) infinite; }
.dither i { border-radius:1px; animation-timing-function:steps(3); }
.newton .parts { gap:0; } .newton i { animation:none; transform-origin:center calc(var(--size)*-.3); } .newton i:first-child { animation:left-swing var(--speed) ease-in-out infinite; } .newton i:last-child { animation:right-swing var(--speed) ease-in-out infinite; }
.metaballs .parts { filter:contrast(16); background:var(--beui-background); } .metaballs i { flex:none; width:44%; filter:blur(calc(var(--size)*.05)); animation:merge var(--speed) ease-in-out infinite alternate; } .metaballs i:last-child { animation-direction:alternate-reverse; }
.helix .parts { gap:0; } .helix i { position:absolute; width:14%; left:calc(mod(var(--part),7)*14%); animation:coil var(--speed) ease-in-out calc(var(--part)*var(--speed)*-.08) infinite alternate; }
.morph i { width:75%; flex:none; animation:morph calc(var(--speed)*2.5) ease-in-out infinite; }
.text { font:var(--size)/1 ui-monospace,monospace; font-variant-numeric:tabular-nums; } .scramble .text,.percent .text { font-size:calc(var(--size)*.55); } .paused i { animation-play-state:paused!important; }
@keyframes turn {to {transform:rotate(360deg)}} @keyframes pulse {0%,100% {opacity:.2; transform:scale(.6)} 50% {opacity:1; transform:scale(1)}}
@keyframes jump {0%,100% {transform:translateY(0); opacity:.5} 50% {transform:translateY(-100%);opacity:1}}
@keyframes bars {0%,100% {transform:scaleY(.35)} 50% {transform:scaleY(1)}}
@keyframes morph {0%,100% {border-radius:50%;transform:rotate(0)} 33% {border-radius:14%;transform:rotate(90deg)} 66% {border-radius:25% 65% 20% 65%;transform:rotate(190deg)}}
@keyframes left-swing {0%,100% {transform:rotate(40deg)} 25%,75% {transform:rotate(0)}} @keyframes right-swing {0%,100% {transform:rotate(0)} 50% {transform:rotate(-40deg)}}
@keyframes merge {from {transform:translateX(-36%)} to {transform:translateX(36%)}} @keyframes coil {from {transform:translateY(-130%) scale(.7);opacity:.45} to {transform:translateY(130%) scale(1.1);opacity:1}}
@media(prefers-reduced-motion:reduce){.loader i {animation:none;} }
</style>
