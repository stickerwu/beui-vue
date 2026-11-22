<script lang="ts">
export { tabsMessages, type TabsMessages, type TabsVariant, type TabsIconDisplay } from './tabs/context'

/** A tab described by data, for the `items` shorthand. */
export interface TabItem { value: string; label: string; content?: string; disabled?: boolean }
</script>

<script setup lang="ts">
import { motion, useSpring } from 'motion-v'
import { computed, provide, shallowRef, useId, useSlots } from 'vue'
import { useReducedMotion } from './core/reduced-motion'
import TabsContent from './tabs/TabsContent.vue'
import TabsList from './tabs/TabsList.vue'
import TabsTrigger from './tabs/TabsTrigger.vue'
import {
  TABS_SPRING,
  tabsKey,
  tabsMessages,
  type TabRegistration,
  type TabsContext,
  type TabsIconDisplay,
  type TabsMessages,
  type TabsVariant,
} from './tabs/context'

const props = withDefaults(defineProps<{
  /** Shorthand for a list of triggers and their panels. Omit it and compose `TabsList`, `TabsTrigger` and `TabsContent` instead. */
  items?: readonly TabItem[]
  defaultValue?: string
  variant?: 'pill' | 'underline' | 'segment'
  /**
   * With "selected", a trigger's icon springs open only on the selected tab
   * and folds away when another is chosen. Defaults to "always".
   */
  icons?: 'always' | 'selected'
  /** Override any built-in string. `list` names the tab list for assistive technology. */
  labels?: Partial<TabsMessages> & { list?: string }
}>(), { variant: 'pill', icons: 'always' })
/** The selected tab's value. Leave it unbound for an uncontrolled `Tabs` that starts at `defaultValue`. */
const model = defineModel<string>()
const emit = defineEmits<{ valueChange: [value: string] }>()
const slots = defineSlots<{
  /** `TabsList` and `TabsContent`, or nothing when `items` is set. */
  default?: () => unknown
  /** Content of a trigger in `items` mode. Defaults to the item's label. */
  trigger?: (props: { item: TabItem; active: boolean }) => unknown
  /** Icon of a trigger in `items` mode. */
  icon?: (props: { item: TabItem; active: boolean }) => unknown
  /** Content of a panel in `items` mode. Defaults to the item's `content`. */
  panel?: (props: { item: TabItem; active: boolean }) => unknown
}>()
const rawSlots = useSlots()

const reduce = useReducedMotion()
const t = computed(() => ({ ...tabsMessages, ...props.labels }))
const firstEnabled = () => props.items?.find(item => !item.disabled)?.value ?? ''
const internal = shallowRef(props.defaultValue ?? firstEnabled())
const current = computed(() => model.value ?? internal.value)
function setValue(value: string) {
  if (value !== current.value) internal.value = value
  model.value = value
  emit('valueChange', value)
}

const x = useSpring(0, TABS_SPRING)
const y = useSpring(0, TABS_SPRING)
const width = useSpring(0, TABS_SPRING)
const height = useSpring(0, TABS_SPRING)
const placed = shallowRef(false)

const tabs = shallowRef<ReadonlyMap<string, TabRegistration>>(new Map())
function registerTab(value: string, registration: TabRegistration) {
  const known = tabs.value.get(value)
  if (known && known.disabled === registration.disabled && known.indicatorClassName === registration.indicatorClassName) return
  tabs.value = new Map(tabs.value).set(value, registration)
}
function unregisterTab(value: string) {
  if (!tabs.value.has(value)) return
  const next = new Map(tabs.value)
  next.delete(value)
  tabs.value = next
}
const panels = shallowRef<ReadonlySet<string>>(new Set())
function registerPanel(value: string) {
  if (!panels.value.has(value)) panels.value = new Set(panels.value).add(value)
}
function unregisterPanel(value: string) {
  if (!panels.value.has(value)) return
  const next = new Set(panels.value)
  next.delete(value)
  panels.value = next
}
// Resolved from the registry during render so the list has exactly one tab
// stop in the same commit that changes the selection or the tabs.
const tabStop = computed<string | null>(() => {
  if (tabs.value.size === 0) return null
  const enabled = Array.from(tabs.value).filter(([, registration]) => !registration.disabled)
  return enabled.some(([value]) => value === current.value) ? current.value : (enabled[0]?.[0] ?? '')
})
const baseId = useId()
const layoutId = useId()
const slug = (value: string) => value.replace(/[^\w-]/g, '_')

provide(tabsKey, {
  value: current,
  layoutId,
  setValue,
  variant: computed(() => props.variant),
  icons: computed(() => props.icons),
  reduce,
  track: { x, y, width, height },
  placed,
  tabStop,
  tabs,
  registerTab,
  unregisterTab,
  panels,
  registerPanel,
  unregisterPanel,
  tabId: value => `${baseId}-tab-${slug(value)}`,
  panelId: value => `${baseId}-panel-${slug(value)}`,
  t,
} satisfies TabsContext)

const hasPanel = (item: TabItem) => Boolean(rawSlots.panel) || item.content !== undefined
</script>

<template>
  <!-- layoutRoot: the underline indicator measures in page coordinates, so inside
       fixed or scrolled containers it would replay scroll offsets as movement. -->
  <motion.div layout-root class="be-tabs" :data-variant="variant">
    <slot>
      <template v-if="items">
        <TabsList :aria-label="labels?.list">
          <TabsTrigger v-for="item in items" :key="item.value" :value="item.value" :disabled="item.disabled" :data-plain="slots.trigger ? '' : undefined">
            <template v-if="slots.icon" #icon><slot name="icon" :item="item" :active="item.value === current" /></template>
            <slot name="trigger" :item="item" :active="item.value === current">{{ item.label }}</slot>
          </TabsTrigger>
        </TabsList>
        <template v-for="item in items" :key="item.value">
          <TabsContent v-if="hasPanel(item)" :value="item.value">
            <slot name="panel" :item="item" :active="item.value === current">{{ item.content }}</slot>
          </TabsContent>
        </template>
      </template>
    </slot>
  </motion.div>
</template>

<style scoped>
.be-tabs { min-width: 0; max-width: 100%; }
</style>
