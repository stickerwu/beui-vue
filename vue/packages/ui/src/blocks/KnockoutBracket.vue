<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef } from 'vue'
import { easeOut } from '../core/motion'
import MatchCard from './MatchCard.vue'
import {
  MATCH_CARD_HEIGHT,
  MATCH_CARD_WIDTH,
  isTournamentFinished,
  knockoutBracketMessages,
  mergeTournamentMessages,
  tournamentTranslate,
  type TournamentMatch,
  type TournamentRound,
  type TournamentSide,
} from './tournament'

const props = withDefaults(defineProps<{
  /**
   * The whole draw, ordered widest round first. Any single-elimination
   * tournament fits: each round holds half the matches of the one before it
   * (16 → 8 → 4 → 2 → 1) and `rounds[r].matches[k]` is fed by matches `2k` and
   * `2k + 1` of the round before it. Two rounds are enough.
   */
  rounds: TournamentRound[]
  /** Round shown as the leftmost column on mount. Defaults to 1, clamped to the valid range. */
  initialRound?: number
  /** Third place play-off, rendered under the bracket instead of inside it. */
  thirdPlace?: TournamentMatch
  /** Heading over `thirdPlace`. Defaults to the `thirdPlace` message ("Third place play-off"). */
  thirdPlaceLabel?: string
  /** Override any built-in string. */
  labels?: Partial<typeof knockoutBracketMessages>
  /** BCP 47 tag used to join the visible round names in the live status. Defaults to `en`. */
  locale?: string
  className?: string
}>(), { initialRound: 1 })

const text = computed(() => mergeTournamentMessages(knockoutBracketMessages, props.labels))
const t = computed(() => tournamentTranslate(text.value))
const thirdPlaceLabel = computed(() => props.thirdPlaceLabel ?? t.value('thirdPlace'))

const reduce = useReducedMotion()

// Card geometry drives the whole computed layout — every later match sits at
// the exact vertical midpoint of its two feeders, so pairs line up with
// connectors. Keep CARD_H in sync with the card's internal spacing.
const CARD_W = MATCH_CARD_WIDTH
const CARD_H = MATCH_CARD_HEIGHT
// Pocket (20) + stem (20) — matches the CSS `]` connector geometry.
const GAP_X = 40
const GAP_Y = 20
const COL_W = CARD_W + GAP_X
const ROW = CARD_H + GAP_Y
const VISIBLE_COLS = 3
const CONNECTOR_POCKET = 20
const CONNECTOR_STEM = GAP_X - CONNECTOR_POCKET
// Tall enough for 44px chevron hit areas without clipping the focus ring.
const HEADER_H = 44
// Breathing room baked into the computed layout so the base column isn't flush
// against the clip edge and connector nubs aren't shaved off.
const PAD_X = 8
const PAD_Y = 12

// Firmer than `layoutSpring` so the many cards, connectors and stage height
// glide as one piece; damping just over critical (~1.05) settles with no bounce
// and no lazy overdamped tail. Component-specific, so kept local.
const REFLOW = {
  type: 'spring',
  stiffness: 260,
  damping: 32,
  mass: 0.9,
} as const

// Opacity cross-fades a touch ahead of the position spring so columns don't
// ghost while sliding.
const REFLOW_OPACITY = {
  duration: 0.28,
  ease: easeOut,
} as const

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

// Column x-offset and window test — shared by the render pass and the computed
// layout so the two can't drift.
const colX = (r: number, page: number) => PAD_X + (r - page) * COL_W
const isInWindow = (r: number, page: number, visibleCols: number) =>
  r >= page && r < page + visibleCols

const visibleCols = computed(() => Math.min(VISIBLE_COLS, props.rounds.length))
// The last page shows the final two rounds (semi-finals + final), not a full
// window — so paging continues past the QF/SF/Final view down to SF + Final.
const maxPage = computed(() => Math.max(0, props.rounds.length - Math.min(2, props.rounds.length)))
const rawPage = shallowRef(props.initialRound)
// Clamped in render: `rounds` can shrink after mount.
const page = computed(() => clamp(rawPage.value, 0, maxPage.value))

function step(delta: number) {
  const current = clamp(rawPage.value, 0, maxPage.value)
  rawPage.value = clamp(current + delta, 0, maxPage.value)
}

// Shared reflow — cards, connectors, headers and stage height page together.
// Height springs with the same token (layout morph is the product feel for
// collapsing rounds); opacity uses a short ease so fades don't lag the glide.
const transition = computed(() => (reduce.value ? { duration: 0 } : { ...REFLOW, opacity: REFLOW_OPACITY }))

// "en" without a provider so server and client join the names the same way.
const pageStatus = computed(() => {
  const names = props.rounds.slice(page.value, page.value + visibleCols.value).map(round => round.name)
  return t.value('showing', { rounds: new Intl.ListFormat(props.locale ?? 'en').format(names) })
})

// Layout is computed, not scrolled. The leftmost visible round (`page`) is the
// base and stacks at a fixed rhythm; every later match centers on its feeders,
// and behind rounds spread out (below). Cards and connectors derive from one
// pass and page together under the shared transition.
const layout = computed(() => {
  const rounds = props.rounds
  const pageIndex = page.value
  const visible = visibleCols.value
  const centers: number[][] = new Array(rounds.length)
  const base = rounds[pageIndex]
  if (!base) return { centers, containerHeight: 0, connectors: [] as BracketConnector[] }
  centers[pageIndex] = base.matches.map((_, i) => PAD_Y + i * ROW + CARD_H / 2)
  for (let r = pageIndex + 1; r < rounds.length; r++) {
    const feeders = centers[r - 1]!
    const row: number[] = []
    for (let k = 0; k < rounds[r]!.matches.length; k++) {
      const top = feeders[2 * k]
      if (top == null) {
        // A round with more matches than its feeders allow (an odd draw, a bye
        // left out) stacks a full row under the last card placed in this round —
        // a fixed rhythm from the top can land on top of a midpoint.
        const prev = row[k - 1]
        row[k] = prev == null ? PAD_Y + CARD_H / 2 : prev + ROW
      } else {
        row[k] = (top + (feeders[2 * k + 1] ?? top)) / 2
      }
    }
    centers[r] = row
  }
  // Behind rounds keep their natural spread (spacing halves each step out, each
  // match straddling its parent) instead of collapsing, so paging back slides a
  // formed column in from the left just as paging forward does.
  for (let r = pageIndex - 1; r >= 0; r--) {
    const half = ROW / 2 ** (pageIndex - r + 1)
    centers[r] = rounds[r]!.matches.map((_, i) => {
      const parent = centers[r + 1]![Math.floor(i / 2)] ?? PAD_Y
      return parent + (i % 2 === 0 ? -half : half)
    })
  }

  const list: BracketConnector[] = []
  for (let r = 1; r < rounds.length; r++) {
    const feederRight = colX(r - 1, pageIndex) + CARD_W
    const visibleConnector = isInWindow(r, pageIndex, visible) && isInWindow(r - 1, pageIndex, visible)
    rounds[r]!.matches.forEach((_, k) => {
      const yTop = centers[r - 1]?.[2 * k] ?? centers[r]?.[k] ?? PAD_Y
      const yBot = centers[r - 1]?.[2 * k + 1] ?? yTop
      list.push({
        key: `${r}-${k}`,
        x: feederRight,
        y: yTop,
        height: Math.max(0, yBot - yTop),
        visible: visibleConnector,
      })
    })
  }

  // Measured, not derived from the base count: a fallback-stacked round can run
  // past the base column, and the stage clips its overflow. Seeded with one
  // card's center so an empty round yields a real height rather than -Infinity.
  const lowest = Math.max(
    PAD_Y + CARD_H / 2,
    ...centers.slice(pageIndex, pageIndex + visible).flatMap(row => row ?? []),
  )
  return {
    centers,
    containerHeight: lowest + CARD_H / 2 + PAD_Y,
    connectors: list,
  }
})

const containerWidth = computed(() => visibleCols.value * CARD_W + (visibleCols.value - 1) * GAP_X + 2 * PAD_X)

type BracketConnector = {
  key: string
  /** Feeder card right edge — left of the `]` pocket. */
  x: number
  /** Top feeder center Y. */
  y: number
  /** Distance between the two feeder centers. */
  height: number
  visible: boolean
}

// CSS `]` pocket + stem: border-y/border-r + a hairline to the child.
// Transform/opacity only — no SVG path morph, so paging stays flicker-free.
function connectorGeo(connector: BracketConnector) {
  if (connector.visible) return transition.value
  return { ...transition.value, x: { duration: 0 }, y: { duration: 0 }, height: { duration: 0 } }
}

/* ---- accessible names ---------------------------------------------------- */

function sideLabel(side: TournamentSide) {
  const team = side.team?.name ?? t.value('tbd')
  if (side.score == null) return team
  return side.penalties != null
    ? t.value('sideScorePenalties', { team, score: side.score, penalties: side.penalties })
    : t.value('sideScore', { team, score: side.score })
}

function matchLabel(roundName: string, match: TournamentMatch) {
  const finished = isTournamentFinished(match)
  const sides = t.value(finished ? 'matchResult' : 'matchVersus', {
    round: roundName,
    home: sideLabel(match.home),
    away: sideLabel(match.away),
  })
  // Same pair the card's header row shows, so a time-only match isn't announced
  // without its kick-off.
  const schedule = finished ? [] : [match.date, match.time].filter(Boolean)
  const when = schedule.length ? `, ${schedule.join(', ')}` : ''
  const winnerName = match.winner ? match[match.winner].team?.name : undefined
  const outcome = winnerName ? `, ${t.value('winner', { team: winnerName })}` : ''
  return `${sides}${when}${outcome}`
}
</script>

<template>
  <div v-if="rounds.length > 0" class="be-bracket">
    <section class="be-bracket-section" :aria-label="text.label" :style="{ width: `${containerWidth}px` }">
      <div class="be-sr" aria-live="polite">{{ pageStatus }}</div>

      <!-- Only the gliding round titles are clipped (they enter/exit at the
           canvas edge); the chevron buttons sit outside that clip. -->
      <div class="be-bracket-header" :style="{ height: `${HEADER_H}px` }">
        <div class="be-bracket-titles">
          <motion.div
            v-for="(round, r) in rounds"
            :key="round.name"
            :aria-hidden="isInWindow(r, page, visibleCols) ? undefined : true"
            :initial="false"
            :animate="{ x: colX(r, page), opacity: isInWindow(r, page, visibleCols) ? 1 : 0 }"
            :transition="transition"
            class="be-bracket-title"
            :style="{ width: `${CARD_W}px` }"
          >{{ round.name }}</motion.div>
        </div>
        <button
          v-if="page > 0"
          type="button"
          class="be-bracket-nav is-previous"
          :aria-label="text.previousRound"
          :style="{ left: `${PAD_X}px` }"
          @click="step(-1)"
        >
          <span class="be-bracket-nav-face">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </span>
        </button>
        <button
          v-if="page < maxPage"
          type="button"
          class="be-bracket-nav is-next"
          :aria-label="text.nextRound"
          :style="{ right: `${PAD_X}px` }"
          @click="step(1)"
        >
          <span class="be-bracket-nav-face">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </span>
        </button>
      </div>

      <!-- Stage height springs with the reflow token so the bracket collapses as
           one piece with the cards — the layout property is intentional here. -->
      <motion.div
        class="be-bracket-stage"
        :initial="false"
        :animate="{ height: layout.containerHeight }"
        :transition="transition"
        :style="{ width: `${containerWidth}px` }"
      >
        <motion.div
          v-for="connector in layout.connectors"
          :key="connector.key"
          aria-hidden="true"
          :initial="false"
          :animate="{ x: connector.x, y: connector.y, height: connector.height, opacity: connector.visible ? 1 : 0 }"
          :transition="connectorGeo(connector)"
          class="be-bracket-connector"
          :style="{ width: `${CONNECTOR_POCKET}px`, willChange: 'transform' }"
        >
          <span class="be-bracket-stem" :style="{ width: `${CONNECTOR_STEM}px` }" />
        </motion.div>

        <ul
          v-for="(round, r) in rounds"
          :key="round.name"
          :aria-label="round.name"
          :aria-hidden="isInWindow(r, page, visibleCols) ? undefined : true"
          class="be-bracket-round"
        >
          <motion.li
            v-for="(match, k) in round.matches"
            :key="match.id"
            :aria-label="matchLabel(round.name, match)"
            :initial="false"
            :animate="{
              x: colX(r, page),
              y: (layout.centers[r]?.[k] ?? 0) - CARD_H / 2,
              opacity: isInWindow(r, page, visibleCols) ? 1 : 0,
            }"
            :transition="transition"
            class="be-bracket-card"
            :style="{ willChange: 'transform' }"
          >
            <MatchCard :match="match" :labels="text" />
          </motion.li>
        </ul>
      </motion.div>

      <!-- Outside the bracket stage — it feeds off the semi-finals rather than
           into the final, so it gets its own rule instead of a column. -->
      <div v-if="thirdPlace" class="be-bracket-third" :style="{ paddingLeft: `${PAD_X}px` }">
        <ul :aria-label="thirdPlaceLabel" class="be-bracket-round">
          <li :aria-label="matchLabel(thirdPlaceLabel, thirdPlace)">
            <p class="be-bracket-third-label">{{ thirdPlaceLabel }}</p>
            <MatchCard :match="thirdPlace" :labels="text" />
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.be-bracket {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  color: var(--beui-foreground);
  font-size: .875rem;
  line-height: 1.5;
}
.be-bracket-section { position: relative; margin-inline: auto; }
.be-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border-width: 0; }

.be-bracket-header { position: relative; }
.be-bracket-titles { position: absolute; inset: 0; overflow: hidden; }
.be-bracket-title {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: .875rem;
  line-height: 1.25rem;
  font-weight: 700;
  color: var(--beui-foreground);
}

.be-bracket-nav {
  position: absolute;
  top: 50%;
  z-index: 10;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  transform: translateY(-50%);
  outline: none;
  cursor: pointer;
}
.be-bracket-nav-face {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  color: var(--beui-muted-foreground);
  transition: color .15s ease-out, background-color .15s ease-out;
}
.be-bracket-nav:hover .be-bracket-nav-face { background: color-mix(in srgb, var(--beui-foreground) 10%, transparent); color: var(--beui-foreground); }
.be-bracket-nav:focus-visible .be-bracket-nav-face { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-bracket-nav svg { width: 1.25rem; height: 1.25rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.be-bracket-stage { position: relative; overflow: hidden; }
.be-bracket-round { margin: 0; padding: 0; list-style: none; }
.be-bracket-card { position: absolute; left: 0; top: 0; }

.be-bracket-connector {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  pointer-events: none;
  border: 0 solid var(--beui-border);
  border-width: 1px 1px 1px 0;
  border-top-right-radius: .75rem;
  border-bottom-right-radius: .75rem;
}
.be-bracket-stem {
  position: absolute;
  left: 100%;
  top: 50%;
  display: block;
  height: 1px;
  background: var(--beui-border);
}

.be-bracket-third {
  margin-top: 2rem;
  border-top: 1px solid var(--beui-border);
  padding-top: 1.5rem;
}
.be-bracket-third-label {
  margin: 0 0 .5rem;
  font-size: .875rem;
  line-height: 1.25rem;
  color: color-mix(in srgb, var(--beui-muted-foreground) 70%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .be-bracket-nav-face { transition: none; }
}
</style>
