<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, watch, type VNode } from 'vue'
import { easeOut } from '../core/motion'
import { useTabs } from './context'

// The panel for one tab. Inactive panels stay mounted but hidden, so their
// content (e.g. source code) is present in the server-rendered HTML for
// crawlers and assistive tech, instead of being dropped from the DOM.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ value: string }>()
defineSlots<{ default?: () => VNode[] }>()

const ctx = useTabs('TabsContent')
const active = computed(() => ctx.value.value === props.value)

onMounted(() => ctx.registerPanel(props.value))
watch(() => props.value, (next, previous) => {
  ctx.unregisterPanel(previous)
  ctx.registerPanel(next)
})
onBeforeUnmount(() => ctx.unregisterPanel(props.value))
</script>

<template>
  <motion.div
    v-if="active"
    :id="ctx.panelId(value)"
    :key="value"
    v-bind="$attrs"
    role="tabpanel"
    :aria-labelledby="ctx.tabId(value)"
    tabindex="0"
    :initial="{ opacity: 0, y: ctx.reduce.value ? 0 : 4 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.18, ease: easeOut }"
    class="be-panel"
  ><slot /></motion.div>
  <div v-else :id="ctx.panelId(value)" v-bind="$attrs" role="tabpanel" :aria-labelledby="ctx.tabId(value)" hidden class="be-panel"><slot /></div>
</template>

<style scoped>
.be-panel { border-radius: .375rem; outline: none; }
.be-panel:not([hidden]) { margin-top: 1rem; }
.be-panel:focus-visible { box-shadow: 0 0 0 2px color-mix(in oklab, var(--beui-ring) 40%, transparent); }
</style>
