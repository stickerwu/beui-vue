<script setup lang="ts">
import { ActionSwapCascadeIcon, ButtonBase } from 'beui-vue'
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { useLocale } from './i18n'

/**
 * Port of beui.dev's CopyButton (components/app/docs/copy-button.tsx): a secondary icon
 * Button pressed to 0.85 whose copy glyph rolls into a check for 1.5s after a copy.
 */
const props = withDefaults(defineProps<{ text: string; label?: string }>(), { label: 'Copy code' })
const { t } = useLocale()
const copied = shallowRef(false)
const failed = shallowRef(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined
const ariaLabel = computed(() => t(copied.value ? 'Copied!' : props.label))

async function copy() {
  clearTimeout(resetTimer)
  try {
    await navigator.clipboard.writeText(props.text)
  } catch {
    // Clipboard blocked (permission denied or insecure context).
    failed.value = true
    resetTimer = setTimeout(() => { failed.value = false }, 1500)
    return
  }
  copied.value = true
  resetTimer = setTimeout(() => { copied.value = false }, 1500)
}

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<template>
  <ButtonBase class="beui-copy-button" variant="secondary" size="icon" :press-scale="0.85" :aria-label="ariaLabel" @click="copy">
    <ActionSwapCascadeIcon :value="copied ? 'check' : 'copy'" class="beui-copy-button-icon">
      <svg v-if="copied" class="beui-copy-button-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
      <svg v-else viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="14" height="14" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
    </ActionSwapCascadeIcon>
    <span class="beui-sr-only" role="status">{{ copied ? t('Copied!') : failed ? t('Copy failed') : '' }}</span>
  </ButtonBase>
</template>
