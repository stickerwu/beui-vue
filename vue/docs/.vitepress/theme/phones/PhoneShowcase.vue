<script setup lang="ts">
import { useReducedMotion } from 'beui-vue'
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type Component } from 'vue'
import type { CatalogPage } from '../catalog'
import { useLocale } from '../i18n'
import Icon from '../Icon.vue'
import PhoneAlert from './PhoneAlert.vue'
import PhoneColor from './PhoneColor.vue'
import PhoneDevice from './PhoneDevice.vue'
import PhoneSwipe from './PhoneSwipe.vue'
import PhoneTabs from './PhoneTabs.vue'
import './phone.css'

const { pages } = defineProps<{ pages: CatalogPage[] }>()
const { t, href } = useLocale()

const screens: Record<string, Component> = { tabs: PhoneTabs, 'color-picker': PhoneColor, alert: PhoneAlert, 'swipeable-list': PhoneSwipe }
// Vertical offsets that keep the row from reading as a flat grid (upstream STAGGER).
const STAGGER = [40, 0, 16, 48]

// One control pauses every phone; with reduced motion they start paused.
const reduce = useReducedMotion()
const paused = shallowRef(false)
watch(reduce, value => { if (value) paused.value = true }, { immediate: true })

// Each phone plays only while it is on screen.
const list = useTemplateRef<HTMLElement>('list')
const visible = shallowRef<Record<number, boolean>>({})
let observer: IntersectionObserver | undefined
onMounted(() => {
  const items = list.value?.querySelectorAll<HTMLElement>('[data-phone]') ?? []
  observer = new IntersectionObserver(entries => {
    const next = { ...visible.value }
    for (const entry of entries) next[Number((entry.target as HTMLElement).dataset.phone)] = entry.isIntersecting
    visible.value = next
  }, { threshold: 0.25 })
  for (const item of items) observer.observe(item)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="phones">
    <button type="button" class="phones-toggle" :aria-pressed="paused" @click="paused = !paused">
      <svg v-if="paused" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" /></svg>
      <svg v-else aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="3" width="5" height="18" rx="1" /><rect x="5" y="3" width="5" height="18" rx="1" /></svg>
      {{ paused ? t('Play demos') : t('Pause demos') }}
    </button>
    <!-- The phones rise out of the panel's bottom edge, staggered. -->
    <ul ref="list" class="phones-list">
      <li v-for="(page, index) in pages" :key="page.path" :data-phone="index" class="phones-item" :class="`is-${index}`" :style="{ marginTop: `${STAGGER[index % STAGGER.length]}px` }">
        <a class="phones-link" :href="href(page.path)">
          <span class="phones-name">{{ page.title }} <Icon name="arrow-right" /></span>
          <PhoneDevice :title="page.title">
            <component :is="screens[page.slug]" :playing="!paused && !!visible[index]" />
          </PhoneDevice>
        </a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.phones { position: relative; margin-top: 48px; }
@media (min-width: 640px) { .phones { margin-top: 56px; } }
.phones-toggle {
  position: absolute;
  top: 0;
  right: 16px;
  z-index: 10;
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in oklab, var(--background) 80%, transparent);
  color: var(--muted-foreground);
  font: inherit;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: color 150ms;
}
.phones-toggle:hover { color: var(--foreground); }
.phones-toggle:focus-visible { box-shadow: 0 0 0 2px var(--ring); }
.phones-toggle svg { width: 14px; height: 14px; }
.phones-list {
  display: flex;
  height: 17rem;
  align-items: flex-start;
  justify-content: center;
  gap: 12px;
  margin: 0;
  padding: 48px 16px 0;
  overflow: hidden;
  list-style: none;
  mask-image: linear-gradient(to bottom, black 85%, transparent);
}
@media (min-width: 640px) { .phones-list { height: 22rem; gap: 20px; } }
@media (min-width: 1024px) { .phones-list { height: 26rem; gap: 32px; } }
.phones-item { flex: none; }
/* Two phones fit a narrow screen, three a tablet. */
.phones-item.is-2 { display: none; }
.phones-item.is-3 { display: none; }
@media (min-width: 768px) { .phones-item.is-2 { display: block; } }
@media (min-width: 1024px) { .phones-item.is-3 { display: block; } }
.phones-link { display: flex; flex-direction: column; align-items: center; gap: 12px; color: inherit; text-decoration: none; outline: none; }
.phones-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--background);
  color: var(--foreground);
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  transition: border-color 150ms;
}
.phones-name :deep(svg) { width: 12px; height: 12px; color: var(--muted-foreground); transition: transform 150ms; }
.phones-link:hover .phones-name { border-color: var(--border-strong); }
.phones-link:hover .phones-name :deep(svg) { transform: translateX(2px); }
.phones-link:hover :deep(.phone-device) { transform: translateY(-6px); }
.phones-link:focus-visible :deep(.phone-device) { box-shadow: 0 0 0 2px var(--ring); }
@media (prefers-reduced-motion: reduce) {
  .phones-name :deep(svg) { transition: none; }
}
</style>
