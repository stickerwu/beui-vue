<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, shallowRef } from 'vue'
import { layoutSpring } from '../core/motion'
import { Switch } from '../primitives'
import { formatMessage, type AvailabilitySchedulerMessages } from './messages'
import SchedulerCopyMenu from './SchedulerCopyMenu.vue'
import SchedulerIconButton from './SchedulerIconButton.vue'
import SchedulerTimeSelect from './SchedulerTimeSelect.vue'
import SchedulerTip from './SchedulerTip.vue'
import {
  clampRange, endOptions, panelKey, startOptions, toMinutes, toValue,
  type DayAvailability, type DayKey, type TimeOption, type TimeRange,
} from './scheduler-model'

const props = defineProps<{
  day: DayKey
  label: string
  t: AvailabilitySchedulerMessages
  state: DayAvailability
  options: TimeOption[]
  reduce: boolean
  locale?: string
  // True while this row holds the dropdown that opened last, which paints it
  // above every other row. A time panel opens downward when there is room and
  // upward when there isn't, so it has to clear the rows on either side of it
  // — no fixed paint order can satisfy both directions. The flag stays on
  // after the panel closes so the collapse animation stays on top too.
  elevated: boolean
  /** Id of the one time panel the scheduler is holding open, if any. */
  openPanel: string | null
}>()
const emit = defineEmits<{
  change: [next: DayAvailability]
  copy: [targets: DayKey[]]
  panelOpenChange: [panelId: string, open: boolean]
}>()

let counter = 0
// The counter restarts per mount, so skip ids a saved value already holds.
function nextId() {
  let id = `${props.day}-n${counter++}`
  while (props.state.ranges.some(range => range.id === id)) id = `${props.day}-n${counter++}`
  return id
}
// Same rule one level down: ranges stack against each other inside the row.
const openRangeId = shallowRef<string | null>(null)

const panelId = (rangeId: string, edge: 'start' | 'end') => panelKey(props.day, rangeId, edge)

function onRangePanelOpenChange(rangeId: string, id: string, open: boolean) {
  if (open) openRangeId.value = rangeId
  emit('panelOpenChange', id, open)
}

function setEnabled(enabled: boolean) {
  if (enabled && props.state.ranges.length === 0) emit('change', { enabled, ranges: [{ id: nextId(), start: '09:00', end: '17:00' }] })
  else emit('change', { ...props.state, enabled })
}

function updateRange(id: string, patch: Partial<TimeRange>) {
  const changed: 'start' | 'end' = patch.start !== undefined ? 'start' : 'end'
  emit('change', {
    ...props.state,
    ranges: props.state.ranges.map(range => {
      if (range.id !== id) return range
      const next = { ...range, ...patch }
      return { ...next, ...clampRange(next.start, next.end, props.options, changed) }
    }),
  })
}

function addRange() {
  const last = props.state.ranges[props.state.ranges.length - 1]
  const start = last ? Math.min(toMinutes(last.end) + 60, 24 * 60 - 60) : 540
  emit('change', { enabled: true, ranges: [...props.state.ranges, { id: nextId(), start: toValue(start), end: toValue(start + 60) }] })
}

function removeRange(id: string) {
  const ranges = props.state.ranges.filter(range => range.id !== id)
  // Removing the last slot marks the day unavailable.
  emit('change', { enabled: ranges.length > 0, ranges })
}

const layoutProp = computed(() => (props.reduce ? false : 'position'))
const enter = computed(() => (props.reduce ? { opacity: 0 } : { opacity: 0, y: -6, filter: 'blur(4px)' }))
const settle = computed(() => (props.reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }))
const leave = computed(() => (props.reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }))
const noteEnter = computed(() => (props.reduce ? { opacity: 0 } : { opacity: 0, y: -4 }))
const noteSettle = computed(() => (props.reduce ? { opacity: 1 } : { opacity: 1, y: 0 }))
</script>

<template>
  <motion.div :layout="layoutProp" :transition="layoutSpring" :style="{ zIndex: elevated ? 1 : undefined }" class="sch-row">
    <!-- toggle + label; actions ride along on mobile -->
    <div class="sch-row-head">
      <div class="sch-row-name">
        <Switch class="sch-row-switch" :checked="state.enabled" :aria-label="formatMessage(t.toggleDay, { day: label })" @update:checked="setEnabled" />
        <span class="sch-row-label">{{ label }}</span>
      </div>
      <div class="sch-row-actions is-mobile">
        <SchedulerTip :content="t.addTime">
          <SchedulerIconButton :label="formatMessage(t.addRange, { day: label })" :reduce="reduce" @click="addRange">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
          </SchedulerIconButton>
        </SchedulerTip>
        <SchedulerCopyMenu :from="day" :from-label="label" :t="t" :reduce="reduce" :locale="locale" @apply="emit('copy', $event)" />
      </div>
    </div>

    <!-- ranges or unavailable -->
    <div class="sch-row-body">
      <AnimatePresence :initial="false" mode="popLayout">
        <template v-if="state.enabled">
          <motion.div
            v-for="range in state.ranges"
            :key="range.id"
            :layout="layoutProp"
            :style="{ zIndex: openRangeId === range.id ? 1 : undefined }"
            :initial="enter"
            :animate="settle"
            :exit="leave"
            :transition="layoutSpring"
            class="sch-range">
            <div class="sch-range-field">
              <SchedulerTimeSelect
                :value="range.start"
                :options="startOptions(options, range.end, range.start, locale)"
                :open="openPanel === panelId(range.id, 'start')"
                @update:value="updateRange(range.id, { start: $event })"
                @update:open="onRangePanelOpenChange(range.id, panelId(range.id, 'start'), $event)" />
            </div>
            <span class="sch-range-dash">–</span>
            <div class="sch-range-field">
              <SchedulerTimeSelect
                :value="range.end"
                :options="endOptions(options, range.start, range.end, locale)"
                :open="openPanel === panelId(range.id, 'end')"
                @update:value="updateRange(range.id, { end: $event })"
                @update:open="onRangePanelOpenChange(range.id, panelId(range.id, 'end'), $event)" />
            </div>
            <SchedulerTip :content="t.remove">
              <SchedulerIconButton :label="t.removeRange" :reduce="reduce" @click="removeRange(range.id)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </SchedulerIconButton>
            </SchedulerTip>
          </motion.div>
        </template>
        <motion.span
          v-else
          key="unavailable"
          :layout="layoutProp"
          :initial="noteEnter"
          :animate="noteSettle"
          :exit="noteEnter"
          :transition="layoutSpring"
          class="sch-unavailable">
          {{ t.unavailable }}
        </motion.span>
      </AnimatePresence>
    </div>

    <!-- actions (desktop) -->
    <div class="sch-row-actions is-desktop">
      <SchedulerTip :content="t.addTime">
        <SchedulerIconButton :label="formatMessage(t.addRange, { day: label })" :reduce="reduce" @click="addRange">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
        </SchedulerIconButton>
      </SchedulerTip>
      <SchedulerCopyMenu :from="day" :from-label="label" :t="t" :reduce="reduce" :locale="locale" @apply="emit('copy', $event)" />
    </div>
  </motion.div>
</template>

<style scoped>
.sch-row { position: relative; display: flex; flex-direction: column; gap: .75rem; padding-block: 1rem; }
.sch-row-head { display: flex; align-items: center; justify-content: space-between; }
.sch-row-name { display: flex; align-items: center; gap: .625rem; }
.sch-row-switch { scale: .9; }
.sch-row-label { font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.sch-row-actions { display: flex; align-items: center; gap: .25rem; }
.sch-row-actions.is-desktop { display: none; }
.sch-row-body { display: flex; min-width: 0; flex: 1 1 0%; flex-direction: column; gap: .5rem; }
.sch-range { position: relative; display: flex; align-items: center; gap: .5rem; }
.sch-range-field { min-width: 0; flex: 1 1 0%; }
.sch-range-dash { color: var(--beui-muted-foreground); }
.sch-unavailable { padding-block: .25rem; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
@media (min-width: 640px) {
  .sch-row { flex-direction: row; align-items: flex-start; gap: 1rem; }
  .sch-row-head { width: 9rem; flex: none; justify-content: flex-start; padding-top: .25rem; }
  .sch-row-actions.is-mobile { display: none; }
  .sch-row-actions.is-desktop { display: flex; flex: none; padding-top: .125rem; }
  .sch-range-field { max-width: 132px; }
  .sch-unavailable { padding-block: .5rem; }
}
</style>
