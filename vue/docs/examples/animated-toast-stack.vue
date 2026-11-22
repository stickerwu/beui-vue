<script setup lang="ts">
import { AnimatedToastStack, useAnimatedToastStack, type ToastInput, type ToastPosition } from 'beui-vue'
import { h, onBeforeUnmount, shallowRef } from 'vue'

const positions: ToastPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']
const position = shallowRef<ToastPosition>('bottom-right')
const { toasts, showToast, updateToast, dismissToast, clearToasts } = useAnimatedToastStack({ defaultDuration: 3600, limit: 5 })
const timers = new Set<number>()
// The same overrides the upstream preview passes: a slightly translucent surface and a sparkles glyph for neutral toasts.
const classNames = { surface: 'toast-demo-surface' }
const icons = { neutral: h('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, [h('path', { d: 'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z' })]) }
const examples: (ToastInput & { label: string })[] = [
  { label: 'Title only', status: 'success', title: 'Saved', duration: 0 },
  { label: 'Promise', status: 'loading', title: 'Publishing component', description: 'Bundling source, preview, and registry metadata.', duration: 0 },
  { label: 'Success', status: 'success', title: 'Component published', description: 'Registry endpoint and raw source are available.' },
  { label: 'Error', status: 'error', title: 'Snapshot failed', description: 'Retry after the browser target settles.' },
]

function show(input: ToastInput) {
  const id = showToast(input)
  if (input.status !== 'loading') return
  const timer = window.setTimeout(() => {
    timers.delete(timer)
    updateToast(id, { status: 'success', title: 'Publish complete', description: 'Toast updated in-place from loading to success.', duration: 3200 })
  }, 1800)
  timers.add(timer)
}
function move(next: ToastPosition) {
  position.value = next
  showToast({ status: 'info', title: 'Position changed', description: `New toasts open from ${next}.` })
}
onBeforeUnmount(() => { for (const timer of timers) window.clearTimeout(timer) })
</script>

<template>
  <div class="toast-demo">
    <AnimatedToastStack :toasts="toasts" :position="position" placement="fixed" :max-visible="4" :class-names="classNames" :icons="icons" @dismiss="dismissToast" />
    <div class="copy"><strong>Open a real toast</strong><p>Toasts render fixed on the screen. Change position to open a toast from that edge.</p></div>
    <div class="row">
      <button v-for="example in examples" :key="example.label" type="button" class="action" @click="show(example)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="example.status === 'loading' ? 'M20 12a8 8 0 1 1-8-8' : example.status === 'error' ? 'm6 6 12 12M18 6 6 18' : 'm4 12 5 5L20 6'" /></svg>{{ example.label }}
      </button>
      <button type="button" class="clear" @click="clearToasts">Clear</button>
    </div>
    <div class="row edges" role="group" aria-label="Toast position">
      <button v-for="edge in positions" :key="edge" type="button" :aria-pressed="position === edge" @click="move(edge)">{{ edge }}</button>
    </div>
  </div>
</template>

<style scoped>
.toast-demo { min-height: 18rem; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; }
.copy { display: flex; flex-direction: column; align-items: center; gap: .5rem; text-align: center; } .copy strong { display: block; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.copy p { max-width: 24rem; margin: 0; padding: 0; font-size: .75rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.row { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: .5rem; }
/* The upstream `press` utility: a 120ms scale on press. */
.row button { font: inherit; font-size: .75rem; line-height: 1rem; font-weight: 500; padding: 0 1rem; height: 2.25rem; border-radius: 999px; border: 0; cursor: pointer; transition: transform 120ms cubic-bezier(.16, 1, .3, 1), color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1), border-color .15s cubic-bezier(.4, 0, .2, 1); }
.row button:active { transform: scale(.97); }
.row .action { display: inline-flex; align-items: center; gap: .5rem; color: var(--beui-foreground); background: var(--beui-card); border: 1px solid var(--beui-border); }
.row .action:hover { border-color: var(--beui-border-strong); }
.action svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
.clear { background: transparent; color: var(--beui-muted-foreground); }
.clear:hover { background: color-mix(in srgb, var(--beui-foreground) 6.5%, transparent); color: var(--beui-foreground); }
.edges { gap: .375rem; } .edges button { height: auto; padding: .25rem .625rem; font-size: 11px; line-height: inherit; color: var(--beui-muted-foreground); background: color-mix(in srgb, var(--beui-foreground) 4%, transparent); }
.edges button:hover { background: color-mix(in srgb, var(--beui-foreground) 8%, transparent); color: var(--beui-foreground); }
.edges button[aria-pressed=true] { background: var(--beui-foreground); color: var(--beui-background); }
.row button:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
</style>
<style>
.toast-demo-surface { background: color-mix(in srgb, var(--beui-card) 95%, transparent); }
</style>
