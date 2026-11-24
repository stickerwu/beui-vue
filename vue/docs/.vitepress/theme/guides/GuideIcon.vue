<script setup lang="ts">
/**
 * The lucide icons the guide pages use (lucide-react geometry, ISC), drawn at
 * lucide's defaults: 24px box, stroke 2, round caps and joins.
 */
type Node = ['path', { d: string }] | ['circle', { cx: number; cy: number; r: number }] | ['rect', { x: number; y: number; width: number; height: number; rx: number }]

const ICONS: Record<string, Node[]> = {
  accessibility: [['circle', { cx: 16, cy: 4, r: 1 }], ['path', { d: 'm18 19 1-7-6 1' }], ['path', { d: 'm5 8 3-3 5.5 3-2.36 3.5' }], ['path', { d: 'M4.24 14.5a5 5 0 0 0 6.88 6' }], ['path', { d: 'M13.76 17.5a5 5 0 0 0-6.88-6' }]],
  bell: [['path', { d: 'M10.268 21a2 2 0 0 0 3.464 0' }], ['path', { d: 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326' }]],
  'circle-gauge': [['path', { d: 'M15.6 2.7a10 10 0 1 0 5.7 5.7' }], ['circle', { cx: 12, cy: 12, r: 2 }], ['path', { d: 'M13.4 10.6 19 5' }]],
  'mouse-pointer-2': [['path', { d: 'M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z' }]],
  'panel-top-open': [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }], ['path', { d: 'M3 9h18' }], ['path', { d: 'm15 14-3 3-3-3' }]],
  'refresh-cw': [['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }], ['path', { d: 'M21 3v5h-5' }], ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }], ['path', { d: 'M8 16H3v5' }]],
  'rows-3': [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }], ['path', { d: 'M21 9H3' }], ['path', { d: 'M21 15H3' }]],
  sparkles: [['path', { d: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z' }], ['path', { d: 'M20 2v4' }], ['path', { d: 'M22 4h-4' }], ['circle', { cx: 4, cy: 20, r: 2 }]],
  zap: [['path', { d: 'M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z' }]],
  'arrow-up-right': [['path', { d: 'M7 7h10v10' }], ['path', { d: 'M7 17 17 7' }]],
}

const props = defineProps<{ name: keyof typeof ICONS | string }>()
</script>

<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <component :is="tag" v-for="([tag, attrs], index) in ICONS[props.name] ?? []" :key="index" v-bind="attrs" />
  </svg>
</template>
