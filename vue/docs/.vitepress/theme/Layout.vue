<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import { Content, useData, useRoute } from 'vitepress'
import { PopoverMorph } from 'beui-vue'
import { findPage, localizePage, localizeSection, pages, sections } from './catalog'
import { useLocale } from './i18n'
import CategoryPage from './CategoryPage.vue'
import HomePage from './HomePage.vue'
import Icon from './Icon.vue'
import ProBlockLinks from './ProBlockLinks.vue'
import ResourcesAside from './ResourcesAside.vue'
import SiteFooter from './SiteFooter.vue'
import SiteHeader from './SiteHeader.vue'
import SiteSidebar from './SiteSidebar.vue'

const { frontmatter, page } = useData()
const route = useRoute()
const { isZh, t, href } = useLocale()
const locale = computed(() => (isZh.value ? 'zh' : 'en'))
const isHome = computed(() => frontmatter.value.layout === 'home')
const currentPage = computed(() => {
  const found = findPage(route.path)
  return found ? localizePage(found, locale.value) : undefined
})
const currentSection = computed(() => {
  const section = sections.find(item => item.slug === currentPage.value?.category)
  return section ? localizeSection(section, locale.value) : undefined
})
const currentIndex = computed(() => pages.findIndex(item => item.path === currentPage.value?.path))
const previous = computed(() => currentIndex.value > 0 ? localizePage(pages[currentIndex.value - 1], locale.value) : undefined)
const next = computed(() => {
  const item = pages[currentIndex.value + 1]
  return currentIndex.value >= 0 && item ? localizePage(item, locale.value) : undefined
})
const related = computed(() => (currentPage.value?.relatedSlugs ?? []).flatMap(slug => pages.filter(item => item.slug === slug)).map(item => localizePage(item, locale.value)))
const content = useTemplateRef<HTMLElement>('content')
const copied = shallowRef(false)
const copyStatus = shallowRef('')
const copyMenuOpen = shallowRef(false)
const pageActions = computed(() => {
  const pageUrl = `https://beui.stickerwu.net${route.path}`
  const prompt = encodeURIComponent(`Help me use this beui-vue component in Vue 3 and Nuxt. Explain its API and provide Vue examples. ${pageUrl}`)
  return [
    { label: t('View Vue example'), href: `https://github.com/stickerwu/beui-vue/blob/main/vue/docs/examples/${currentPage.value?.entries[0]?.slug}.vue`, icon: 'code' },
    { label: t('Open in ChatGPT'), href: `https://chatgpt.com/?q=${prompt}`, icon: 'arrow-up-right' },
    { label: t('Open in Claude'), href: `https://claude.ai/new?q=${prompt}`, icon: 'arrow-up-right' },
  ]
})
let copyTimer: ReturnType<typeof setTimeout> | undefined

async function copyPage() {
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.writeText(`# ${page.value.title}\n\n${content.value?.innerText ?? ''}\n\n${location.href}`)
    copied.value = true
    copyStatus.value = t('Page copied.')
    copyTimer = setTimeout(() => { copied.value = false }, 2000)
  } catch {
    copyStatus.value = t('Select the page text to copy it.')
  }
}

onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <a class="beui-skip-link" href="#main-content">{{ t('Skip to content') }}</a>
  <SiteHeader />
  <main v-if="isHome" id="main-content" tabindex="-1">
    <HomePage />
    <SiteFooter />
  </main>
  <div v-else class="beui-docs-layout">
    <SiteSidebar />
    <main id="main-content" class="beui-docs-main" tabindex="-1">
      <CategoryPage v-if="frontmatter.categoryPage" :category="frontmatter.categoryPage" />
      <article v-else-if="frontmatter.componentPage">
        <nav class="beui-breadcrumb" :aria-label="t('Breadcrumb')">
          <a :href="href(currentSection?.path ?? '/components/motion')">{{ currentSection?.name ?? t('All Vue components') }}</a>
          <span aria-hidden="true">/</span>
          <span>{{ currentPage?.title ?? page.title }}</span>
        </nav>
        <div class="beui-page-heading">
          <h1>{{ currentPage?.title ?? page.title }}</h1>
          <div class="beui-copy-page">
            <button type="button" @click="copyPage">
              <Icon :name="copied ? 'check' : 'copy'" />
              {{ copied ? t('Copied!') : t('Copy Page') }}
            </button>
            <PopoverMorph v-model:open="copyMenuOpen" :label="t('More page actions')" align="end">
              <template #trigger><Icon name="chevron-down" /><span class="beui-sr-only">{{ t('More page actions') }}</span></template>
              <template #default="{ close }">
                <div class="beui-page-actions">
                  <a v-for="action in pageActions" :key="action.label" :href="action.href" target="_blank" rel="noopener noreferrer" @click="close">
                    <Icon :name="action.icon" />{{ action.label }}<span class="beui-sr-only">{{ t('Opens in a new tab.') }}</span>
                  </a>
                </div>
              </template>
            </PopoverMorph>
          </div>
          <span class="beui-sr-only" role="status">{{ copyStatus }}</span>
        </div>
        <nav class="beui-mobile-platform" :aria-label="t('Component platform')">
          <span aria-current="page">Vue</span>
          <a :href="`https://beui.dev${currentPage?.path}`" target="_blank" rel="noopener noreferrer">React ↗</a>
        </nav>
        <div ref="content" class="beui-doc-content">
          <Content />
        </div>
        <ProBlockLinks v-if="currentPage" :page-key="currentPage.path.replace('/components/', '')" />
        <section v-if="related.length" class="beui-related" aria-labelledby="beui-related-title">
          <h2 id="beui-related-title">{{ t('Related components') }}</h2>
          <div class="beui-related-grid">
            <a v-for="item in related" :key="item.path" :href="href(item.path)" class="beui-related-card">
              <h3>{{ item.title }}</h3>
              <div><p>{{ item.description }}</p></div>
            </a>
          </div>
        </section>
        <nav class="beui-page-pager" :aria-label="t('Component pages')">
          <a v-if="previous" :href="href(previous.path)">
            <span>{{ t('Previous') }}</span>
            <strong>← {{ previous.title }}</strong>
          </a>
          <a v-if="next" class="beui-page-next" :href="href(next.path)">
            <span>{{ t('Next') }}</span>
            <strong>{{ next.title }} →</strong>
          </a>
        </nav>
      </article>
      <article v-else class="beui-prose">
        <nav class="beui-breadcrumb" :aria-label="t('Breadcrumb')"><a :href="href('/install')">{{ t('Documentation') }}</a></nav>
        <Content />
        <div v-if="page.isNotFound" class="beui-not-found">
          <h1>{{ t('Page not found') }}</h1>
          <a :href="href('/components/motion')">{{ t('Browse components') }} <Icon name="arrow-right" /></a>
        </div>
      </article>
      <SiteFooter compact />
    </main>
    <ResourcesAside />
  </div>
</template>
