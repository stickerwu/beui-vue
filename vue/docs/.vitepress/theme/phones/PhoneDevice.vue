<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'

// The upstream clips are recorded on a 402 × 874 pt iPhone screen. The screen
// renders at that size and is scaled to the device, so type and spacing keep
// their on-phone proportions at every breakpoint.
const SCREEN_HEIGHT = 874

const { title } = defineProps<{ title: string }>()

const screen = useTemplateRef<HTMLElement>('screen')
const scale = shallowRef(0)
let observer: ResizeObserver | undefined

onMounted(() => {
  const node = screen.value
  if (!node) return
  const measure = () => { scale.value = node.clientHeight / SCREEN_HEIGHT }
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(node)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="phone-device">
    <div ref="screen" class="phone-screen">
      <div class="phone-viewport" :style="{ transform: `scale(${scale})`, visibility: scale ? undefined : 'hidden' }" inert aria-hidden="true">
        <div class="phone-status">
          <span class="phone-time">9:41</span>
          <span class="phone-island" />
          <svg class="phone-indicators" viewBox="0 0 80 14" fill="currentColor">
            <rect x="0" y="9" width="3.4" height="4.6" rx="1" />
            <rect x="5" y="6.6" width="3.4" height="7" rx="1" />
            <rect x="10" y="4" width="3.4" height="9.6" rx="1" />
            <rect x="15" y="1.4" width="3.4" height="12.2" rx="1" />
            <path d="M32 3.2a10.8 10.8 0 0 1 7.6 3.1l1.5-1.5A12.9 12.9 0 0 0 32 1.1a12.9 12.9 0 0 0-9.1 3.7l1.5 1.5A10.8 10.8 0 0 1 32 3.2Zm0 4.2a6.6 6.6 0 0 1 4.6 1.9l1.5-1.5A8.7 8.7 0 0 0 32 5.3a8.7 8.7 0 0 0-6.1 2.5l1.5 1.5A6.6 6.6 0 0 1 32 7.4Zm0 4.2c.7 0 1.3.3 1.7.7L32 14l-1.7-1.7c.4-.4 1-.7 1.7-.7Z" />
            <rect x="48.5" y="1.5" width="26" height="11.6" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".4" />
            <rect x="50.5" y="3.5" width="22" height="7.6" rx="2" />
            <path d="M76.3 5.2v4.2a2.3 2.3 0 0 0 0-4.2Z" fill-opacity=".45" />
          </svg>
        </div>
        <p class="phone-title">{{ title }}</p>
        <div class="phone-body">
          <slot />
        </div>
        <span class="phone-home" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* A device: a dark bezel around the screen, lifted on hover (upstream NativePhones). */
.phone-device {
  border-radius: 2.4rem;
  background: #171717;
  padding: 6px;
  box-shadow: 0 30px 60px -24px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(0 0 0 / 0.05);
  transition: transform 300ms ease-out;
}
:global(.dark .phone-device) {
  background: #262626;
  box-shadow: 0 30px 60px -24px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(255 255 255 / 0.2);
}
.phone-screen {
  position: relative;
  height: 18rem;
  aspect-ratio: 1206 / 2622;
  overflow: hidden;
  border-radius: 2.05rem;
  background: var(--background);
}
@media (min-width: 640px) { .phone-screen { height: 26rem; } }
@media (min-width: 1024px) { .phone-screen { height: 30rem; } }
@media (prefers-reduced-motion: reduce) { .phone-device { transition: none; } }

.phone-viewport {
  position: absolute;
  top: 0;
  left: 0;
  width: 402px;
  height: 874px;
  overflow: hidden;
  transform-origin: 0 0;
  color: var(--foreground);
  /* SF Pro on Apple devices, a metric-matched stand-in elsewhere (phone.css). */
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Phone UI", system-ui, sans-serif;
  text-align: left;
  pointer-events: none;
}
.phone-status {
  position: absolute;
  inset: 0 0 auto;
  height: 64px;
}
.phone-time {
  position: absolute;
  top: 20px;
  left: 56px;
  font-size: 17px;
  line-height: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.phone-island {
  position: absolute;
  top: 14px;
  left: 139px;
  width: 125px;
  height: 37px;
  border-radius: 999px;
  background: #000;
}
.phone-indicators {
  position: absolute;
  top: 25px;
  left: 288px;
  width: 80px;
  height: 14px;
}
.phone-title {
  position: absolute;
  top: 67px;
  left: 0;
  right: 0;
  margin: 0;
  font-size: 17px;
  line-height: 22px;
  font-weight: 600;
  text-align: center;
}
.phone-body {
  position: absolute;
  top: 108px;
  left: 0;
  right: 0;
  padding: 0 24px;
}
.phone-home {
  position: absolute;
  bottom: 8px;
  left: 50%;
  width: 143px;
  height: 5px;
  margin-left: -71.5px;
  border-radius: 999px;
  background: color-mix(in oklab, var(--foreground) 55%, transparent);
}
</style>
