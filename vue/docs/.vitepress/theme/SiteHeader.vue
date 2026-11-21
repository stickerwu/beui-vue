<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useData, useRoute, useRouter, withBase } from 'vitepress'
import { localizePage, localizeSection, pages, sections } from './catalog'
import Icon from './Icon.vue'
import SiteSidebar from './SiteSidebar.vue'
import { useLocale } from './i18n'

type ThemePreference = 'light' | 'dark' | 'auto'

const repository = 'https://github.com/stickerwu/beui-vue'
const appearanceKey = 'vitepress-theme-appearance'
const route = useRoute()
const router = useRouter()
const { isDark, site } = useData()
const { isZh, t, href } = useLocale()
const searchDialog = useTemplateRef<HTMLDialogElement>('searchDialog')
const menuDialog = useTemplateRef<HTMLDialogElement>('menuDialog')
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const searchId = useId()
const menuId = useId()
const searchOpen = shallowRef(false)
const menuOpen = shallowRef(false)
const scrolled = shallowRef(false)
const searchQuery = shallowRef('')
const activeSearchId = shallowRef<string | null>(null)
const themePreference = shallowRef<ThemePreference>('dark')
const shortcutLabel = shallowRef('⌘K')
const pressedOutside = new WeakMap<HTMLDialogElement, boolean>()
const navItems = computed(() => ['motion', 'blocks', 'agents', 'charts', 'casino'].flatMap((slug) => {
  const found = sections.find((item) => item.slug === slug)
  if (!found) return []
  const section = localizeSection(found, isZh.value ? 'zh' : 'en')
  return [{ label: section.name, path: section.path }]
}))
/** Both locales are prerendered, so switching just swaps the `/en` prefix. */
const localeOptions = computed(() => {
  const clean = route.path.replace(/\.html$/, '').replace(/^\/en(?=\/)/, '') || '/'
  const suffix = clean === '/' ? '/' : clean
  return [
    { label: '简体中文', lang: 'zh-CN', current: isZh.value, path: `${site.value.base}${suffix.replace(/^\//, '')}` },
    { label: 'English', lang: 'en', current: !isZh.value, path: `${site.value.base}en${suffix}` },
  ]
})
const themes = computed(() => [
  { value: 'light', label: t('Light theme'), icon: 'sun' },
  { value: 'dark', label: t('Dark theme'), icon: 'moon' },
  { value: 'auto', label: t('System theme'), icon: 'monitor' },
] as const)
const documentationPages = computed(() => [
  { slug: 'installation', title: t('Installation'), description: t('Install and use beui-vue in Vue 3, Vite and Nuxt.'), category: t('Guides'), path: '/install' },
  { slug: 'catalog', title: t('Component catalog'), description: t('Browse every Vue component and variant.'), category: t('Guides'), path: '/catalog' },
  { slug: 'verification', title: t('Verification'), description: t('Review component parity and visual verification.'), category: t('Guides'), path: '/verification' },
])
const searchItems = computed(() => {
  const locale = isZh.value ? 'zh' : 'en'
  const sectionName = new Map(sections.map(section => [section.slug, localizeSection(section, locale).name]))
  return [
    ...pages.map((page) => {
      const copy = localizePage(page, locale)
      return {
        slug: page.slug,
        title: copy.title,
        description: copy.description,
        category: sectionName.get(page.category) ?? page.category,
        path: page.path,
      }
    }),
    ...pages.flatMap((page) => page.entries.filter((entry) => entry.path !== entry.pagePath)).map((entry) => ({
      slug: entry.slug,
      title: entry.title,
      description: entry.description,
      category: sectionName.get(entry.category) ?? entry.category,
      path: entry.path,
    })),
    ...documentationPages.value,
  ]
})
const normalizedPath = computed(() => route.path.replace(/^\/en(?=\/)/, '').replace(/\.html$/, '').replace(/\/$/, '') || '/')
const isDocsPage = computed(() => normalizedPath.value !== '/')
const searchResults = computed(() => {
  const terms = searchQuery.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return searchItems.value.filter((item) => {
    const text = `${item.title} ${item.slug} ${item.description} ${item.category}`.toLocaleLowerCase()
    return terms.every((term) => text.includes(term))
  })
})
const activeSearchResult = computed(() => searchResults.value.find((item) => item.path === activeSearchId.value) ?? searchResults.value[0])
const activeDescendant = computed(() => activeSearchResult.value ? searchResultId(activeSearchResult.value.path) : undefined)
let colorScheme: MediaQueryList | undefined

function isCurrent(path: string) {
  return normalizedPath.value === path || normalizedPath.value.startsWith(`${path}/`)
}

function searchResultId(path: string) {
  return `${searchId}-${encodeURIComponent(path)}`
}

function applyTheme(preference: ThemePreference) {
  themePreference.value = preference
  isDark.value = preference === 'dark' || (preference === 'auto' && Boolean(colorScheme?.matches))
  try {
    const oldValue = localStorage.getItem(appearanceKey)
    localStorage.setItem(appearanceKey, preference)
    window.dispatchEvent(new StorageEvent('storage', {
      key: appearanceKey,
      oldValue,
      newValue: preference,
      storageArea: localStorage,
    }))
  } catch {}
}

function readTheme() {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(appearanceKey)
  } catch {}
  themePreference.value = stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'dark'
}

function onSystemThemeChange() {
  if (themePreference.value === 'auto') applyTheme('auto')
}

function onStorageChange(event: StorageEvent) {
  if (event.key === appearanceKey || event.key === null) readTheme()
}

function updateScroll() {
  scrolled.value = window.scrollY > 8
}

async function openSearch() {
  menuDialog.value?.close()
  searchQuery.value = ''
  activeSearchId.value = null
  await nextTick()
  if (!searchDialog.value?.open) searchDialog.value?.showModal()
  searchOpen.value = Boolean(searchDialog.value?.open)
  searchInput.value?.focus()
}

function openMenu() {
  if (!menuDialog.value?.open) menuDialog.value?.showModal()
  menuOpen.value = Boolean(menuDialog.value?.open)
}

function closeMenu() {
  menuDialog.value?.close()
}

function onSearchClose() {
  searchOpen.value = false
  if (searchDialog.value) searchDialog.value.returnValue = ''
}

function onMenuClose() {
  menuOpen.value = false
  if (menuDialog.value) menuDialog.value.returnValue = ''
}

function selectSearchResult(path: string) {
  searchDialog.value?.close()
  router.go(href(path))
}

async function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && activeSearchResult.value) {
    event.preventDefault()
    selectSearchResult(activeSearchResult.value.path)
    return
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  if (!searchResults.value.length) return
  const current = searchResults.value.findIndex((item) => item.path === activeSearchResult.value?.path)
  const direction = event.key === 'ArrowDown' ? 1 : -1
  const next = (current + direction + searchResults.value.length) % searchResults.value.length
  activeSearchId.value = searchResults.value[next].path
  await nextTick()
  document.getElementById(activeDescendant.value!)?.scrollIntoView({ block: 'nearest' })
}

function onGlobalKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (searchDialog.value?.open) searchDialog.value.close()
    else void openSearch()
  }
}

function isOutsideDialog(event: PointerEvent, dialog: HTMLDialogElement) {
  const bounds = dialog.getBoundingClientRect()
  return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
}

function onDialogPointerDown(event: PointerEvent) {
  if ('closedBy' in HTMLDialogElement.prototype) return
  const dialog = event.currentTarget as HTMLDialogElement
  pressedOutside.set(dialog, isOutsideDialog(event, dialog))
}

function onDialogPointerUp(event: PointerEvent) {
  if ('closedBy' in HTMLDialogElement.prototype) return
  const dialog = event.currentTarget as HTMLDialogElement
  if (pressedOutside.get(dialog) && isOutsideDialog(event, dialog)) dialog.close()
  pressedOutside.delete(dialog)
}

function closeDesktopMenu() {
  if (window.innerWidth >= (isDocsPage.value ? 768 : 1280)) closeMenu()
}

watch(searchQuery, () => { activeSearchId.value = null }, { flush: 'sync' })
watch(() => route.path, () => {
  searchDialog.value?.close()
  closeMenu()
})

onMounted(() => {
  colorScheme = window.matchMedia('(prefers-color-scheme: dark)')
  shortcutLabel.value = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'
  readTheme()
  updateScroll()
  colorScheme.addEventListener('change', onSystemThemeChange)
  window.addEventListener('resize', closeDesktopMenu)
  window.addEventListener('scroll', updateScroll, { passive: true })
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('storage', onStorageChange)
})

onBeforeUnmount(() => {
  colorScheme?.removeEventListener('change', onSystemThemeChange)
  window.removeEventListener('resize', closeDesktopMenu)
  window.removeEventListener('scroll', updateScroll)
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('storage', onStorageChange)
  searchDialog.value?.close()
  menuDialog.value?.close()
})
</script>

<template>
  <aside class="beui-announcement" :aria-label="t('beui-vue announcement')">
    <p>{{ t('beUI, now in') }} <strong>Vue 3</strong><span class="beui-announcement-more">{{ t('. An independent port of the original beUI components.') }}</span></p>
    <a :href="repository" class="beui-announcement-cta" target="_blank" rel="noopener noreferrer">
      {{ t('View source') }} <Icon name="arrow-right" :size="12" />
    </a>
  </aside>
  <header class="beui-site-header" :class="{ 'is-scrolled': scrolled, 'is-docs': isDocsPage }">
    <div class="beui-header-inner">
      <div class="beui-header-start">
        <button
          type="button"
          class="beui-menu-trigger"
          :aria-label="t('Open navigation')"
          aria-haspopup="dialog"
          :aria-expanded="menuOpen"
          :aria-controls="menuId"
          @click="openMenu"
        >
          <Icon name="menu" :size="20" />
        </button>
        <a :href="href('/')" class="beui-header-brand">
          <img :src="withBase('/brand/favicon.png')" alt="" width="24" height="24" />
          <span>beui-vue</span>
        </a>
        <nav class="beui-header-nav" :aria-label="t('Main navigation')">
          <a
            v-for="item in navItems"
            :key="item.path"
            :href="href(item.path)"
            :aria-current="isCurrent(item.path) ? 'page' : undefined"
          >{{ item.label }}</a>
          <a class="beui-header-guide" :href="href('/install')" :aria-current="isCurrent('/install') ? 'page' : undefined">{{ t('Guide') }}</a>
        </nav>
      </div>
      <div class="beui-header-actions">
        <button type="button" class="beui-search-trigger" :aria-label="t('Search components')" aria-haspopup="dialog" :aria-expanded="searchOpen" @click="openSearch">
          <Icon name="search" :size="14" />
          <span>{{ t('Search') }}</span>
          <kbd>{{ shortcutLabel }}</kbd>
        </button>
        <div class="beui-theme-control" role="group" :aria-label="t('Color theme')">
          <button
            v-for="theme in themes"
            :key="theme.value"
            type="button"
            :aria-label="theme.label"
            :aria-pressed="themePreference === theme.value"
            :title="theme.label"
            @click="applyTheme(theme.value)"
          ><Icon :name="theme.icon" :size="16" /></button>
        </div>
        <a :href="repository" class="beui-github-link" target="_blank" rel="noopener noreferrer" aria-label="beui-vue on GitHub">
          <Icon name="github" :size="14" />
        </a>
        <a
          v-for="option in localeOptions"
          :key="option.lang"
          class="beui-locale-link"
          :href="option.path"
          :hreflang="option.lang"
          :lang="option.lang"
          :aria-current="option.current ? 'true' : undefined"
        >{{ option.label }}</a>
        <a :href="repository" class="beui-source-link" target="_blank" rel="noopener noreferrer">
          <span>{{ t('Source') }} <Icon name="arrow-up-right" :size="14" /></span>
        </a>
      </div>
    </div>
  </header>
  <dialog
    :id="searchId"
    ref="searchDialog"
    class="beui-search-dialog"
    :aria-label="t('Search components')"
    closedby="any"
    @close="onSearchClose"
    @pointerdown="onDialogPointerDown"
    @pointerup="onDialogPointerUp"
  >
    <div class="beui-search-field">
      <Icon name="search" :size="18" />
      <input
        ref="searchInput"
        v-model="searchQuery"
        autofocus
        type="text"
        role="combobox"
        :aria-label="t('Search components')"
        aria-autocomplete="list"
        :aria-expanded="searchOpen"
        :aria-controls="`${searchId}-results`"
        :aria-activedescendant="activeDescendant"
        :placeholder="t('Search components…')"
        autocomplete="off"
        spellcheck="false"
        @keydown="onSearchKeydown"
      />
      <button type="button" class="beui-search-close" :aria-label="t('Close search')" @click="searchDialog?.close()"><Icon name="close" :size="16" /></button>
    </div>
    <div class="beui-search-results">
      <p v-if="!searchResults.length" class="beui-search-empty" role="status">{{ t('No results found.') }}</p>
      <ul v-else :id="`${searchId}-results`" role="listbox" :aria-label="t('Search results')">
        <li v-for="item in searchResults" :key="item.path" role="presentation">
          <button
            :id="searchResultId(item.path)"
            type="button"
            role="option"
            tabindex="-1"
            :aria-selected="activeSearchResult?.path === item.path"
            @pointermove="activeSearchId = item.path"
            @click="selectSearchResult(item.path)"
          >
            <Icon name="circle" :size="16" />
            <span class="beui-search-result-copy"><strong>{{ item.title }}</strong><span>{{ item.description }}</span></span>
            <span class="beui-search-result-category">{{ item.category }}</span>
            <Icon name="arrow-right" :size="14" />
          </button>
        </li>
      </ul>
    </div>
    <div class="beui-search-help"><span><kbd>↑</kbd><kbd>↓</kbd> {{ t('to navigate') }}</span><span><kbd>↵</kbd> {{ t('to open') }}</span><span><kbd>esc</kbd> {{ t('to close') }}</span></div>
  </dialog>
  <dialog
    :id="menuId"
    ref="menuDialog"
    class="beui-mobile-dialog"
    :aria-labelledby="`${menuId}-title`"
    closedby="any"
    @close="onMenuClose"
    @pointerdown="onDialogPointerDown"
    @pointerup="onDialogPointerUp"
  >
    <div class="beui-mobile-handle" aria-hidden="true"></div>
    <div class="beui-mobile-heading">
      <h2 :id="`${menuId}-title`">{{ t('Menu') }}</h2>
      <button type="button" :aria-label="t('Close navigation')" @click="closeMenu"><Icon name="close" :size="18" /></button>
    </div>
    <div class="beui-mobile-content">
      <nav class="beui-mobile-links" :aria-label="t('Main navigation')">
        <a v-for="item in navItems" :key="item.path" :href="href(item.path)" :aria-current="isCurrent(item.path) ? 'page' : undefined" @click="closeMenu">{{ item.label }}</a>
        <a :href="href('/install')" :aria-current="isCurrent('/install') ? 'page' : undefined" @click="closeMenu">{{ t('Guide') }}</a>
        <a v-for="option in localeOptions" :key="option.lang" :href="option.path" :hreflang="option.lang" :lang="option.lang">{{ option.label }}</a>
      </nav>
      <SiteSidebar mobile @navigate="closeMenu" />
    </div>
  </dialog>
</template>
