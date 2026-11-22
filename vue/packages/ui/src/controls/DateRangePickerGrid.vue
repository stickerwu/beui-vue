<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, inject } from 'vue'
import { easeOut, pressSpring } from '../core/motion'
import PresenceGate from '../layout/PresenceGate.vue'
import DrpChoices from './DrpChoices.vue'
import { DRP_KEY, parse } from './drp-core'

/** The month grid, or the month and year choices when the header opened them. */
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerGrid must be used within DateRangePicker')

const weekdayLong = computed(() => Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(ctx.locale.value, { weekday: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, 0, 4 + index))))
const weekdayShort = computed(() => Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(ctx.locale.value, { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2026, 0, 4 + index))))
const slideKey = computed(() => (ctx.view.value === 'days' ? ctx.month.value : `${ctx.view.value}-${ctx.view.value === 'years' ? ctx.yearPage.value : ctx.year.value}`))
const slideCustom = computed(() => ({ direction: ctx.direction.value, reduce: ctx.reduce.value }))
const choiceLabel = computed(() => (ctx.view.value === 'months'
  // Years as strings, so a locale never groups them ("2,026").
  ? ctx.t('monthChoices', { year: String(ctx.year.value) })
  : ctx.t('yearChoices', { start: String(ctx.yearPage.value), end: String(ctx.yearPageEnd.value) })))
// A departing slide's `custom` reaches its exit through the presence context.
const monthVariants = {
  enter: ({ direction, reduce }: { direction: number; reduce: boolean }) => ({ opacity: 0, x: reduce ? 0 : direction * 12 }),
  exit: ({ direction, reduce }: { direction: number; reduce: boolean }) => ({
    opacity: 0,
    x: reduce ? 0 : direction * -8,
    transition: { duration: 0.12, ease: easeOut },
  }),
}

function inRange(date: string | null) {
  const range = ctx!.shownRange.value
  return Boolean(date && range && date >= range.from && date <= (range.to ?? range.from))
}
function endpoint(date: string | null) {
  const value = ctx!.value.value
  return Boolean(date && value && (date === value.from || date === value.to))
}
function selected(date: string | null) {
  const value = ctx!.value.value
  return date ? Boolean(value && date >= value.from && date <= (value.to ?? value.from)) : undefined
}
function cellRadius(date: string | null, index: number) {
  const range = ctx!.shownRange.value
  const covered = inRange(date)
  return {
    'drp-cell-start': covered && (index === 0 || date === range?.from),
    'drp-cell-end': covered && (index === 6 || date === range?.to || !range?.to),
  }
}
function highlightInset(date: string, week: (string | null)[], index: number) {
  const range = ctx!.shownRange.value
  const edge = endpoint(date)
  return {
    left: edge && (date === range?.from || !week[index - 1]) ? '50%' : '0',
    right: edge && (date === (range?.to ?? range?.from) || !week[index + 1]) ? '50%' : '0',
  }
}
function enterCell(event: PointerEvent, date: string | null) {
  const value = ctx!.value.value
  if (ctx!.canHover.value && event.pointerType !== 'touch' && date && !ctx!.unavailable(date) && value && !value.to) ctx!.preview.value = date
}
function focusDate(date: string) {
  ctx!.cursor.value = date
  const value = ctx!.value.value
  if (value && !value.to) ctx!.preview.value = date
}
function pickChoice(id: string) {
  ctx!.goToMonth(ctx!.view.value === 'months' ? id : `${id.padStart(4, '0')}-${ctx!.month.value.slice(5, 7)}-01`)
}
</script>

<template>
  <div class="drp-slides" @pointerleave="ctx.preview.value = null">
    <AnimatePresence :initial="false" mode="popLayout" :custom="slideCustom">
      <motion.div
        :key="slideKey"
        :custom="slideCustom"
        :variants="monthVariants"
        initial="enter"
        :animate="{ opacity: 1, x: 0 }"
        exit="exit"
        :transition="{ duration: ctx.reduce.value ? 0.1 : 0.18, ease: easeOut }"
      >
        <!-- The departing month's grid leaves the tab order as soon as exit begins. -->
        <PresenceGate>
          <div>
            <DrpChoices
              v-if="ctx.view.value !== 'days'"
              :id="ctx.choicesId"
              :label="choiceLabel"
              :choices="ctx.choices.value"
              :selected="ctx.view.value === 'months' ? ctx.month.value : String(ctx.year.value)"
              :focus-on-mount="ctx.focusChoices.value"
              :reduce="ctx.reduce.value"
              @close="ctx.closeChoices"
              @select="pickChoice"
            />
            <table
              v-else
              role="grid"
              class="drp-grid"
              :aria-labelledby="ctx.heading"
              :aria-describedby="ctx.help"
              :tabindex="ctx.active.value === null ? 0 : undefined"
            >
              <thead>
                <tr>
                  <th v-for="(day, index) in weekdayLong" :key="day" scope="col" :abbr="day" class="drp-weekday">{{ weekdayShort[index] }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="week in ctx.weeks.value" :key="week.start">
                  <td
                    v-for="(date, index) in week.dates"
                    :key="date ?? `empty-${index}`"
                    role="gridcell"
                    class="drp-cell"
                    :class="cellRadius(date, index)"
                    :aria-selected="selected(date)"
                    @pointerenter="enterCell($event, date)"
                  >
                    <span
                      v-if="date"
                      class="drp-range"
                      :class="{ 'drp-range-on': inRange(date) }"
                      aria-hidden="true"
                      :style="highlightInset(date, week.dates, index)"
                    />
                    <motion.button
                      v-if="date"
                      type="button"
                      class="drp-day"
                      :class="{
                        'drp-day-endpoint': endpoint(date),
                        'drp-day-hover': !endpoint(date) && ctx.canHover.value && !ctx.unavailable(date) && !inRange(date),
                        'drp-day-today': date === ctx.today && !endpoint(date),
                      }"
                      :disabled="ctx.unavailable(date)"
                      :aria-label="ctx.formats.value.date.format(parse(date))"
                      :aria-current="date === ctx.today ? 'date' : undefined"
                      :tabindex="date === ctx.active.value ? 0 : -1"
                      :while-tap="ctx.reduce.value ? undefined : { scale: 0.9 }"
                      :transition="pressSpring"
                      @click="ctx.select(date)"
                      @focus="focusDate(date)"
                      @keydown="ctx.onKey($event, date)"
                    >
                      {{ new Date(parse(date)).getUTCDate() }}
                    </motion.button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </PresenceGate>
      </motion.div>
    </AnimatePresence>
  </div>

</template>

<style>
.drp-slides { position: relative; overflow: hidden; }
.drp-grid { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0 0.25rem; user-select: none; }
.drp-weekday { height: 1.5rem; padding: 0 0 0.375rem; text-align: center; font-size: 11px; line-height: 1rem; font-weight: 500; color: var(--beui-muted-foreground); }
.drp-cell { position: relative; height: 2rem; padding: 0; text-align: center; }
.drp-cell-start { border-top-left-radius: 9999px; border-bottom-left-radius: 9999px; }
.drp-cell-end { border-top-right-radius: 9999px; border-bottom-right-radius: 9999px; }
/* Range scrubbing follows immediately: independent cell fades leave stale highlights behind a moving pointer. */
.drp-range { position: absolute; top: 0; bottom: 0; border-radius: inherit; background: color-mix(in srgb, var(--beui-foreground) 8%, transparent); opacity: 0; pointer-events: none; }
.drp-range-on { opacity: 1; }
.drp-day { position: relative; display: flex; box-sizing: border-box; width: 100%; max-width: 2rem; height: 2rem; align-items: center; justify-content: center; margin: 0 auto; padding: 0; border: 0; border-radius: 9999px; background: transparent; color: inherit; font: inherit; font-size: 0.75rem; line-height: 1rem; font-variant-numeric: tabular-nums; cursor: pointer; outline: none; }
.drp-day:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.drp-day:disabled { opacity: 0.3; cursor: default; }
.drp-day-endpoint { background: var(--beui-foreground); color: var(--beui-background); font-weight: 500; }
.drp-day-hover:hover { background: var(--beui-muted); }
.drp-day-today { font-weight: 600; }
.drp-day-today::after { content: ''; position: absolute; bottom: 0.25rem; width: 3px; height: 3px; border-radius: 9999px; background: currentColor; }
</style>
