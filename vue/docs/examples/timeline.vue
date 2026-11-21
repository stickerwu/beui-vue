<script setup lang="ts">
import { ref } from 'vue'
import { Timeline } from 'beui-vue'
import { LucideIcon } from './layout-icons'

const active = ref('signups')

function chart(points: number[]) {
  const max = Math.max(...points)
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * 100
    const y = 56 - (p / max) * 44
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
  }).join(' ')
  return { line: path, area: `${path} L100 64 L0 64 Z` }
}
const SIGNUPS = chart([4, 5, 4, 6, 5, 7, 6, 9, 8, 12, 11, 15])
const RANK = chart([3, 4, 6, 5, 8, 9, 8, 11, 13, 12, 14, 16])

const EVENTS = [
  { id: 'beta', date: '2025-06-12', title: 'Private beta opens', likes: '1,204' },
  { id: 'android', date: '2025-08-03', title: 'Lumen for Android', likes: '3,918' },
  { id: 'offline', date: '2025-10-14', title: 'Offline drafts', likes: '4,827' },
  { id: 'signups', date: '2025-11-20', title: 'Weekly signups double', likes: '6,175' },
  { id: 'spaces', date: '2026-01-09', title: 'Shared spaces', likes: '2,640' },
  { id: 'command', date: '2026-03-17', title: 'The command menu', likes: '5,302' },
  { id: 'rank', date: '2026-05-28', title: 'Top 10 in productivity', likes: '13,916' },
  { id: 'two', date: '2026-08-05', title: 'Lumen 2.0', likes: '27,130' },
]
const likes = (id: string) => EVENTS.find(event => event.id === id)?.likes
</script>

<template>
  <div class="wrap">
    <Timeline v-model="active" :events="EVENTS" label="Lumen release history">
      <template #media="{ event }">
        <svg v-if="event.id === 'signups' || event.id === 'rank'" viewBox="0 0 100 64" preserveAspectRatio="none" class="chart" role="img" aria-label="Rising line chart">
          <path :d="(event.id === 'signups' ? SIGNUPS : RANK).area" class="area" />
          <path :d="(event.id === 'signups' ? SIGNUPS : RANK).line" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke" />
        </svg>
        <div v-else-if="event.id === 'android'" class="phone">
          <div class="phone-body">
            <div class="grip" />
            <div class="bar b1" />
            <div class="block" />
            <div class="bar b2" />
            <div class="bar b3" />
          </div>
        </div>
        <div v-else-if="event.id === 'offline'" class="sync">
          <div class="win">
            <div class="dots"><span /><span /><span /></div>
            <div class="line l1" />
            <div class="line l2" />
            <div class="line l3" />
          </div>
          <div class="side">
            <div class="line l1" />
            <div class="line l2" />
            <div class="line l3" />
          </div>
        </div>
        <div v-else-if="event.id === 'command'" class="keys">
          <div class="kbds"><kbd>⌘</kbd><kbd>K</kbd></div>
          <div class="line wide" />
        </div>
        <div v-else-if="event.id === 'two'" class="release"><span>2.0</span></div>
        <div v-else class="grid">
          <div v-for="i in 6" :key="i" class="tile" :style="{ opacity: 1 - (i - 1) * 0.1 }" />
        </div>
      </template>
      <template #meta="{ event }">
        <LucideIcon name="Heart" :size="16" />
        <span>{{ likes(event.id) }}</span>
      </template>
    </Timeline>
  </div>
</template>

<style scoped>
.wrap { width: 100%; padding: 1.5rem 0; box-sizing: border-box; }
.chart { width: 100%; height: 100%; color: var(--beui-foreground); }
.area { fill: color-mix(in srgb, var(--beui-foreground) 6%, transparent); }
.phone, .sync, .grid, .keys { --f15: color-mix(in srgb, var(--beui-foreground) 15%, transparent); --f10: color-mix(in srgb, var(--beui-foreground) 10%, transparent); --f06: color-mix(in srgb, var(--beui-foreground) 6%, transparent); --f20: color-mix(in srgb, var(--beui-foreground) 20%, transparent); background: color-mix(in srgb, var(--beui-muted) 40%, transparent); width: 100%; height: 100%; box-sizing: border-box; }
.phone { display: flex; align-items: flex-end; justify-content: center; padding-top: 1.25rem; }
.phone-body { display: flex; flex-direction: column; gap: .5rem; width: 50%; height: 100%; box-sizing: border-box; padding: .75rem; border: 1px solid var(--beui-border); border-bottom: 0; border-radius: 1.5rem 1.5rem 0 0; background: var(--beui-background); }
.grip { margin: 0 auto; width: 2rem; height: .375rem; border-radius: 9999px; background: var(--f15); }
.bar { height: .75rem; border-radius: 9999px; background: var(--f15); }
.phone .b1 { width: 66.6667%; }
.block { height: 4rem; border-radius: .75rem; background: var(--f06); }
.phone .b2, .phone .b3 { height: .5rem; background: var(--f10); }
.phone .b2 { width: 100%; }
.phone .b3 { width: 80%; }
.sync { display: flex; align-items: center; justify-content: center; gap: .75rem; padding: 1.25rem; }
.win { display: flex; flex: 1; flex-direction: column; gap: .5rem; height: 100%; box-sizing: border-box; padding: .75rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); }
.side { display: flex; flex-direction: column; gap: .5rem; width: 25%; height: 80%; box-sizing: border-box; padding: .5rem; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); }
.dots { display: flex; gap: .25rem; }
.dots span { width: .375rem; height: .375rem; border-radius: 9999px; background: var(--f20); }
.line { height: .5rem; border-radius: 9999px; background: var(--f10); }
.l1 { width: 75%; background: var(--f15); }
.l2 { width: 100%; }
.l3 { width: 66.6667%; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; padding: 1rem; }
.tile { border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); }
.keys { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .75rem; }
.kbds { display: flex; gap: .375rem; }
kbd { display: flex; width: 2.75rem; height: 2.75rem; align-items: center; justify-content: center; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); font-family: var(--font-geist, ui-sans-serif, system-ui, sans-serif); font-size: 1.125rem; line-height: 1.75rem; color: var(--beui-foreground); box-shadow: 0 1px 2px 0 rgb(0 0 0 / .05); }
.line.wide { width: 7rem; }
.release { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; background: var(--beui-foreground); color: var(--beui-background); }
.release span { font-size: 3rem; line-height: 1; font-weight: 500; letter-spacing: -.05em; }
</style>
