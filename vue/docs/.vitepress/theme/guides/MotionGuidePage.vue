<script setup lang="ts">
import { computed } from 'vue'
import { useLocale } from '../i18n'
import { motionCopyEn } from './motion-copy.en'
import { motionCopyZh } from './motion-copy.zh'
import GuidePage from './GuidePage.vue'
import MotionGuide from './MotionGuide.vue'

const { isZh } = useLocale()
const header = computed(() => (isZh.value ? motionCopyZh : motionCopyEn).header)
</script>

<template>
  <GuidePage :eyebrow="header.eyebrow" :title="header.title" :intro="header.intro" rule>
    <MotionGuide />
  </GuidePage>
</template>
