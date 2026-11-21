<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, inject } from 'vue'
import { easeOut, pressSpring } from '../core/motion'
import PresenceGate from '../layout/PresenceGate.vue'
import DrpChoices from './DrpChoices.vue'
import { DRP_KEY, parse, type DrpController } from './drp-core'

/** The calendar surface: summary, header, month grid and footer. */
const props = withDefaults(defineProps<{
  /** Drop the card chrome when the calendar sits inside a popover. */
  bare?: boolean
  showSummary?: boolean
}>(), { showSummary: undefined })
const injected = inject(DRP_KEY)
if (!injected) throw new Error('DrpCalendar must be used within DateRangePicker')
const ctx: DrpController = injected

const weekdayLong = computed(() => Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(ctx.locale.value, { weekday: 'long', timeZone: 'UTC' }).format(Date.UTC(2026, 0, 4 + index))))
const weekdayShort = computed(() => Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(ctx.locale.value, { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2026, 0, 4 + index))))
const slideKey = computed(() => (ctx.view.value === 'days' ? ctx.month.value : `${ctx.view.value}-${ctx.view.value === 'years' ? ctx.yearPage.value : ctx.year.value}`))
const slideCustom = computed(() => ({ direction: ctx.direction.value, reduce: ctx.reduce.value }))
const summaryShown = computed(() => props.showSummary ?? ctx.showSummary.value)
const monthLabel = computed(() => ctx.formats.value.monthName.format(parse(ctx.month.value)))
const choiceLabel = computed(() => (ctx.view.value === 'months'
  // Years as strings, so a locale never groups them ("2,026").
  ? ctx.t('monthChoices', { year: String(ctx.year.value) })
  : ctx.t('yearChoices', { start: String(ctx.yearPage.value), end: String(ctx.yearPageEnd.value) })))
const pageLabel = (kind: 'previous' | 'next') => ctx.t(`${kind}${ctx.view.value === 'years' ? 'Years' : ctx.view.value === 'months' ? 'Year' : 'Month'}` as 'previousMonth')
const selection = computed(() => {
  const count = ctx.dayCount.value
  return count ? ctx.t(count === 1 ? 'daySelected' : 'daysSelected', { count }) : ctx.value.value ? ctx.t('chooseEndDate') : ctx.t('chooseStartDate')
})

// A departing slide's `custom` reaches its exit through the presence context.
const monthVariants = {
  enter: ({ direction, reduce }: { direction: number; reduce: boolean }) => ({ opacity: 0, x: reduce ? 0 : direction * 12 }),
  exit: ({ direction, reduce }: { direction: number; reduce: boolean }) => ({
    opacity: 0,
    x: reduce ? 0 : direction * -8,
    transition: { duration: 0.12, ease: easeOut },
  }),
}

function setMonthTrigger(node: unknown) { ctx!.monthTrigger.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null }
function setYearTrigger(node: unknown) { ctx!.yearTrigger.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null }

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
const startLabel = computed(() => ctx.value.value ? ctx.formats.value.short.format(parse(ctx.value.value.from)) : ctx.t('selectDate'))
const endLabel = computed(() => ctx.value.value?.to ? ctx.formats.value.short.format(parse(ctx.value.value.to)) : ctx.t('selectDate'))
</script>

<template>
  <section class="drp-calendar" :class="{ 'drp-calendar-bare': bare }" :aria-label="ctx.label.value">
    <h3 :id="ctx.heading" aria-live="polite" class="drp-sr">{{ ctx.formats.value.month.format(parse(ctx.month.value)) }}</h3>

    <div v-if="summaryShown" class="drp-summary">
      <div class="drp-summary-cell">
        <p class="drp-summary-label">{{ ctx.t('startDate') }}</p>
        <p class="drp-summary-value">{{ startLabel }}</p>
      </div>
      <svg class="drp-summary-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      <div class="drp-summary-cell">
        <p class="drp-summary-label">{{ ctx.t('endDate') }}</p>
        <p class="drp-summary-value" :class="{ 'drp-muted': !ctx.value.value?.to }">{{ endLabel }}</p>
      </div>
    </div>

    <div class="drp-header">
      <div class="drp-header-left">
        <button
          :ref="setMonthTrigger"
          type="button"
          class="drp-text-button drp-month-button"
          :class="{ 'drp-hidden': ctx.view.value === 'years' }"
          :aria-label="ctx.t('chooseMonth')"
          :aria-expanded="ctx.view.value === 'months'"
          :aria-controls="ctx.view.value === 'months' ? ctx.choicesId : undefined"
          :disabled="ctx.disabled.value"
          @click="ctx.openChoices('months')"
        >
          {{ monthLabel }}
          <svg class="drp-chevron drp-muted" :class="{ 'drp-flip': ctx.view.value === 'months' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <button
          :ref="setYearTrigger"
          type="button"
          class="drp-text-button drp-year-button"
          :aria-label="ctx.t('chooseYear')"
          :aria-expanded="ctx.view.value === 'years'"
          :aria-controls="ctx.view.value === 'years' ? ctx.choicesId : undefined"
          :disabled="ctx.disabled.value"
          @click="ctx.openChoices('years')"
        >
          {{ ctx.view.value === 'years' ? `${ctx.yearPage.value}–${ctx.yearPageEnd.value}` : ctx.year.value }}
          <svg class="drp-chevron" :class="{ 'drp-flip': ctx.view.value === 'years' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
      <div class="drp-header-right">
        <button type="button" class="drp-icon-button" :aria-label="pageLabel('previous')" :disabled="ctx.previousDisabled.value" @click="ctx.page(-1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <button type="button" class="drp-icon-button" :class="{ 'drp-hidden': ctx.view.value === 'years' && ctx.nextDisabled.value }" :aria-label="pageLabel('next')" :disabled="ctx.nextDisabled.value" :hidden="ctx.view.value === 'years' && ctx.nextDisabled.value" @click="ctx.page(1)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
    </div>

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

    <slot name="footer">
      <div class="drp-footer">
        <div class="drp-footer-row">
          <p class="drp-selection">{{ selection }}</p>
          <button type="button" class="drp-clear" :aria-label="ctx.t('clearLabel')" :disabled="ctx.disabled.value || !ctx.value.value" @click="ctx.clear()">{{ ctx.t('clear') }}</button>
        </div>
        <div v-if="ctx.presets.value.length" class="drp-presets">
          <button
            v-for="preset in ctx.presets.value"
            :key="preset.label"
            type="button"
            class="drp-preset"
            :class="{ 'drp-preset-on': ctx.value.value?.from === preset.value.from && ctx.value.value?.to === preset.value.to }"
            :aria-label="preset.label"
            :aria-pressed="ctx.value.value?.from === preset.value.from && ctx.value.value?.to === preset.value.to"
            :disabled="!ctx.rangeAvailable(preset.value)"
            @click="ctx.selectPreset(preset.value, preset.label)"
          >{{ preset.label }}</button>
        </div>
      </div>
    </slot>

    <p :id="ctx.help" class="drp-sr">{{ ctx.t('help') }}</p>
    <span role="status" class="drp-sr">{{ ctx.announcement.value }}</span>
  </section>
</template>

<style scoped>
.drp-calendar { box-sizing: border-box; width: 20rem; max-width: 100%; padding: 0.875rem; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; text-align: start; }
.drp-calendar-bare { width: 100%; border: 0; border-radius: 0; }
.drp-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.drp-muted { color: var(--beui-muted-foreground); }
.drp-calendar .drp-hidden { display: none; }
.drp-calendar :is(p, h3) { margin: 0; }

.drp-summary { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.5rem; margin-bottom: 0.625rem; padding: 0.5rem 0.75rem; border: 1px solid var(--beui-border); border-radius: 0.5rem; background: color-mix(in srgb, var(--beui-muted) 30%, transparent); }
.drp-summary-cell { min-width: 0; }
.drp-summary-label { margin-bottom: 0.25rem !important; font-size: 10px; line-height: 1rem; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; color: var(--beui-muted-foreground); }
.drp-summary-value { font-size: 13px; line-height: 1.25rem; font-weight: 500; font-variant-numeric: tabular-nums; }
.drp-summary-arrow { color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }

.drp-header { display: flex; align-items: center; justify-content: space-between; gap: 0.25rem; margin-bottom: 0.5rem; }
.drp-header-left { display: flex; min-width: 0; align-items: center; gap: 0.125rem; }
.drp-header-right { display: flex; flex-shrink: 0; gap: 0.125rem; }
.drp-text-button { display: inline-flex; align-items: center; gap: 0.375rem; margin: 0; padding: 0.375rem 0.5rem; border: 0; border-radius: 0.5rem; background: transparent; color: inherit; font: inherit; font-size: 13px; line-height: 1.25rem; cursor: pointer; outline: none; transition: color 150ms, background-color 150ms, box-shadow 150ms; }
.drp-month-button { font-weight: 600; }
.drp-year-button { font-weight: 500; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
@media (hover: hover) {
  .drp-text-button:hover:not(:disabled) { background: var(--beui-muted); }
  .drp-year-button:hover:not(:disabled) { color: var(--beui-foreground); }
}
.drp-text-button:disabled { opacity: 0.4; }
.drp-flip { transform: rotate(180deg); }
.drp-icon-button { display: inline-flex; width: 2rem; height: 2rem; flex-shrink: 0; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 0.5rem; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color 150ms, background-color 150ms, box-shadow 150ms; }
@media (hover: hover) { .drp-icon-button:hover:not(:disabled) { background: var(--beui-muted); color: var(--beui-foreground); } }
.drp-icon-button:disabled { pointer-events: none; opacity: 0.3; }
.drp-text-button:focus-visible, .drp-icon-button:focus-visible, .drp-clear:focus-visible, .drp-preset:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }

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

.drp-footer { margin-top: 0.625rem; padding-top: 0.625rem; border-top: 1px solid var(--beui-border); }
.drp-footer-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.drp-selection { font-size: 0.75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.drp-clear { margin: 0; padding: 0.25rem 0.375rem; border: 0; border-radius: 0.375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; cursor: pointer; outline: none; transition: color 150ms, background-color 150ms, box-shadow 150ms; }
@media (hover: hover) { .drp-clear:hover:not(:disabled) { background: var(--beui-muted); color: var(--beui-foreground); } }
.drp-clear:disabled { opacity: 0.3; }
.drp-presets { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.375rem; margin-top: 0.625rem; }
.drp-preset { margin: 0; padding: 0.375rem 0.75rem; border: 0; border-radius: 0.5rem; background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 150ms, background-color 150ms, box-shadow 150ms; }
@media (hover: hover) { .drp-preset:hover:not(:disabled, .drp-preset-on) { background: var(--beui-muted); color: var(--beui-foreground); } }
.drp-preset-on { background: var(--beui-foreground); color: var(--beui-background); }
.drp-preset:disabled { opacity: 0.4; }
</style>
