<script setup lang="ts">
import { LayoutGroup } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef, useId, watch } from 'vue'
import { useValue } from '../agents/shared'
import { availabilitySchedulerMessages } from './messages'
import SchedulerDayRow from './SchedulerDayRow.vue'
import {
  WEEKDAYS, buildOptions, defaultWeek, panelKey, weekdayLabel,
  type DayAvailability, type DayKey, type WeekAvailability,
} from './scheduler-model'

const props = withDefaults(defineProps<{
  value?: WeekAvailability
  modelValue?: WeekAvailability
  defaultValue?: WeekAvailability
  /** Minutes between selectable times. Default 30. */
  step?: number
  /** BCP 47 locale for weekday names and time labels; English when unset. */
  locale?: string
  className?: string
  /** Override any built-in string. */
  labels?: Partial<typeof availabilitySchedulerMessages>
}>(), { step: 30 })
const emit = defineEmits<{ 'update:modelValue': [value: WeekAvailability]; change: [value: WeekAvailability] }>()

const reduceMotion = useReducedMotion()
const reduce = computed(() => Boolean(reduceMotion.value))
const groupId = `be-availability-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const t = computed(() => ({ ...availabilitySchedulerMessages, ...props.labels }))
const options = computed(() => buildOptions(Math.max(1, Math.min(720, Math.floor(props.step) || 30)), props.locale))

const { value: week, set } = useValue<WeekAvailability>(() => props.modelValue ?? props.value, props.defaultValue ?? defaultWeek(), next => {
  emit('update:modelValue', next)
  emit('change', next)
})

// The row that last opened a dropdown paints above the rest — see DayRow.
const openDay = shallowRef<DayKey | null>(null)
// Exactly one time panel is open at a time, and the scheduler is the one that
// knows which. A panel is absolutely positioned inside its own field, so two
// open at once paint over each other's options — and nothing else can close the
// first: a Select only dismisses on an outside *pointerdown*, which keyboard
// and assistive-technology activation never fires.
const openPanel = shallowRef<string | null>(null)

// Which panels the week currently puts on screen. A field that leaves — its day
// switched off, its range removed — never reports its panel closed, and keeping
// its id would reopen the panel the moment the same range came back.
const livePanels = computed(() => {
  const ids = new Set<string>()
  for (const { key } of WEEKDAYS) {
    if (!week.value[key].enabled) continue
    for (const range of week.value[key].ranges) {
      ids.add(panelKey(key, range.id, 'start'))
      ids.add(panelKey(key, range.id, 'end'))
    }
  }
  return ids
})
watch([livePanels, openPanel], () => {
  if (openPanel.value !== null && !livePanels.value.has(openPanel.value)) openPanel.value = null
})

let copies = 0
function setDay(day: DayKey, next: DayAvailability) {
  set({ ...week.value, [day]: next })
}

function onPanelOpenChange(day: DayKey, id: string, open: boolean) {
  openPanel.value = open ? id : openPanel.value === id ? null : openPanel.value
  // Elevation stays on the row that opened last so the panel's collapse
  // animation finishes above its neighbours.
  if (open) openDay.value = day
}

function copyDay(from: DayKey, targets: DayKey[]) {
  const source = week.value[from]
  const next = { ...week.value }
  for (const target of targets) {
    next[target] = {
      enabled: source.enabled,
      ranges: source.ranges.map(range => ({ ...range, id: `${target}-c${copies++}` })),
    }
  }
  set(next)
}
</script>

<template>
  <LayoutGroup :id="groupId">
    <div class="be-availability" :class="className">
      <SchedulerDayRow
        v-for="(weekday, index) in WEEKDAYS"
        :key="weekday.key"
        :day="weekday.key"
        :label="weekdayLabel(index, locale)"
        :t="t"
        :state="week[weekday.key]"
        :options="options"
        :reduce="reduce"
        :locale="locale"
        :elevated="openDay === weekday.key"
        :open-panel="openPanel"
        @change="setDay(weekday.key, $event)"
        @copy="copyDay(weekday.key, $event)"
        @panel-open-change="(id, open) => onPanelOpenChange(weekday.key, id, open)" />
    </div>
  </LayoutGroup>
</template>

<style scoped>
.be-availability { box-sizing: border-box; width: 100%; max-width: 36rem; color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; }
.be-availability > :deep(* + *) { border-top: 1px solid var(--beui-border); }
</style>
