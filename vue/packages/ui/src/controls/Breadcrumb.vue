<script lang="ts">
export { breadcrumbMessages, type BreadcrumbMessages } from './breadcrumb-context'
export interface BreadcrumbCrumb { label: string; href?: string }
</script>

<script setup lang="ts">
import { computed, nextTick, provide, useTemplateRef, watch } from 'vue'
import BreadcrumbItem from './BreadcrumbItem.vue'
import BreadcrumbLink from './BreadcrumbLink.vue'
import BreadcrumbList from './BreadcrumbList.vue'
import BreadcrumbPage from './BreadcrumbPage.vue'
import BreadcrumbSeparator from './BreadcrumbSeparator.vue'
import { breadcrumbKey, breadcrumbMessages, type BreadcrumbMessages } from './breadcrumb-context'

/**
 * A navigation landmark. Keep it mounted while the route changes. Compose it from
 * `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`,
 * `BreadcrumbSeparator` and `BreadcrumbEllipsis`, or pass `items` for the ready-made path.
 */
const props = withDefaults(defineProps<{
  /** Ready-made path, in order; the last entry is the current page. Omit it to compose the parts yourself. */
  items?: readonly BreadcrumbCrumb[]
  /** Maximum visible slots, including the ellipsis (with `items`). Minimum 3; Infinity disables collapsing. */
  maxItems?: number
  /** Accessible name of the navigation landmark. */
  label?: string
  /** Override any built-in string. */
  labels?: Partial<BreadcrumbMessages>
}>(), { maxItems: 4 })
defineSlots<{
  /** Compose the parts: a `BreadcrumbList` of `BreadcrumbItem`s. Ignored when `items` is given. */
  default?: () => unknown
  /** Icon inside a crumb of the ready-made path. */
  icon?: (props: { item: BreadcrumbCrumb; index: number }) => unknown
}>()
const emit = defineEmits<{ navigate: [item: BreadcrumbCrumb, index: number, event: MouseEvent] }>()
const t = computed(() => ({ ...breadcrumbMessages, ...props.labels }))
provide(breadcrumbKey, { t })
const root = useTemplateRef<HTMLElement>('root')

function pick(event: MouseEvent, item: BreadcrumbCrumb, index: number) {
  emit('navigate', item, index, event)
  // The chosen path may leave the visible list, and its link unmounts with the
  // panel, so focus would fall to the body. The current page is where the
  // reader just arrived.
  if ((event.target as Element | null)?.closest('a[href]')) restoreFocus = true
}
// A consumer that moves focus itself still wins: this only rescues a focus
// that would otherwise be lost with the removed link.
let restoreFocus = false
watch(() => props.items, async () => {
  if (!restoreFocus) return
  restoreFocus = false
  await nextTick()
  queueMicrotask(() => {
    // A consumer that focused something still in the page wins; a focus left
    // on the link that just unmounted, or on a crumb that is fading out
    // (inert), does not.
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected && !active.closest('[inert]')) return
    const current = root.value?.querySelector<HTMLElement>('[aria-current="page"]:not([inert] *)')
    if (current && !current.closest('[inert]')) current.focus({ preventScroll: true })
  })
})
</script>

<template>
  <nav ref="root" :aria-label="label ?? t.label" class="be-crumb">
    <BreadcrumbList v-if="items" :max-items="maxItems" :overflow-label="t.showHidden">
      <BreadcrumbItem v-for="(item, index) in items" :key="`${index}:${item.label}`">
        <BreadcrumbSeparator v-if="index > 0" />
        <BreadcrumbPage v-if="index === items.length - 1" tabindex="-1"><slot name="icon" :item="item" :index="index" />{{ item.label }}</BreadcrumbPage>
        <BreadcrumbLink v-else-if="item.href" :href="item.href" @click="pick($event, item, index)"><slot name="icon" :item="item" :index="index" />{{ item.label }}</BreadcrumbLink>
        <BreadcrumbLink v-else as="button" type="button" @click="pick($event, item, index)"><slot name="icon" :item="item" :index="index" />{{ item.label }}</BreadcrumbLink>
      </BreadcrumbItem>
    </BreadcrumbList>
    <slot v-else />
  </nav>
</template>

<style>
.be-crumb { min-width: 0; }
</style>
