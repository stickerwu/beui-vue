<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, provide, shallowRef, useTemplateRef, type Component } from 'vue'
import { previewVariantKey } from '../preview-variant'
import type { CatalogPage } from './catalog'
import { useLocale } from './i18n'
import Icon from './Icon.vue'

const { t, href } = useLocale()

const { page, detailed = false, mode = 'card' } = defineProps<{ page: CatalogPage; detailed?: boolean; mode?: 'card' | 'phone' }>()
const modules = import.meta.glob<{ default: Component }>('../../examples/*.vue')
const tile = useTemplateRef<HTMLElement>('tile')
const frame = useTemplateRef<HTMLElement>('frame')
const stage = useTemplateRef<HTMLElement>('stage')
const visible = shallowRef(false)
const measured = shallowRef(false)
const scale = shallowRef(0.22)
let intersectionObserver: IntersectionObserver | undefined
let resizeObserver: ResizeObserver | undefined

// Pin the example the tile shows, so multi-example demos render that one without their picker.
provide(previewVariantKey, page.tile?.variant ?? undefined)

const preview = computed(() => {
  const slug = page.tile?.slug ?? page.entries[0]?.slug
  const load = slug && modules[`../../examples/${slug}.vue`]
  return load ? defineAsyncComponent(async () => (await load()).default) : undefined
})
const stageStyle = computed(() => ({ '--home-preview-scale': scale.value }))

function measure() {
  if (!frame.value || !stage.value) return
  const children = Array.from(stage.value.children) as HTMLElement[]
  const width = Math.max(stage.value.offsetWidth, stage.value.scrollWidth, ...children.map(child => Math.max(child.offsetWidth, child.scrollWidth)))
  const height = Math.max(stage.value.offsetHeight, stage.value.scrollHeight, ...children.map(child => Math.max(child.offsetHeight, child.scrollHeight)))
  if (!width || !height) return
  // A phone screen is a tall viewport, so its preview fills the width and runs off
  // the bottom the way an app screen does. A card fits the whole demo instead.
  scale.value = mode === 'phone'
    ? Math.min(1, frame.value.clientWidth * 0.98 / width)
    : Math.max(0.22, Math.min(0.82, frame.value.clientWidth * 0.94 / width, frame.value.clientHeight * 0.94 / height))
  measured.value = true
}

onMounted(() => {
  resizeObserver = new ResizeObserver(measure)
  if (frame.value) resizeObserver.observe(frame.value)
  if (stage.value) resizeObserver.observe(stage.value)
  if (!tile.value) return
  intersectionObserver = new IntersectionObserver(([entry]) => {
    if (!entry?.isIntersecting) return
    visible.value = true
    intersectionObserver?.disconnect()
  }, { rootMargin: '200px 0px' })
  intersectionObserver.observe(tile.value)
})

onBeforeUnmount(() => {
  intersectionObserver?.disconnect()
  resizeObserver?.disconnect()
})
</script>

<template>
  <article ref="tile" class="home-preview-tile" :data-mode="mode">
    <a class="home-preview-link" :href="href(page.path)" :aria-label="`${t('View')} ${page.title}`" />
    <div class="home-preview-card">
      <div ref="frame" class="home-preview-frame">
        <div ref="stage" class="home-preview-stage" :class="{ 'home-preview-measured': measured }" :style="stageStyle" inert aria-hidden="true">
          <component :is="preview" v-if="visible && preview" />
        </div>
      </div>
      <div class="home-preview-caption" :class="{ 'is-detailed': detailed }">
        <div class="home-preview-caption-copy">
          <div class="home-preview-name">
            <h3>{{ page.title }}</h3>
            <span v-if="page.isNew" class="home-preview-new">{{ t('New') }}</span>
          </div>
          <p v-if="detailed">{{ page.description }}</p>
        </div>
        <Icon name="arrow-up-right" class="home-preview-arrow" />
      </div>
    </div>
  </article>
</template>
