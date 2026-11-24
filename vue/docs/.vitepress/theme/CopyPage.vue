<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue'
import { PopoverMorph } from 'beui-vue'
import Icon from './Icon.vue'
import { useLocale } from './i18n'

export interface PageAction { label: string; href: string; icon: string }

/** "Copy Page" with its menu of page actions, shared by component and guide pages. */
const props = defineProps<{
  /** Text copied to the clipboard, read when the button is pressed. */
  text: () => string
  actions: PageAction[]
}>()
const { t } = useLocale()
const copied = shallowRef(false)
const status = shallowRef('')
const menuOpen = shallowRef(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  clearTimeout(timer)
  try {
    await navigator.clipboard.writeText(props.text())
    copied.value = true
    status.value = t('Page copied.')
    timer = setTimeout(() => { copied.value = false }, 2000)
  } catch {
    status.value = t('Select the page text to copy it.')
  }
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="beui-copy-page">
    <button type="button" @click="copy">
      <Icon :name="copied ? 'check' : 'copy'" />
      {{ copied ? t('Copied!') : t('Copy Page') }}
    </button>
    <PopoverMorph v-model:open="menuOpen" :label="t('More page actions')" align="end">
      <template #trigger><Icon name="chevron-down" /><span class="beui-sr-only">{{ t('More page actions') }}</span></template>
      <template #default="{ close }">
        <div class="beui-page-actions">
          <a v-for="action in actions" :key="action.label" :href="action.href" target="_blank" rel="noopener noreferrer" @click="close">
            <Icon :name="action.icon" />{{ action.label }}<span class="beui-sr-only">{{ t('Opens in a new tab.') }}</span>
          </a>
        </div>
      </template>
    </PopoverMorph>
  </div>
  <span class="beui-sr-only" role="status">{{ status }}</span>
</template>
