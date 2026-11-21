<script setup lang="ts">
/** The selection checkbox: a native input (so the browser owns focus and the checked state) drawn like the library Checkbox. */
defineProps<{ checked: boolean; indeterminate?: boolean; label: string }>()
defineEmits<{ change: [] }>()
</script>

<template>
  <label class="be-table-cb">
    <input type="checkbox" class="be-table-cb-input" :aria-label="label" :checked="checked" :indeterminate.prop="indeterminate" @change="$emit('change')">
    <span class="be-table-cb-box" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path :d="indeterminate ? 'M6 12h12' : 'M5 13l4 4L19 7'" pathLength="1" />
      </svg>
    </span>
  </label>
</template>

<style scoped>
.be-table-cb { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem; cursor: pointer; }
.be-table-cb-input { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.be-table-cb-box { display: inline-flex; box-sizing: border-box; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem; border: 2px solid color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent); border-radius: .375rem; background: var(--beui-background); color: var(--beui-primary-foreground); transition: background-color .2s, border-color .2s, color .2s, transform .12s; }
.be-table-cb:hover .be-table-cb-box { border-color: var(--beui-muted-foreground); }
.be-table-cb-box svg { width: 12px; height: 12px; opacity: 0; transform: scale(.5); transition: opacity .16s cubic-bezier(.16, 1, .3, 1), transform .16s cubic-bezier(.16, 1, .3, 1); }
.be-table-cb-box path { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset .3s cubic-bezier(.16, 1, .3, 1) .04s; }
.be-table-cb-input:is(:checked, :indeterminate) + .be-table-cb-box { border-color: var(--beui-primary); background: var(--beui-primary); }
.be-table-cb-input:is(:checked, :indeterminate) + .be-table-cb-box :is(svg) { opacity: 1; transform: none; }
.be-table-cb-input:is(:checked, :indeterminate) + .be-table-cb-box path { stroke-dashoffset: 0; }
.be-table-cb-input:active + .be-table-cb-box { transform: scale(.92); }
.be-table-cb-input:focus-visible + .be-table-cb-box { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .be-table-cb-box, .be-table-cb-box svg, .be-table-cb-box path { transition: none; } .be-table-cb-input:active + .be-table-cb-box { transform: none; } .be-table-cb-box svg { transform: none; } }
</style>
