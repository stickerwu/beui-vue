<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, useAttrs, useSlots, watch, type VNode } from 'vue'
import TabsTriggerIcon from './TabsTriggerIcon.vue'
import { TABS_SPRING, useTabs } from './context'

// A tab. `class` lands on the button; a `click` listener runs first and can
// `preventDefault()` to veto the selection.
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  value: string
  disabled?: boolean
  /** Class of the sliding indicator while this tab is selected. */
  indicatorClassName?: string
}>()
const slots = defineSlots<{
  /** An icon before the label, such as an SVG element. */
  icon?: () => VNode[]
  /** Label of the tab. */
  default?: () => VNode[]
}>()
const rawSlots = useSlots()
const attrs = useAttrs()

const ctx = useTabs('TabsTrigger')
const active = computed(() => ctx.value.value === props.value)
const disabled = computed(() => Boolean(props.disabled))
const tabIndex = computed(() => (!disabled.value && (ctx.tabStop.value === null || ctx.tabStop.value === props.value) ? 0 : -1))
const hasPanel = computed(() => ctx.panels.value.has(props.value))
const underline = computed(() => ctx.variant.value === 'underline')
// Only the initial mask is declared here; TabsList synchronises later ones.
const initialClip = active.value ? 'inset(0)' : 'inset(0 100% 0 0)'
// Custom triggers (`data-plain`) colour their own selected state, so they skip the inverted label.
const plain = computed(() => attrs['data-plain'] !== undefined)
const inverted = computed(() => !underline.value && !plain.value)
const indicatorStyle = computed(() => ({
  x: ctx.track.x,
  y: ctx.track.y,
  width: ctx.track.width,
  height: ctx.track.height,
  borderRadius: ctx.variant.value === 'pill' ? 9999 : 8,
}))

function register() {
  ctx.registerTab(props.value, { disabled: disabled.value, indicatorClassName: props.indicatorClassName })
}
onMounted(register)
watch([() => props.value, disabled, () => props.indicatorClassName], ([value], [previous]) => {
  if (value !== previous) ctx.unregisterTab(previous)
  register()
})
onBeforeUnmount(() => ctx.unregisterTab(props.value))

function select(event: MouseEvent) {
  if (!event.defaultPrevented) ctx.setValue(props.value)
}
</script>

<template>
  <!-- Underline: the indicator is a layout-animated child of the selected button. -->
  <button
    v-if="underline"
    :id="ctx.tabId(value)"
    :aria-controls="hasPanel ? ctx.panelId(value) : undefined"
    :tabindex="tabIndex"
    :disabled="disabled"
    v-bind="$attrs"
    type="button"
    role="tab"
    class="be-trigger is-underline"
    :aria-selected="active"
    @click="select"
  >
    <TabsTriggerIcon v-if="rawSlots.icon" :active="active"><slot name="icon" /></TabsTriggerIcon>
    <slot />
    <motion.span
      v-if="active"
      :layout-id="ctx.layoutId"
      layout
      class="be-indicator is-line"
      :class="indicatorClassName"
      :transition="ctx.reduce.value ? { duration: 0 } : TABS_SPRING"
    />
  </button>
  <!-- Pill and segment: each trigger sits in its own wrapper, and the selected
       one hosts the indicator, which the list springs to the tab's box. -->
  <div v-else class="be-tab">
    <motion.span
      v-if="active && ctx.placed.value"
      data-tabs-indicator=""
      class="be-indicator"
      :class="indicatorClassName"
      :style="indicatorStyle"
    />
    <button
      :id="ctx.tabId(value)"
      :aria-controls="hasPanel ? ctx.panelId(value) : undefined"
      :tabindex="tabIndex"
      :disabled="disabled"
      v-bind="$attrs"
      type="button"
      role="tab"
      class="be-trigger"
      :class="[`is-${ctx.variant.value}`, { 'be-plain': plain }]"
      :aria-selected="active"
      :data-tabs-value="value"
      @click="select"
    >
      <TabsTriggerIcon v-if="rawSlots.icon" :active="active"><slot name="icon" /></TabsTriggerIcon>
      <slot />
      <span v-if="inverted" data-tabs-label="" aria-hidden="true" inert class="be-ink" :style="{ clipPath: initialClip }">
        <TabsTriggerIcon v-if="rawSlots.icon" :active="active"><slot name="icon" /></TabsTriggerIcon>
        <slot />
      </span>
    </button>
  </div>
</template>

<style scoped>
.be-tab { flex-shrink: 0; }
.be-indicator { position: absolute; top: 0; left: 0; pointer-events: none; background: var(--beui-primary); }
.be-indicator.is-line { top: auto; right: 0; bottom: 0; left: 0; height: 1px; border-radius: 0; }
.be-trigger { position: relative; z-index: 10; display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; box-sizing: border-box; margin: 0; padding: .375rem .875rem; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 500; white-space: nowrap; outline: none; cursor: pointer; }
.be-trigger:hover { color: var(--beui-foreground); }
.be-trigger:disabled { cursor: default; }
.be-trigger.is-segment { border-radius: .375rem; }
.be-trigger.is-underline { z-index: auto; isolation: isolate; min-height: 44px; margin-bottom: -1px; padding: .25rem .75rem .625rem; border-radius: 0; outline: revert; transition: color .15s cubic-bezier(.4, 0, .2, 1); }
.be-trigger.is-underline[aria-selected=true] { color: var(--beui-foreground); }
.be-trigger.be-plain[aria-selected=true] { color: var(--beui-primary-foreground); }
.be-trigger :deep(.be-icon svg) { display: block; }
.be-ink { position: absolute; inset: 0; display: inline-flex; align-items: center; justify-content: center; gap: inherit; padding: inherit; color: var(--beui-primary-foreground); pointer-events: none; }
</style>
