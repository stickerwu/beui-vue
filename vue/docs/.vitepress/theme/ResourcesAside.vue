<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import BrandMark from './BrandMark.vue'
import { useLocale } from './i18n'

const { page } = useData()
const { t, href } = useLocale()
const upstreamUrl = computed(() => {
  const path = page.value.relativePath.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
  return path.startsWith('components/') || path.startsWith('charts/') || path.startsWith('casino/') || path.startsWith('blocks/') || path.startsWith('docs/')
    ? `https://beui.dev/${path}`
    : 'https://beui.dev/components/motion'
})
</script>

<template>
  <aside class="beui-resources-aside" :aria-label="t('Resources')">
    <div class="beui-resources-sticky">
      <nav class="beui-platform-switch" :aria-label="t('Component platform')">
        <span class="beui-platform-option is-active" aria-current="page">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m2 4 10 17L22 4h-4l-6 10L6 4Z" />
            <path d="m6 4 6 10 6-10h-4l-2 3.5L10 4Z" />
          </svg>
          Vue
        </span>
        <a class="beui-platform-option" :href="upstreamUrl" target="_blank" rel="noopener noreferrer">
          React
          <svg class="beui-platform-external" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        </a>
      </nav>
      <section class="beui-source-card" aria-labelledby="beui-vue-source-title">
        <div class="beui-source-brand">
          <BrandMark :size="40" />
          <span>beUI<span class="beui-source-brand-suffix">Vue</span></span>
        </div>
        <div class="beui-source-card-copy">
          <h2 id="beui-vue-source-title">{{ t('Source for Vue') }}</h2>
          <p>{{ t('Motion components and interactive blocks, rebuilt for Vue 3 with TypeScript.') }}</p>
          <p class="beui-source-maintainer">{{ t('Independently maintained by stickerwu.') }}</p>
        </div>
        <a
          class="beui-source-button"
          href="https://github.com/stickerwu/beui-vue"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('Explore Vue source') }}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
        </a>
      </section>
      <section class="beui-resource-card" aria-labelledby="beui-resources-title">
        <h2 id="beui-resources-title">{{ t('Resources') }}</h2>
        <p class="beui-resource-eyebrow">{{ t('BUILD WITH VUE') }}</p>
        <div class="beui-resource-links">
          <a class="beui-resource-link" :href="href('/install')">
            <span class="beui-resource-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5M5 17v3h14v-3" /></svg>
            </span>
            <span>
              <span class="beui-resource-link-title">{{ t('Installation') }}</span>
              <span class="beui-resource-link-description">{{ t('Get started with Vite and Nuxt') }}</span>
            </span>
            <svg class="beui-resource-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
          </a>
        </div>
        <a class="beui-resource-footer-link" :href="href('/catalog')">
          {{ t('Browse all components') }}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
        </a>
      </section>
      <p class="beui-upstream-credit">
        {{ t('Original designs by') }}
        <a href="https://beui.dev/" target="_blank" rel="noopener noreferrer">beUI <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></a>
        {{ t('and its contributors.') }}
      </p>
    </div>
  </aside>
</template>
