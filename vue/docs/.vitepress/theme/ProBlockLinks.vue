<script setup lang="ts">
import { computed } from 'vue'
import { PRO_BLOCKS } from '../../../../lib/pro-blocks'
import { useLocale } from './i18n'
import Icon from './Icon.vue'

const props = defineProps<{ pageKey: string; category?: boolean }>()
const { t } = useLocale()
const blocks = computed(() => PRO_BLOCKS[props.pageKey] ?? [])
</script>

<template>
  <section v-if="blocks.length" class="beui-pro-blocks" :class="{ 'is-category': category }" :aria-label="t('Related original beUI Pro blocks')">
    <h2>{{ category ? t('Popular beUI Pro blocks') : t('Used in these Pro blocks') }}</h2>
    <div class="beui-pro-block-grid">
      <a v-for="block in blocks" :key="block.path" :href="`https://pro.beui.dev${block.path}`" target="_blank" rel="noopener noreferrer">
        <span>{{ block.name }}</span>
        <span class="beui-sr-only">{{ t('Original beUI Pro. Opens in a new tab.') }}</span>
        <Icon name="arrow-up-right" />
      </a>
    </div>
  </section>
</template>

<style scoped>
.beui-pro-blocks { margin-top: 40px; }
.beui-pro-blocks h2 { margin: 0 0 12px; font-size: 14px; font-weight: 600; line-height: 20px; }
.beui-pro-blocks.is-category h2 { color: var(--muted-foreground); font-size: 12px; font-weight: 500; letter-spacing: .05em; text-transform: uppercase; }
.beui-pro-block-grid { display: grid; gap: 8px; }
.beui-pro-block-grid a { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border: 1px solid var(--border); border-radius: 16px; font-size: 13px; transition: background 150ms; }
.beui-pro-block-grid a:hover { background: var(--card); }
.beui-pro-block-grid svg { width: 14px; height: 14px; color: var(--muted-foreground); }
@media (min-width: 640px) { .beui-pro-block-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 1024px) { .beui-pro-block-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
