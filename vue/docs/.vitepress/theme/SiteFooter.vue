<script setup lang="ts">
import { computed } from 'vue'
import { localizeSection, sections } from './catalog'
import { useLocale } from './i18n'
import Icon from './Icon.vue'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const { isZh, t, href } = useLocale()
const repository = 'https://github.com/stickerwu/beui-vue'
const footerSections = computed(() => ['motion', 'blocks', 'agents', 'charts', 'casino'].flatMap((slug) => {
  const found = sections.find((item) => item.slug === slug)
  if (!found) return []
  const section = localizeSection(found, isZh.value ? 'zh' : 'en')
  return [{ ...section, visibleEntries: section.entries.slice(0, 7) }]
}))
const links = computed(() => [
  { title: t('Browse all'), href: '/components/motion' },
  { title: t('Installation'), href: '/install' },
  { title: t('Component catalog'), href: '/catalog' },
  { title: 'GitHub', href: repository },
  { title: 'llms.txt', href: '/llms.txt' },
])
const upstream = [
  { title: 'beUI', href: 'https://beui.dev' },
  { title: 'Original source', href: 'https://github.com/starc007/ui-components' },
  { title: 'beUI React Native', href: 'https://beui.dev/react-native' },
  { title: 'beUI Pro', href: 'https://pro.beui.dev' },
]

function linkHref(path: string) {
  return path.startsWith('/') ? href(path) : path
}
</script>

<template>
  <footer v-if="compact" class="beui-docs-footer">
    <a class="beui-docs-footer-brand" :href="href('/')"><img :src="href('/brand/favicon.png')" alt="" width="20" height="20" /><span>beui-vue</span><span class="beui-docs-footer-tagline">{{ t('Motion components for Vue 3') }}</span></a>
    <nav :aria-label="t('Footer')">
      <a :href="repository" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a :href="href('/install')">{{ t('Guide') }}</a>
      <a :href="href('/llms.txt')">llms.txt</a>
      <a href="https://beui.dev" target="_blank" rel="noopener noreferrer">beUI <Icon name="arrow-up-right" :size="12" /></a>
    </nav>
  </footer>
  <footer v-else class="beui-site-footer">
    <div class="beui-footer-grid">
      <div class="beui-footer-brand-column">
        <a class="beui-footer-brand" :href="href('/')"><img :src="href('/brand/favicon.png')" alt="" width="30" height="30" /><span>beui-vue</span></a>
        <p>{{ t('Animated components for Vue 3. Copy the source and make them yours.') }}</p>
        <p>{{ t('Vue port by') }} <a href="https://github.com/stickerwu" target="_blank" rel="noopener noreferrer">stickerwu</a>.<br />{{ t('Original beUI by') }} <a href="https://github.com/starc007" target="_blank" rel="noopener noreferrer">Saurabh</a>.</p>
        <a class="beui-footer-social" :href="repository" target="_blank" rel="noopener noreferrer" aria-label="beui-vue on GitHub"><Icon name="github" :size="16" /></a>
      </div>
      <nav v-for="section in footerSections" :key="section.slug" :aria-label="section.name">
        <p class="beui-footer-label">{{ section.name }}</p>
        <ul>
          <li v-for="page in section.visibleEntries" :key="page.path"><a :href="href(page.path)">{{ page.title }}</a></li>
          <li v-if="section.entries.length > 7"><a class="beui-footer-view-all" :href="href(section.path)">{{ t('View all') }} ({{ section.entries.length }})</a></li>
        </ul>
      </nav>
      <nav :aria-label="t('Links')">
        <p class="beui-footer-label">{{ t('Links') }}</p>
        <ul><li v-for="link in links" :key="link.href"><a :href="linkHref(link.href)" :target="link.href.startsWith('https:') ? '_blank' : undefined" :rel="link.href.startsWith('https:') ? 'noopener noreferrer' : undefined">{{ link.title }}</a></li></ul>
      </nav>
      <nav :aria-label="t('Original beUI')">
        <p class="beui-footer-label">{{ t('Original beUI') }}</p>
        <ul><li v-for="link in upstream" :key="link.href"><a :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.title }}</a></li></ul>
      </nav>
      <div class="beui-footer-bottom">
        <p>© 2026 beui-vue</p>
        <a :href="`${repository}/blob/main/LICENSE`" target="_blank" rel="noopener noreferrer">{{ t('MIT License') }}</a>
        <span>{{ t('An independent Vue port of') }} <a href="https://beui.dev" target="_blank" rel="noopener noreferrer">beUI</a>.</span>
      </div>
    </div>
  </footer>
</template>
