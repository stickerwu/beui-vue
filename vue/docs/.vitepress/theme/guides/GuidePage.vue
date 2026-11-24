<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useData, useRoute } from 'vitepress'
import CopyPage from '../CopyPage.vue'
import { useLocale } from '../i18n'

/**
 * The header every guide page opens with (beui.dev guide pages: eyebrow, title,
 * Copy Page, intro), and the article that holds the guide body.
 */
const props = defineProps<{ eyebrow: string; title: string; intro: string; rule?: boolean }>()
const { page } = useData()
const route = useRoute()
const { t } = useLocale()
const article = useTemplateRef<HTMLElement>('article')
const pageText = () => `# ${props.title}\n\n${article.value?.innerText ?? ''}\n\n${location.href}`
const actions = computed(() => {
  const pageUrl = `https://beui.stickerwu.net${route.path}`
  const prompt = encodeURIComponent(`Read this beui-vue guide and help me apply it in my Vue 3 project. ${pageUrl}`)
  return [
    { label: t('View source'), href: `https://github.com/stickerwu/beui-vue/blob/main/vue/docs/${page.value.relativePath}`, icon: 'code' },
    { label: t('Open in ChatGPT'), href: `https://chatgpt.com/?q=${prompt}`, icon: 'arrow-up-right' },
    { label: t('Open in Claude'), href: `https://claude.ai/new?q=${prompt}`, icon: 'arrow-up-right' },
  ]
})
</script>

<template>
  <article ref="article" class="beui-guide">
    <header id="overview" class="beui-guide-header" :class="{ 'has-rule': rule }">
      <p class="beui-guide-eyebrow">{{ eyebrow }}</p>
      <div class="beui-guide-title-row">
        <h1>{{ title }}</h1>
        <CopyPage :text="pageText" :actions="actions" />
      </div>
      <p class="beui-guide-intro">{{ intro }}</p>
    </header>
    <slot />
  </article>
</template>
