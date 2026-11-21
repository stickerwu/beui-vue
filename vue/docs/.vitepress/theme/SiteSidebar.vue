<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vitepress'
import { localizeSection, sections } from './catalog'
import Icon from './Icon.vue'
import { useLocale } from './i18n'

withDefaults(defineProps<{ mobile?: boolean }>(), { mobile: false })
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { isZh, t, href } = useLocale()
const sidebar = useTemplateRef<HTMLElement>('sidebar')
const tabsId = useId()
const panelId = useId()
const filter = shallowRef('all')
const filters = computed(() => [
  { value: 'all', label: t('All'), icon: 'grid' },
  { value: 'agents', label: t('Agents'), icon: 'bot' },
  { value: 'motion', label: t('Components'), icon: 'shapes' },
  { value: 'blocks', label: t('Blocks'), icon: 'blocks' },
])
const guides = computed(() => [
  { title: t('Installation'), path: '/install' },
  { title: t('Component catalog'), path: '/catalog' },
  { title: t('Verification'), path: '/verification' },
])
const localized = computed(() => sections.map(section => localizeSection(section, isZh.value ? 'zh' : 'en')))
const normalizedPath = computed(() => route.path.replace(/^\/en(?=\/)/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/')
const routeCategory = computed(() => sections.find((section) => normalizedPath.value === section.path || normalizedPath.value.startsWith(`${section.path}/`))?.slug)
const ownSection = computed(() => routeCategory.value === 'charts' || routeCategory.value === 'casino' ? routeCategory.value : undefined)
const visibleSections = computed(() => {
  if (ownSection.value) return localized.value.filter((section) => section.slug === ownSection.value)
  return ['agents', 'motion', 'blocks'].flatMap((slug) => {
    const section = localized.value.find((item) => item.slug === slug)
    return section && (filter.value === 'all' || filter.value === slug) ? [section] : []
  })
})
const showIntro = computed(() => Boolean(ownSection.value) || filter.value === 'all')
const homePath = computed(() => localized.value.find((section) => section.slug === (ownSection.value ?? 'motion'))?.path ?? '/components/motion')

function isCurrent(path: string) {
  return normalizedPath.value === path
}

function onFilterKeydown(event: KeyboardEvent) {
  if (!(event.target instanceof HTMLButtonElement)) return
  const current = filters.findIndex((item) => item.value === filter.value)
  let next = current
  if (event.key === 'ArrowRight') next = (current + 1) % filters.length
  else if (event.key === 'ArrowLeft') next = (current - 1 + filters.length) % filters.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = filters.length - 1
  else return
  event.preventDefault()
  filter.value = filters[next].value
  document.getElementById(`${tabsId}-${filter.value}`)?.focus()
}

async function revealActiveLink() {
  await nextTick()
  const container = sidebar.value
  const activeLink = container?.querySelector<HTMLAnchorElement>('a[aria-current="page"]')
  if (!container || !activeLink) return
  const bounds = container.getBoundingClientRect()
  const activeBounds = activeLink.getBoundingClientRect()
  if (activeBounds.top < bounds.top + 64 || activeBounds.bottom > bounds.bottom) {
    container.scrollTop += activeBounds.top - bounds.top - (bounds.height - activeBounds.height) / 2
  }
}

watch(routeCategory, (category) => {
  if (filter.value !== 'all') filter.value = category && ['agents', 'motion', 'blocks'].includes(category) ? category : 'all'
})
watch(() => route.path, revealActiveLink)
onMounted(revealActiveLink)
</script>

<template>
  <aside ref="sidebar" class="beui-site-sidebar" :class="{ 'is-mobile': mobile }" :aria-label="t('Site navigation')">
    <nav class="beui-sidebar-nav" :aria-label="t('Browse components')">
      <div v-if="!ownSection" class="beui-sidebar-filter">
        <div role="tablist" :aria-label="t('Component categories')" @keydown="onFilterKeydown">
          <button
            v-for="item in filters"
            :id="`${tabsId}-${item.value}`"
            :key="item.value"
            type="button"
            role="tab"
            :aria-label="item.label"
            :aria-selected="filter === item.value"
            :aria-controls="panelId"
            :tabindex="filter === item.value ? 0 : -1"
            :title="filter === item.value ? undefined : item.label"
            @click="filter = item.value"
          ><span class="beui-filter-icon"><Icon :name="item.icon" :size="16" /></span><span v-if="filter === item.value" class="beui-filter-label">{{ item.label }}</span></button>
        </div>
      </div>
      <div :id="panelId" class="beui-sidebar-groups" :role="ownSection ? undefined : 'tabpanel'" :aria-labelledby="ownSection ? undefined : `${tabsId}-${filter}`">
        <div v-if="showIntro" class="beui-sidebar-group">
          <p class="beui-sidebar-label">{{ t('Intro') }}</p>
          <a class="beui-sidebar-link" :href="href(homePath)" :aria-current="isCurrent(homePath) ? 'page' : undefined" @click="emit('navigate')">{{ t('Home') }}</a>
          <a v-if="!ownSection" class="beui-sidebar-link" href="https://beui.dev/react-native" target="_blank" rel="noopener noreferrer" @click="emit('navigate')"><span>beUI React Native</span><Icon name="arrow-up-right" :size="12" /></a>
        </div>
        <div v-if="!ownSection && filter === 'all'" class="beui-sidebar-group">
          <p class="beui-sidebar-label">{{ t('Guides') }}</p>
          <a v-for="guide in guides" :key="guide.path" class="beui-sidebar-link" :href="href(guide.path)" :aria-current="isCurrent(guide.path) ? 'page' : undefined" @click="emit('navigate')">{{ guide.title }}</a>
        </div>
        <div v-for="section in visibleSections" :key="section.slug" class="beui-sidebar-group">
          <a class="beui-sidebar-label beui-sidebar-category" :href="href(section.path)" @click="emit('navigate')">{{ section.name }}<span class="beui-sidebar-count">{{ section.entries.length }}</span></a>
          <a
            v-for="page in section.entries"
            :key="page.path"
            class="beui-sidebar-link"
            :href="href(page.path)"
            :aria-current="isCurrent(page.path) || normalizedPath.startsWith(`${page.path}/`) ? 'page' : undefined"
            @click="emit('navigate')"
          ><span>{{ page.title }}</span><span v-if="page.isNew" class="beui-new-badge">{{ t('New') }}</span></a>
        </div>
      </div>
    </nav>
  </aside>
</template>
