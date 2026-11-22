<script setup lang="ts">
import { useSelectContext } from './select-context'

defineProps<{
  /** Shown while nothing is selected. Defaults to `labels.valuePlaceholder` ("Select"). */
  placeholder?: string
}>()

const ctx = useSelectContext('SelectValue')
</script>

<template>
  <span class="be-select-value" :data-placeholder="ctx.labelFor(ctx.value.value) ? undefined : ''">{{ ctx.labelFor(ctx.value.value) ?? placeholder ?? ctx.strings.value.valuePlaceholder }}</span>
</template>

<style scoped>
.be-select-value { color: var(--beui-foreground); }
.be-select-value[data-placeholder] { color: var(--beui-muted-foreground); }
</style>
