<script setup lang="ts">
import { computed, useAttrs, useId } from 'vue'

defineOptions({ inheritAttrs: false })
const { label, error, success, reserveErrorLine = false, id } = defineProps<{
  label?: string; error?: string | boolean; success?: boolean; reserveErrorLine?: boolean; id?: string
}>()
const value = defineModel<string>({ default: '' })
const attrs = useAttrs()
const uid = useId()
const inputId = computed(() => id ?? uid)
</script>
<template><div class="field" :class="attrs.class" :style="attrs.style as Record<string, string>" :data-error="Boolean(error)">
  <label v-if="label" :for="inputId" class="label">{{ label }}</label>
  <div class="shell"><span v-if="$slots.leftIcon" class="addon"><slot name="leftIcon" /></span>
    <input v-bind="{ ...attrs, class: undefined, style: undefined }" :id="inputId" v-model="value" class="native"
      :aria-invalid="error ? true : undefined" :aria-describedby="[attrs['aria-describedby'], typeof error === 'string' && error ? `${inputId}-error` : null].filter(Boolean).join(' ') || undefined" />
    <span v-if="success && !error" class="success" aria-hidden="true">✓</span><span v-else-if="$slots.rightIcon" class="addon"><slot name="rightIcon" /></span>
  </div><div v-if="reserveErrorLine || error" class="error"><span :id="`${inputId}-error`" aria-live="polite">{{ typeof error === 'string' ? error : '' }}</span></div>
</div></template>
<style scoped>
.field { display: grid; gap: .375rem; min-width: 0; width: 100%; font-size: .875rem; } .label { font-weight: 500; color: var(--beui-foreground); }
.shell { display: flex; align-items: center; gap: .5rem; min-height: 2.5rem; padding-inline: .75rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); transition: border-color .18s, box-shadow .18s; }
.shell:focus-within { border-color: var(--beui-ring); box-shadow: 0 0 0 3px color-mix(in srgb, var(--beui-ring) 20%, transparent); }
.native { min-width: 0; flex: 1; color: var(--beui-foreground); font: inherit; background: none; border: 0; outline: 0; padding: .4rem 0; }
.field[data-error=true] .shell { border-color: var(--beui-destructive); } .error { min-height: 1rem; color: var(--beui-destructive); font-size: .75rem; }
.success { color: #169d70; } .addon { display: inline-flex; color: var(--beui-muted-foreground); } .shell:has(.native:disabled) { opacity: .5; }
</style>
