<script setup lang="ts">
import { computed, shallowRef, useAttrs, useTemplateRef } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { useColorPickerContext } from './color-picker-context'

/** Hex field with a `#` prefix. Commits on Enter or blur; a rejected entry shakes. `class` and `style` go to the wrapper, other attributes to the input. */
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
const inputAttrs = computed(() => { const { class: _class, style: _style, ...rest } = attrs; return rest })
const context = useColorPickerContext('ColorPickerHexInput')
const reduce = useReducedMotion()
const draft = shallowRef<string | null>(null)
const wrap = useTemplateRef<HTMLDivElement>('wrap')

function settle() {
  if (draft.value === null) return
  if (!context.applyHex(draft.value)) {
    // A horizontal shake for rejected input; dropped under reduced motion.
    const element = wrap.value
    if (element && !reduce.value) element.animate([0, -5, 5, -3, 3, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 300, easing: 'ease-in-out' })
  } else context.commit()
  draft.value = null
}
function input(event: Event) {
  const next = (event.target as HTMLInputElement).value.replace(/^#/, '')
  draft.value = next
  // Live preview only for full-length entries, so "abc" mid-way to "abcdef" does not flash a short-form colour.
  if (next.length === 6 || next.length === 8) context.applyHex(next)
}
function keys(event: KeyboardEvent) {
  if (event.key === 'Enter') settle()
  // Escape drops the half-typed value; the panel still dismisses on it.
  if (event.key === 'Escape' && draft.value !== null) draft.value = null
}
</script>

<template>
  <div ref="wrap" class="be-picker-hex-wrap" :class="attrs.class" :style="attrs.style as never">
    <span class="be-picker-hash" aria-hidden="true">#</span>
    <input
      v-bind="inputAttrs" class="be-picker-field be-picker-hex" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="9"
      :disabled="context.disabled.value" :aria-label="context.t.value.hex" :value="draft ?? context.hex.value.slice(1).toUpperCase()"
      @input="input" @blur="settle" @keydown="keys">
  </div>
</template>

<style>
.be-picker-hex-wrap { position: relative; display: flex; min-width: 0; flex: 1; }
.be-picker-hash { pointer-events: none; position: absolute; left: .75rem; top: 50%; transform: translateY(-50%); color: var(--beui-muted-foreground); font-size: .875rem; line-height: 1.25rem; }
.be-picker-field { box-sizing: border-box; height: 2.25rem; width: 100%; min-width: 0; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; font-variant-numeric: tabular-nums; outline: none; transition: border-color .15s, box-shadow .15s; }
.be-picker-field:focus-visible { border-color: color-mix(in srgb, var(--beui-foreground) 40%, transparent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-ring) 30%, transparent); }
.be-picker-field:disabled { cursor: not-allowed; opacity: .5; }
.be-picker-hex { padding: 0 .75rem 0 1.5rem; font-family: var(--font-mono, ui-monospace, monospace); text-transform: uppercase; }
</style>
