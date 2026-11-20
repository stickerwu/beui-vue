<script setup lang="ts">
import { AnimatedToastStack, useAnimatedToastStack, type ToastInput, type ToastPosition } from 'beui-vue'
import { onBeforeUnmount, shallowRef } from 'vue'

const positions: ToastPosition[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']
const position = shallowRef<ToastPosition>('bottom-right')
const { toasts, showToast, updateToast, dismissToast, clearToasts } = useAnimatedToastStack({ defaultDuration: 3600, limit: 5 })
const timers = new Set<number>()
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
    <AnimatedToastStack :toasts="toasts" :position="position" placement="fixed" :max-visible="4" @dismiss="dismissToast" />
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
.copy { text-align: center; font-size: .875rem; } .copy strong { font-weight: 500; color: var(--beui-foreground); }
.copy p { max-width: 24rem; margin: .5rem auto 0; font-size: .75rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.row { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: .5rem; }
.row button { font: inherit; font-size: .75rem; font-weight: 500; padding: 0 1rem; height: 2.25rem; border-radius: 999px; border: 1px solid transparent; cursor: pointer; }
.action { display: inline-flex; align-items: center; gap: .5rem; color: var(--beui-foreground); background: var(--beui-card); border-color: var(--beui-border) !important; }
.action svg { width: 14px; height: 14px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
.clear { background: transparent; color: var(--beui-muted-foreground); }
.edges { gap: .375rem; } .edges button { height: auto; padding: .25rem .625rem; font-size: .6875rem; color: var(--beui-muted-foreground); background: var(--beui-muted); }
.edges button[aria-pressed=true] { background: var(--beui-foreground); color: var(--beui-background); }
.row button:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
</style>
