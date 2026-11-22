<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useMorphSelectContext } from './select-context'

const props = defineProps<{
  /** Shown while nothing is selected, in the trigger and the open panel's header. Defaults to `labels.valuePlaceholder` ("Select"). */
  placeholder?: string
}>()

const ctx = useMorphSelectContext('MorphSelectValue')
// Surface the placeholder so the morph header (rendered by the content) matches.
onMounted(() => {
  watch(() => props.placeholder || ctx.strings.value.valuePlaceholder, placeholder => ctx.setPlaceholder(placeholder), { immediate: true })
})
</script>

<template>
  <span class="be-smorph-value" :data-placeholder="ctx.labelFor(ctx.value.value) ? undefined : ''">{{ ctx.labelFor(ctx.value.value) ?? placeholder ?? ctx.strings.value.valuePlaceholder }}</span>
</template>

<style scoped>
.be-smorph-value { color: var(--beui-foreground); }
.be-smorph-value[data-placeholder] { color: var(--beui-muted-foreground); }
</style>
