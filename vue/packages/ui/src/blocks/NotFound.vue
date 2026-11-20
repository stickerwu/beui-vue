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
function attract(event: PointerEvent) {
  if (!matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) return
  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  element.style.setProperty('--glyph-x',`${(event.clientX - rect.left - rect.width / 2) * .6}px`)
  element.style.setProperty('--glyph-y',`${(event.clientY - rect.top - rect.height / 2) * .6}px`)
}
function release(event: PointerEvent) {
  const element = event.currentTarget as HTMLElement
  element.style.removeProperty('--glyph-x')
  element.style.removeProperty('--glyph-y')
}
const error = computed(() => props.labels?.terminalError ?? 'cd: no such file or directory: /page')
</script>
<template>
  <section class="be-block be-missing" :data-variant="variant" :style="style">
    <div v-if="variant === 'terminal'" class="be-terminal"><div class="be-terminal-bar"><i /><i /><i /><span>~/beui</span></div><div class="be-terminal-content"><span>$ cd /page</span><span>{{ error }}</span><span>$ status {{ code }} ▌</span></div></div>
    <div v-else class="be-missing-art" :aria-label="code" @pointermove="variant === 'spotlight' && track($event)" @pointerleave="point.x=50;point.y=50">
      <div v-if="variant === 'stacked'" class="be-stacked">
        <i aria-hidden="true" /><i aria-hidden="true" />
        <div class="be-stack-front"><b>{{ code }}</b><small>{{ labels?.stackedCaption ?? 'Out of the deck' }}</small></div>
      </div>
      <div v-else-if="variant === 'magnetic'" class="be-missing-code">
        <span v-for="(char,index) in [...code]" :key="index" class="be-glyph" @pointermove="attract" @pointerleave="release"><i>{{ char }}</i></span>
      </div>
      <div v-else class="be-missing-code" :data-code="code">{{ code }}</div>
    </div>
    <div><strong>{{ title ?? labels?.title ?? 'Page not found' }}</strong><p class="be-block-muted">{{ description ?? labels?.description ?? 'The page you are looking for moved, vanished, or never existed.' }}</p></div>
    <div class="be-block-row"><a class="be-block-button be-block-primary" :href="homeHref">{{ homeLabel ?? labels?.homeLabel ?? 'Back home' }}</a><a class="be-block-button" :href="browseHref">{{ browseLabel ?? labels?.browseLabel ?? 'Browse components' }}</a></div>
  </section>
</template>
<style scoped>
.be-missing{display:grid;justify-items:center;gap:1.15rem;text-align:center;padding:1.5rem .5rem}.be-missing p{max-width:24rem;margin:.3rem 0}.be-missing strong{font-size:1.125rem}.be-missing a{text-decoration:none}.be-missing-art{position:relative;width:100%;display:grid;place-items:center;overflow:hidden;min-height:9rem}.be-missing-code,.be-stacked{position:relative;font:850 clamp(5rem,13vw,8rem)/1 system-ui;letter-spacing:-.09em}
[data-variant=glitch] .be-missing-code:before,[data-variant=glitch] .be-missing-code:after {content:attr(data-code);position:absolute;inset:0;pointer-events:none;clip-path:inset(12% 0 65%);transform:translateX(-3px);color:#d24aae;animation:be-glitch-strip 3s steps(1,end) infinite}
[data-variant=glitch] .be-missing-code:after{color:#32a8b8;clip-path:inset(65% 0 15%);animation-delay:-1.6s}
.be-glyph,.be-glyph i { display:inline-block; }
.be-glyph i { font-style:normal; pointer-events:none; transform:translate(var(--glyph-x,0),var(--glyph-y,0)); transition:transform .16s ease-out; }
[data-variant=spotlight] .be-missing-art { aspect-ratio:16/9; border:1px solid var(--beui-border); border-radius:1.5rem; background:#101011; }
[data-variant=spotlight] .be-missing-code { color:rgb(255 255 255 / .14); position:static; }
[data-variant=spotlight] .be-missing-code::after { content:attr(data-code); position:absolute; display:grid; place-items:center; inset:0; color:#f6f6f8; }
.be-stacked { width:min(65%,16rem); height:10.5rem; margin:1.2rem 0; }
.be-stacked i,.be-stack-front { position:absolute; inset:0; border:1px solid var(--beui-border); border-radius:1.4rem; background:var(--beui-background); box-shadow:0 3px 8px #0001; }
.be-stack-front { display:grid; place-content:center; gap:.25rem; }
.be-stack-front b { font:800 clamp(3.5rem,9vw,5rem)/1 system-ui; letter-spacing:-.04em; }
.be-stack-front small { font:600 .7rem/1.4 system-ui; letter-spacing:.08em; text-transform:uppercase; color:var(--beui-muted-foreground); }
@media (hover:hover) and (prefers-reduced-motion:no-preference) {
  [data-variant=spotlight] .be-missing-code::after { mask-image:radial-gradient(200px circle at var(--spot-x) var(--spot-y),#000 25%,transparent 72%); }
  .be-stacked i,.be-stack-front { transition:transform .32s cubic-bezier(.2,.8,.2,1.18); }
  .be-stacked:hover i:first-child { transform:translate(-28px,8px) rotate(-9deg); }
  .be-stacked:hover i:nth-child(2) { transform:translate(28px,8px) rotate(9deg); }
  .be-stacked:hover .be-stack-front { transform:translateY(-6px); }
}
.be-terminal{width:min(100%,28rem);overflow:hidden;border-radius:.8rem;background:#111;color:#eee;text-align:left;box-shadow:0 8px 20px #0002}.be-terminal-bar{display:flex;align-items:center;gap:5px;padding:.7rem 1rem;border-bottom:1px solid #fff2}.be-terminal-bar i{width:10px;height:10px;border-radius:50%;background:#ff5f57}.be-terminal-bar i:nth-child(2){background:#febc2e}.be-terminal-bar i:nth-child(3){background:#28c840}.be-terminal-bar span{color:#bbb;margin-left:.5rem;font:.75rem monospace}.be-terminal-content{display:grid;gap:.4rem;padding:1rem;font:.875rem/1.4 monospace}.be-terminal-content span{width:max-content;max-width:100%;overflow:hidden;white-space:nowrap;animation:be-terminal-type .5s steps(22,end) both}.be-terminal-content span:nth-child(2){color:#ff706a;animation-delay:.45s}.be-terminal-content span:last-child{animation-delay:1.1s}
@keyframes be-glitch-strip{0%,86%,100%{transform:translateX(0)}88%,92%{transform:translateX(4px)}90%{transform:translateX(-3px)}}@keyframes be-terminal-type{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0)}}
@media(prefers-reduced-motion:reduce){.be-terminal-content span,[data-variant=glitch] .be-missing-code:before,[data-variant=glitch] .be-missing-code:after{animation:none}}
</style>
