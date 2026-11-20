<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { Labels } from '../agents/shared'
export type NotFoundVariant = 'glitch' | 'magnetic' | 'spotlight' | 'stacked' | 'terminal'
export interface NotFoundProps { code?: string, title?: string, description?: string, homeHref?: string, homeLabel?: string, browseHref?: string, browseLabel?: string, labels?: Labels }
const props = withDefaults(defineProps<NotFoundProps & { variant:NotFoundVariant }>(), { code:'404', homeHref:'/', browseHref:'/components/motion' })
const point = reactive({ x:50, y:50 })
const style = computed(() => ({ '--spot-x':`${point.x}%`, '--spot-y':`${point.y}%`, '--mag-x':`${(point.x-50)*.17}px`, '--mag-y':`${(point.y-50)*.18}px` }))
function track(event: PointerEvent) {
  if (!matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) return
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  point.x = 100*(event.clientX-box.left)/box.width; point.y = 100*(event.clientY-box.top)/box.height
}
const error = computed(() => props.labels?.terminalError ?? 'cd: /page: No such file or directory')
</script>
<template>
  <section class="be-block be-missing" :data-variant="variant" :style="style" @pointermove="track" @pointerleave="point.x=50;point.y=50">
    <div v-if="variant === 'terminal'" class="be-terminal"><div class="be-terminal-bar"><i /><i /><i /><span>~/beui</span></div><div class="be-terminal-content"><span>$ cd /page</span><span>{{ error }}</span><span>$ status {{ code }} ▌</span></div></div>
    <div v-else class="be-missing-art" aria-hidden="true"><div v-if="variant === 'stacked'" class="be-stacked" :data-code="code">{{ code }}</div><div v-else class="be-missing-code" :data-code="code">{{ code }}</div></div>
    <div><strong>{{ title ?? labels?.title ?? 'Page not found' }}</strong><p class="be-block-muted">{{ description ?? labels?.description ?? 'The page you are looking for moved, vanished, or never existed.' }}</p></div>
    <div class="be-block-row"><a class="be-block-button be-block-primary" :href="homeHref">{{ homeLabel ?? labels?.homeLabel ?? 'Back home' }}</a><a class="be-block-button" :href="browseHref">{{ browseLabel ?? labels?.browseLabel ?? 'Browse components' }}</a></div>
  </section>
</template>
<style scoped>
.be-missing{display:grid;justify-items:center;gap:1.15rem;text-align:center;padding:1.5rem .5rem}.be-missing p{max-width:24rem;margin:.3rem 0}.be-missing strong{font-size:1.125rem}.be-missing a{text-decoration:none}.be-missing-art{position:relative;width:100%;display:grid;place-items:center;overflow:hidden;min-height:9rem}.be-missing-code,.be-stacked{position:relative;font:850 clamp(5rem,13vw,8rem)/1 system-ui;letter-spacing:-.09em}
[data-variant=glitch] .be-missing-code:before,[data-variant=glitch] .be-missing-code:after {content:attr(data-code);position:absolute;inset:0;pointer-events:none;clip-path:inset(12% 0 65%);transform:translateX(-3px);color:#d24aae;animation:be-glitch-strip 3s steps(1,end) infinite}
[data-variant=glitch] .be-missing-code:after{color:#32a8b8;clip-path:inset(65% 0 15%);animation-delay:-1.6s}
[data-variant=magnetic] .be-missing-code{transform:translate(var(--mag-x),var(--mag-y));transition:transform .16s ease-out}
[data-variant=spotlight] .be-missing-art{background:radial-gradient(circle at var(--spot-x) var(--spot-y),var(--beui-primary),var(--beui-muted) 50%);background-clip:text;color:transparent}
.be-stacked{isolation:isolate;transform:rotate(-4deg)}.be-stacked:before,.be-stacked:after{content:attr(data-code);position:absolute;inset:0;z-index:-1;color:var(--beui-muted-foreground);transform:translate(3px,-5px)}.be-stacked:after{z-index:-2;opacity:.45;transform:translate(6px,-10px)}
.be-terminal{width:min(100%,28rem);overflow:hidden;border-radius:.8rem;background:#111;color:#eee;text-align:left;box-shadow:0 8px 20px #0002}.be-terminal-bar{display:flex;align-items:center;gap:5px;padding:.7rem 1rem;border-bottom:1px solid #fff2}.be-terminal-bar i{width:10px;height:10px;border-radius:50%;background:#ff5f57}.be-terminal-bar i:nth-child(2){background:#febc2e}.be-terminal-bar i:nth-child(3){background:#28c840}.be-terminal-bar span{color:#bbb;margin-left:.5rem;font:.75rem monospace}.be-terminal-content{display:grid;gap:.4rem;padding:1rem;font:.875rem/1.4 monospace}.be-terminal-content span{width:max-content;max-width:100%;overflow:hidden;white-space:nowrap;animation:be-terminal-type .5s steps(22,end) both}.be-terminal-content span:nth-child(2){color:#ff706a;animation-delay:.45s}.be-terminal-content span:last-child{animation-delay:1.1s}
@keyframes be-glitch-strip{0%,86%,100%{transform:translateX(0)}88%,92%{transform:translateX(4px)}90%{transform:translateX(-3px)}}@keyframes be-terminal-type{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0)}}
@media(prefers-reduced-motion:reduce){.be-terminal-content span,[data-variant=glitch] .be-missing-code:before,[data-variant=glitch] .be-missing-code:after{animation:none}}
</style>
