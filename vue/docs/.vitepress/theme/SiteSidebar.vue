<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vitepress'
import { motion } from 'motion-v'
import { SharedLayoutBg, Tooltip, easeOut, layoutSpring, pressSpring, useReducedMotion } from 'beui-vue'
import { localizeSection, sections, type CatalogPage } from './catalog'
import Icon from './Icon.vue'
import { useLocale } from './i18n'

withDefaults(defineProps<{ mobile?: boolean }>(), { mobile: false })
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { isZh, t, href } = useLocale()
const reduce = useReducedMotion()
const sidebar = useTemplateRef<HTMLElement>('sidebar')
const tabsId = useId()
const panelId = useId()

// Same filters, order and icons as beui.dev's SidebarCategoryTabs.
const filters = computed(() => [
  { value: 'all', label: t('All'), icon: 'grid' },
  { value: 'agents', label: t('Agents'), icon: 'bot' },
  { value: 'motion', label: t('Components'), icon: 'shapes' },
  { value: 'blocks', label: t('Blocks'), icon: 'blocks' },
])
const guides = computed(() => [
  { title: t('Installation'), path: '/install' },
  { title: t('Component catalog'), path: '/catalog' },
])
const localized = computed(() => sections.map(section => localizeSection(section, isZh.value ? 'zh' : 'en')))
const normalizedPath = computed(() => route.path.replace(/^\/en(?=\/)/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/')
const routeCategory = computed(() => sections.find((section) => normalizedPath.value === section.path || normalizedPath.value.startsWith(`${section.path}/`))?.slug)
// Charts and Casino are their own sections: the sidebar lists only that section, without the filter.
const ownSection = computed(() => routeCategory.value === 'charts' || routeCategory.value === 'casino' ? routeCategory.value : undefined)
const filter = shallowRef('all')
const groups = computed(() => (ownSection.value ? [ownSection.value] : ['agents', 'motion', 'blocks']).flatMap((slug) => {
  const section = localized.value.find((item) => item.slug === slug)
  return section ? [section] : []
}))
const homePath = computed(() => localized.value.find((section) => section.slug === (ownSection.value ?? 'motion'))?.path ?? '/components/motion')

/** Sidebar order: items still marked new first, the rest in catalog order (upstream moveNewItemsToTop). */
function newFirst(pages: CatalogPage[]) {
  return [...pages.filter(page => page.isNew), ...pages.filter(page => !page.isNew)]
}
function isCurrent(path: string) {
  return normalizedPath.value === path
}
function linkCurrent(path: string) {
  return isCurrent(path) || normalizedPath.value.startsWith(`${path}/`)
}

// Keep a filtered sidebar in step with header links and history: All stays All; a category filter follows the route.
watch(routeCategory, (category) => {
  if (filter.value !== 'all') filter.value = category && ['agents', 'motion', 'blocks'].includes(category) ? category : 'all'
})

function onTabKeydown(event: KeyboardEvent) {
  const target = event.target
  if (!(target instanceof HTMLButtonElement) || target.getAttribute('role') !== 'tab') return
  const tabs = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('[role="tab"]'))
  const current = tabs.indexOf(target)
  const rtl = getComputedStyle(event.currentTarget as HTMLElement).direction === 'rtl'
  let next: number
  switch (event.key) {
    case 'ArrowRight': next = current + (rtl ? -1 : 1); break
    case 'ArrowLeft': next = current + (rtl ? 1 : -1); break
    case 'Home': next = 0; break
    case 'End': next = tabs.length - 1; break
    default: return
  }
  event.preventDefault()
  const tab = tabs[(next + tabs.length) % tabs.length]
  tab.focus()
  tab.click()
}

// Same springs and timings as upstream: layout glides on SPRING_LAYOUT, press on SPRING_PRESS,
// the label fades and unblurs in 180ms and leaves in 100ms on EASE_OUT.
const instant = { duration: 0 }
const layoutTransition = computed(() => (reduce.value ? instant : layoutSpring))
const tabTransition = computed(() => ({ layout: layoutTransition.value, scale: pressSpring }))
function labelTransition(active: boolean) {
  const fade = { duration: active ? 0.18 : 0.1, ease: easeOut }
  return { layout: layoutTransition.value, opacity: fade, filter: fade }
}

const STICKY_CLEARANCE = 64
async function revealActiveLink() {
  await nextTick()
  const container = sidebar.value
  const activeLink = container?.querySelector<HTMLAnchorElement>('a[aria-current="page"]')
  if (!container || !activeLink) return
  const view = container.getBoundingClientRect()
  const item = activeLink.getBoundingClientRect()
  if (item.top >= view.top + STICKY_CLEARANCE && item.bottom <= view.bottom) return
  container.scrollTop += item.top - view.top - (view.height - item.height) / 2
}
watch(() => route.path, revealActiveLink)
onMounted(revealActiveLink)
</script>

<template>
  <aside ref="sidebar" class="beui-site-sidebar" :class="{ 'is-mobile': mobile }" :aria-label="t('Site navigation')">
    <nav class="beui-sidebar-nav" :aria-label="t('Browse components')">
      <div v-if="!ownSection" class="beui-sidebar-filter">
        <motion.section layout-root :aria-label="t('Filter by category')" class="beui-sidebar-filter-root" @keydown="onTabKeydown">
          <motion.div
            layout :layout-dependency="filter" :transition="layoutTransition" :style="{ borderRadius: '9999px' }"
            role="tablist" :aria-label="t('Component categories')" class="beui-sidebar-tablist"
          >
            <Tooltip v-for="item in filters" :key="item.value" :content="item.label" side="bottom" :disabled="filter === item.value">
              <motion.button
                :id="`${tabsId}-${item.value}`"
                type="button" role="tab" class="beui-sidebar-tab"
                :aria-label="item.label" :aria-selected="filter === item.value" :aria-controls="panelId"
                :tabindex="filter === item.value ? 0 : -1"
                layout :layout-dependency="filter" :transition="tabTransition"
                :while-press="reduce ? undefined : { scale: 0.97 }" :style="{ borderRadius: '9999px' }"
                @click="filter = item.value"
              >
                <motion.span layout="position" :layout-dependency="filter" :transition="layoutTransition" class="beui-filter-icon" aria-hidden="true">
                  <Icon :name="item.icon" :size="16" :stroke-width="2" />
                </motion.span>
                <!-- Kept mounted so an interrupted exit cannot remove a reselected label. -->
                <motion.span
                  layout="position" :layout-dependency="filter" aria-hidden="true" :initial="false"
                  :animate="{ opacity: filter === item.value ? 1 : 0, filter: reduce || filter === item.value ? 'blur(0px)' : 'blur(4px)' }"
                  :transition="labelTransition(filter === item.value)"
                  class="beui-filter-label" :data-active="filter === item.value || undefined"
                >{{ item.label }}</motion.span>
              </motion.button>
            </Tooltip>
          </motion.div>
        </motion.section>
      </div>
      <div :id="panelId" class="beui-sidebar-groups" :role="ownSection ? undefined : 'tabpanel'" :aria-labelledby="ownSection ? undefined : `${tabsId}-${filter}`">
        <div class="beui-sidebar-group" :hidden="!ownSection && filter !== 'all'">
          <p class="beui-sidebar-label">{{ t('Intro') }}</p>
          <SharedLayoutBg :inset="0" pill-class="beui-sidebar-pill">
            <a key="home" class="beui-sidebar-link" :href="href(homePath)" :aria-current="isCurrent(homePath) ? 'page' : undefined" @click="emit('navigate')">{{ t('Home') }}</a>
            <a v-if="!ownSection" key="native" class="beui-sidebar-link" href="https://beui.dev/react-native" target="_blank" rel="noopener noreferrer" @click="emit('navigate')"><span>beUI React Native</span><Icon name="arrow-up-right" :size="12" /></a>
          </SharedLayoutBg>
        </div>
        <div v-if="!ownSection" class="beui-sidebar-group" :hidden="filter !== 'all'">
          <p class="beui-sidebar-label">{{ t('Guides') }}</p>
          <SharedLayoutBg :inset="0" pill-class="beui-sidebar-pill">
            <a v-for="guide in guides" :key="guide.path" class="beui-sidebar-link" :href="href(guide.path)" :aria-current="isCurrent(guide.path) ? 'page' : undefined" @click="emit('navigate')">{{ guide.title }}</a>
          </SharedLayoutBg>
        </div>
        <div v-for="section in groups" :key="section.slug" class="beui-sidebar-group" :hidden="!ownSection && filter !== 'all' && filter !== section.slug">
          <a class="beui-sidebar-label beui-sidebar-category" :href="href(section.path)" @click="emit('navigate')">{{ section.name }}<span class="beui-sidebar-count">{{ section.entries.length }}</span></a>
          <SharedLayoutBg :inset="0" pill-class="beui-sidebar-pill">
            <a
              v-for="page in newFirst(section.entries)"
              :key="page.path"
              class="beui-sidebar-link"
              :href="href(page.path)"
              :aria-current="linkCurrent(page.path) ? 'page' : undefined"
              @click="emit('navigate')"
            ><span>{{ page.title }}</span><span v-if="page.isNew" class="beui-new-badge">{{ t('New') }}</span></a>
          </SharedLayoutBg>
        </div>
      </div>
    </nav>
  </aside>
</template>
