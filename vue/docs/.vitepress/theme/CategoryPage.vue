<script setup lang="ts">
import { computed } from 'vue'
import { localizePage, localizeSection, pages, sections } from './catalog'
import { useLocale } from './i18n'
import PreviewTile from './PreviewTile.vue'
import ProBlockLinks from './ProBlockLinks.vue'

const { category } = defineProps<{ category?: string }>()
const { isZh, t, href } = useLocale()
const locale = computed(() => (isZh.value ? 'zh' : 'en'))
const section = computed(() => {
  const found = sections.find(item => item.slug === category)
  return found ? localizeSection(found, locale.value) : undefined
})
const categoryPages = computed(() => section.value?.entries ?? pages.map(page => localizePage(page, locale.value)))
const recent = computed(() => categoryPages.value.filter(item => item.isNew))
const remaining = computed(() => categoryPages.value.filter(item => !item.isNew))
const agentGroups = computed(() => [
  { title: t('Conversation'), description: t('The building blocks of a conversation, from the first prompt to the last message.'), slugs: ['prompt-input', 'message', 'message-bubble', 'message-scroller'] },
  { title: t('Responses'), description: t('Streaming text, generated images and the sources behind an answer.'), slugs: ['streaming-response', 'image-generation', 'citations'] },
  { title: t('Progress'), description: t('Keep the work visible while your agent thinks, plans and acts.'), slugs: ['loading-states', 'todo-list', 'agent-activity'] },
  { title: t('Tools'), description: t('Show tool calls, code and file changes as they happen.'), slugs: ['tool-result', 'code-block', 'file-diff'] },
  { title: t('Human control'), description: t('Give people a clear way to review and approve the next step.'), slugs: ['tool-approval', 'approval-card'] },
])
const groups = computed(() => agentGroups.value.map(group => ({
  ...group,
  entries: group.slugs.flatMap(slug => categoryPages.value.filter(item => item.slug === slug)),
})).filter(group => group.entries.length))
</script>

<template>
  <article class="beui-category-page">
    <nav class="beui-breadcrumb" :aria-label="t('Breadcrumb')">
      <span>{{ section?.name ?? t('Components') }}</span>
    </nav>
    <h1>{{ section?.heading ?? t('All Vue components') }}</h1>
    <p class="beui-category-description">{{ section?.description ?? t('Animated components and interactive blocks, rebuilt for Vue 3 and Nuxt.') }}</p>
    <nav class="beui-mobile-platform" :aria-label="t('Component platform')">
      <span aria-current="page">Vue</span>
      <a :href="`https://beui.dev${section?.path ?? '/components/motion'}`" target="_blank" rel="noopener noreferrer">React ↗</a>
    </nav>
    <div v-if="category === 'agents'" class="beui-agent-groups">
      <section v-for="group in groups" :key="group.title">
        <h2>{{ group.title }}</h2>
        <p>{{ group.description }}</p>
        <div class="beui-category-grid">
          <PreviewTile v-for="item in group.entries" :key="item.path" :page="item" detailed />
        </div>
      </section>
    </div>
    <template v-else>
      <section v-if="recent.length" class="beui-category-section">
        <h2>{{ t('New') }}</h2>
        <div class="beui-category-grid">
          <PreviewTile v-for="item in recent" :key="item.path" :page="item" detailed />
        </div>
      </section>
      <ProBlockLinks v-if="category" :page-key="category" category />
      <section class="beui-category-section">
        <h2>{{ recent.length ? `${t('All')} ${section?.name ?? t('Components')}` : section?.name ?? t('All components') }}</h2>
        <div class="beui-category-grid">
          <PreviewTile v-for="item in remaining" :key="item.path" :page="item" detailed />
        </div>
      </section>
    </template>
  </article>
</template>
