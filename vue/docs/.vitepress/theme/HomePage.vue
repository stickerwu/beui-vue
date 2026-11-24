<script setup lang="ts">
import { ShaderBackground, Tabs } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { useData } from 'vitepress'
import { entries, pages, sections } from './catalog'
import Icon from './Icon.vue'
import InstallCommand from './InstallCommand.vue'
import PreviewTile from './PreviewTile.vue'
import PhoneShowcase from './phones/PhoneShowcase.vue'
import { useLocale } from './i18n'
import './home.css'
import './hero-beam.css'

const { isZh, t, href } = useLocale()

// Every install slug, in catalog order, for the hero command.
const installSlugs = entries.map(entry => entry.slug)
/** The preview line on npm; `@next` until the first stable release. */
const packageUrl = 'beui-vue@next'
const packageManager = shallowRef('bun')
const packageManagers = [
  { value: 'bun', label: 'bun' },
  { value: 'npm', label: 'npm' },
  { value: 'pnpm', label: 'pnpm' },
  { value: 'yarn', label: 'yarn' },
]
const installActions: Record<string, string> = {
  bun: 'add',
  npm: 'install',
  pnpm: 'add',
  yarn: 'add',
}
const installAction = computed(() => installActions[packageManager.value] ?? 'add')
const installCommand = computed(() => `${packageManager.value} ${installAction.value} ${packageUrl}`)
const copied = shallowRef(false)
const copyMessage = shallowRef('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
const { isDark } = useData()
const closingPanel = useTemplateRef<HTMLElement>('closingPanel')
const closingVisible = shallowRef(false)
const closingColors = computed(() => isDark.value
  ? ['#151515', '#7a2410', '#151515', '#0b3a4d']
  : ['#fde6d4', '#f6a27f', '#fcfcfc', '#9fcde3'])
let closingObserver: IntersectionObserver | undefined

// Like beui.dev's "Recently launched": newest launches first (upstream launchedAt). The site is
// static, so instead of hiding the row once the 7-day NEW window passes, keep the four newest.
const recentPages = pages
  .filter(page => page.launchedAt)
  .sort((a, b) => (b.launchedAt ?? '').localeCompare(a.launchedAt ?? ''))
  .slice(0, 4)
const activeSection = shallowRef(sections[0]?.slug ?? '')
const sectionTabs = computed(() => sections.map(section => ({ value: section.slug, label: isZh.value ? section.zh?.name ?? section.name : section.name })))
const sectionsBySlug = Object.fromEntries(sections.map(section => [section.slug, section]))
const stats = computed(() => [
  { value: entries.length, label: t('Vue components') },
  { value: pages.length, label: t('Component pages') },
  { value: sections.length, label: t('Library sections') },
  { value: 'MIT', label: t('Free for commercial use') },
])
const platformPages = ['tabs', 'color-picker', 'alert', 'swipeable-list'].flatMap(slug => {
  const page = pages.find(item => item.slug === slug)
  return page ? [page] : []
})
const comparisonRows = computed(() => [
  { label: t('Component framework'), values: ['Vue 3', 'React'] },
  { label: t('Animated components'), values: [true, true] },
  { label: t('Interface blocks'), values: [true, true] },
  { label: t('Charts and visualizations'), values: [true, true] },
  { label: t('AI interface components'), values: [true, true] },
  { label: t('TypeScript source'), values: [true, true] },
  { label: t('Customizable styles and motion'), values: [true, true] },
  { label: t('Light and dark themes'), values: [true, true] },
  { label: t('MIT licensed components'), values: [true, true] },
  { label: t('Install from'), values: ['shadcn-vue CLI · npm', 'shadcn CLI'] },
])
const faqItems = computed(() => [
  {
    id: 'free',
    question: t('Is beui-vue free for commercial projects?'),
    answer: t('Yes. The components are MIT licensed, including commercial use and modification. Keep the copyright and license notice in copies or substantial portions of the source.'),
  },
  {
    id: 'install',
    question: t('How do I install a component?'),
    answer: t('Add one component with the shadcn-vue CLI, which copies its source into your project, or install the preview package from npm (beui-vue@next) and import from beui-vue. Every component page shows both, with a Vue example and the source files.'),
  },
  {
    id: 'stack',
    question: t('What does my project need?'),
    answer: t('Use Vue 3.5 or newer in a Vite or Nuxt project. Import beui-vue/style.css once in your application. The package includes TypeScript types and compiled styles.'),
  },
  {
    id: 'nuxt',
    question: t('Does beui-vue work with Nuxt?'),
    answer: t('Yes. The package supports Nuxt SSR. Add beui-vue/style.css to the css array in your Nuxt configuration, then import the Vue components in your pages and components.'),
  },
  {
    id: 'customize',
    question: t('Can I change the design and animations?'),
    answer: t('Yes. You can copy the source into your project and change the styles, motion, and behavior directly. The shared CSS tokens let you match the components to your own theme.'),
  },
  {
    id: 'upstream',
    question: t('How is this project related to beUI?'),
    answer: t('beui-vue is an independently maintained Vue implementation by stickerwu. The original component designs and interactions come from beUI and its contributors, whose attribution and MIT license are preserved.'),
  },
])

async function copyInstallCommand() {
  clearTimeout(copyTimer)
  try {
    await navigator.clipboard.writeText(installCommand.value)
    copied.value = true
    copyMessage.value = t('Install command copied.')
    copyTimer = setTimeout(() => { copied.value = false }, 2000)
  } catch {
    copied.value = false
    copyMessage.value = t('Select the install command to copy it.')
  }
}

onMounted(() => {
  closingObserver = new IntersectionObserver(([entry]) => {
    closingVisible.value = entry?.isIntersecting ?? false
  }, { rootMargin: '200px' })
  if (closingPanel.value) closingObserver.observe(closingPanel.value)
})

onBeforeUnmount(() => {
  clearTimeout(copyTimer)
  closingObserver?.disconnect()
})
</script>

<template>
  <div class="home-page">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="home-eyebrow" data-beam="hero" data-active="">
        <div class="home-eyebrow-inner">
          <a class="home-eyebrow-icon" href="https://github.com/stickerwu/beui-vue" target="_blank" rel="noreferrer noopener" aria-label="beui-vue on GitHub">
            <Icon name="github" />
          </a>
          <a class="home-eyebrow-count" :href="href('/components/motion')">
            <span><strong>{{ entries.length }}</strong> <span>Vue</span><span class="home-sr-only"> {{ t('components') }}</span></span>
          </a>
          <span class="home-eyebrow-divider" aria-hidden="true" />
          <span class="home-eyebrow-icon" aria-hidden="true"><Icon name="code" /></span>
          <a class="home-eyebrow-count" :href="href('/install')">
            <span>Nuxt <span class="home-eyebrow-muted">SSR</span></span>
          </a>
        </div>
        <div data-beam-bloom="true" />
      </div>
      <h1 id="home-title" class="home-title">
        {{ t('Animated components for') }}<br class="home-title-break"> <mark class="home-mark">Vue</mark> {{ t('and') }} <mark class="home-mark home-mark-nuxt">Nuxt</mark>
      </h1>
      <p class="home-subtitle">
        {{ t('Copy-paste components built with Vue and Motion. An independent port of beUI, with TypeScript source ready for your project.') }}
      </p>
      <div class="home-actions">
        <a class="home-button home-button-primary" :href="href('/components/motion')">
          {{ t('Browse components') }}
          <Icon name="arrow-right" />
        </a>
        <a class="home-button home-button-outline" :href="href('/install')">{{ t('Get started') }}</a>
      </div>
    </section>

    <div class="home-install">
      <p class="home-install-hint">{{ t('One command. The source is yours.') }}</p>
      <InstallCommand :slugs="installSlugs" />
    </div>

    <div class="home-container home-stats-container">
      <dl class="home-stats">
        <div v-for="stat in stats" :key="stat.label" class="home-stat">
          <dt>{{ stat.label }}</dt>
          <dd>{{ stat.value }}</dd>
        </div>
      </dl>
      <div class="home-credit-row" :aria-label="t('Project attribution')">
        <span class="home-credit-label">{{ t('Original designs by') }}</span>
        <a href="https://beui.dev" target="_blank" rel="noreferrer noopener" class="home-credit-link">beUI</a>
        <span class="home-credit-label">{{ t('Vue port by') }}</span>
        <a href="https://github.com/stickerwu/beui-vue" target="_blank" rel="noreferrer noopener" class="home-credit-link">
          <Icon name="github" />
          stickerwu
        </a>
      </div>
    </div>

    <section v-if="recentPages.length" class="home-container home-section" aria-labelledby="home-new">
      <div class="home-section-heading">
        <div>
          <p class="home-section-label">{{ t('New') }}</p>
          <h2 id="home-new" class="home-section-title">{{ t('Recently launched') }}</h2>
        </div>
        <a class="home-section-link" :href="href('/catalog')">
          {{ t('All components') }}
          <Icon name="arrow-right" />
        </a>
      </div>
      <div class="home-preview-grid">
        <PreviewTile v-for="page in recentPages" :key="page.path" :page="page" />
      </div>
    </section>

    <section class="home-container home-section" aria-labelledby="home-explore">
      <div class="home-section-heading home-section-heading-center">
        <div>
          <p class="home-section-label">{{ t('Explore') }}</p>
          <h2 id="home-explore" class="home-section-title">{{ t('Everything in the library') }}</h2>
        </div>
      </div>
      <Tabs v-model="activeSection" :items="sectionTabs" :labels="{ list: t('Library sections') }" class="home-explorer">
        <template #trigger="{ item }">
          <span class="home-tab-label">{{ item.label }}<span class="home-tab-count">{{ sectionsBySlug[item.value]?.entries.length }}</span></span>
        </template>
        <template #panel="{ item, active }">
          <template v-if="active">
            <div class="home-preview-grid home-explorer-grid">
              <PreviewTile v-for="page in sectionsBySlug[item.value]?.entries.slice(0, 8)" :key="page.path" :page="page" />
            </div>
            <div class="home-explorer-action">
              <a class="home-button home-button-outline" :href="href(sectionsBySlug[item.value]?.path ?? '/components/motion')">
                {{ t('All {count} in {name}').replace('{count}', String(sectionsBySlug[item.value]?.entries.length ?? 0)).replace('{name}', item.label) }}
                <Icon name="arrow-right" />
              </a>
            </div>
          </template>
        </template>
      </Tabs>
    </section>

    <section class="home-container home-section" aria-labelledby="home-platforms">
      <div class="home-platform-panel">
        <div class="home-platform-heading">
          <div class="home-platform-copy">
            <p class="home-section-label">Vue + Nuxt</p>
            <h2 id="home-platforms" class="home-section-title">{{ t('Same motion, in Vue and Nuxt') }}</h2>
            <p class="home-platform-description">{{ t('Animated components for your Vue application, with TypeScript source and Nuxt SSR support. The same package works across both.') }}</p>
          </div>
          <div class="home-platform-install">
            <div class="home-command">
              <div class="home-command-toolbar">
                <Tabs v-model="packageManager" :items="packageManagers" variant="segment" :labels="{ list: t('Vue package manager') }" class="home-package-tabs" />
                <button type="button" class="home-copy" :aria-label="copied ? t('Install command copied') : t('Copy install command')" @click="copyInstallCommand">
                  <Icon :name="copied ? 'check' : 'copy'" />
                </button>
              </div>
              <pre class="home-command-code" tabindex="0" role="region" :aria-label="t('Install for Vue and Nuxt')"><code><span class="home-command-prompt" aria-hidden="true">$ </span><span class="home-command-runner">{{ packageManager }}</span> <span class="home-command-action">{{ installAction }}</span> <span class="home-command-package">{{ packageUrl }}</span></code></pre>
            </div>
            <a class="home-button home-button-outline" :href="href('/install')">{{ t('Use with Nuxt') }} <Icon name="arrow-right" /></a>
            <span class="home-sr-only" role="status">{{ copyMessage }}</span>
          </div>
        </div>
        <div class="home-platform-previews">
          <PhoneShowcase :pages="platformPages" />
        </div>
      </div>
    </section>

    <section class="home-container home-section" aria-labelledby="home-compare">
      <div class="home-section-heading">
        <div>
          <p class="home-section-label">{{ t('Vue and the original') }}</p>
          <h2 id="home-compare" class="home-section-title">{{ t('Built for Vue. Inspired by beUI.') }}</h2>
        </div>
      </div>
      <div class="home-comparison" tabindex="0" role="region" aria-labelledby="home-compare">
        <table class="home-comparison-table">
          <caption class="home-sr-only">{{ t('Features of the independent Vue port and the original beUI library.') }}</caption>
          <thead>
            <tr>
              <th scope="col"><span class="home-sr-only">{{ t('Feature') }}</span></th>
              <th scope="col">beui-vue <span>{{ t('Vue port') }}</span></th>
              <th scope="col">beUI <span>{{ t('Original library') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparisonRows" :key="row.label">
              <th scope="row">{{ row.label }}</th>
              <td v-for="(value, index) in row.values" :key="index">
                <template v-if="typeof value === 'boolean'">
                  <Icon v-if="value" name="check" aria-hidden="true" />
                  <span v-else aria-hidden="true">—</span>
                  <span class="home-sr-only">{{ value ? t('Included') : t('Unavailable') }}</span>
                </template>
                <span v-else>{{ value }}</span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td><a class="home-button home-button-outline" :href="href('/components/motion')">{{ t('Browse') }} <Icon name="arrow-right" /></a></td>
              <td><a class="home-button home-button-primary" href="https://beui.dev" target="_blank" rel="noreferrer noopener">{{ t('Visit beUI') }} <Icon name="arrow-up-right" /><span class="home-sr-only">{{ t('Opens in a new tab.') }}</span></a></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <section class="home-container home-section home-faq" aria-labelledby="home-faq">
      <div class="home-section-heading home-faq-heading">
        <div>
          <p class="home-section-label">{{ t('FAQ') }}</p>
          <h2 id="home-faq" class="home-section-title">{{ t('A few things to know') }}</h2>
        </div>
      </div>
      <div class="home-faq-list">
        <details v-for="item in faqItems" :key="item.id" class="home-faq-item" name="home-faq">
          <summary class="home-faq-question">
            {{ item.question }}
            <Icon name="chevron-down" />
          </summary>
          <p class="home-faq-answer">
            {{ item.answer }}
            <a v-if="item.id === 'free'" href="https://github.com/stickerwu/beui-vue/blob/main/LICENSE" target="_blank" rel="noreferrer noopener">{{ t('Read the license.') }}</a>
            <a v-if="item.id === 'install' || item.id === 'stack' || item.id === 'nuxt'" :href="href('/install')">{{ t('Installation guide.') }}</a>
            <a v-if="item.id === 'upstream'" href="https://beui.dev" target="_blank" rel="noreferrer noopener">{{ t('Explore beUI.') }}</a>
          </p>
        </details>
      </div>
    </section>

    <section class="home-container home-closing" aria-labelledby="home-closing-title">
      <div ref="closingPanel" class="home-closing-panel">
        <ShaderBackground v-if="closingVisible" class="home-closing-mesh" variant="mesh-gradient"
          :params="{ colors: closingColors, distortion: 0.8, swirl: 0.5, speed: 0.2 }" />
        <div class="home-closing-content">
          <span class="home-closing-icon" aria-hidden="true"><Icon name="code" /></span>
          <p class="home-closing-eyebrow">{{ t('Made for Vue') }}</p>
          <h2 id="home-closing-title" class="home-closing-title">{{ t('Need components for your Vue project?') }}</h2>
          <p class="home-closing-description">{{ t('Explore the components, try the interactions, and make the source your own.') }}</p>
          <div class="home-actions">
            <a class="home-button home-button-primary" :href="href('/components/motion')">
              {{ t('Browse components') }}
              <Icon name="arrow-right" />
            </a>
            <a class="home-button home-button-outline" :href="href('/install')">{{ t('Get started') }}</a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
