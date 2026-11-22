<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from './i18n'

export interface Credit {
  name: string
  url: string
  avatar: string | null
}

// beui.dev's CreditLink: avatar, "Contributed by <name>", external arrow.
const props = defineProps<{ credit: Credit }>()
const { t } = useLocale()
const href = computed(() => {
  const url = new URL(props.credit.url)
  url.searchParams.set('ref', 'beui')
  return url.toString()
})
</script>

<template>
  <a class="beui-credit-link" :href="href" target="_blank" rel="noreferrer noopener">
    <img v-if="props.credit.avatar" :src="props.credit.avatar" alt="" width="20" height="20" class="beui-credit-avatar">
    <span>{{ t('Contributed by') }} <span class="beui-credit-name">{{ props.credit.name }}</span></span>
    <svg class="beui-credit-arrow" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
    <span class="beui-sr-only">{{ t('(opens in a new tab)') }}</span>
  </a>
</template>
