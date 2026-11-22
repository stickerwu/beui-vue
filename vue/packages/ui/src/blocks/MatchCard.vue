<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import {
  MATCH_CARD_HEIGHT,
  MATCH_CARD_WIDTH,
  crestSrc,
  initials,
  isTournamentFinished,
  type TournamentMatch,
  type TournamentSide,
} from './tournament'

/**
 * One fixture card: date/time row, result chip, two team rows with score,
 * shootout score and the winner marker. Laid out at a fixed size so the
 * bracket's computed columns can line up with its connectors.
 */
const props = defineProps<{
  match: TournamentMatch
  /** The bracket's resolved strings: `tbd` and the two full-time chips. */
  labels: { tbd: string, fullTime: string, fullTimePenalties: string }
}>()

// The failed URL, not a boolean: a corrected logo on the same match should be
// tried again rather than stay initials for the life of the card.
const failedSrc = shallowRef<string | null>(null)

const finished = computed(() => isTournamentFinished(props.match))
const decided = computed(() => finished.value && props.match.winner != null)
const shootout = computed(() => props.match.home.penalties != null || props.match.away.penalties != null)
// A per-match `badge` wins, so a draw that isn't football can label its own
// result ("AET", "BO5", "Forfeit") instead of the derived full-time chip.
const badge = computed(() => props.match.badge ?? (finished.value ? (shootout.value ? props.labels.fullTimePenalties : props.labels.fullTime) : null))
const schedule = computed(() => [props.match.date, props.match.time].filter(Boolean).join(', '))

function src(side: TournamentSide) {
  const resolved = crestSrc(side.team)
  return resolved === failedSrc.value ? null : resolved
}
</script>

<template>
  <div class="be-match" :style="{ width: `${MATCH_CARD_WIDTH}px`, height: `${MATCH_CARD_HEIGHT}px` }">
    <!-- A fixed-height header row holds when a match carries no date or badge, so
         a dateless draw's cards don't sit top-heavy inside the fixed height. -->
    <div class="be-match-head">
      <span class="be-match-when">{{ schedule }}</span>
      <span v-if="badge" class="be-match-badge">{{ badge }}</span>
    </div>

    <div class="be-match-rows">
      <div
        v-for="side in (['home', 'away'] as const)"
        :key="side"
        class="be-match-row"
        :class="{ 'is-dim': decided && match.winner !== side }"
      >
        <span class="be-match-crest">
          <img
            v-if="src(match[side])"
            :src="src(match[side])!"
            alt=""
            loading="lazy"
            draggable="false"
            :class="{ 'is-logo': match[side].team?.logo }"
            @error="failedSrc = src(match[side])"
          >
          <span v-else-if="match[side].team" class="be-match-initials">{{ initials(match[side].team.name) }}</span>
          <svg v-else class="be-match-shield" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" fill="currentColor" />
          </svg>
        </span>
        <span class="be-match-name">{{ match[side].team?.name ?? labels.tbd }}</span>
        <span v-if="match[side].score != null" class="be-match-score">{{ match[side].penalties != null ? `${match[side].score} (${match[side].penalties})` : match[side].score }}</span>
        <!-- A fixed marker slot keeps every score right-aligned; the winner's
             triangle fills it, losers reserve it empty. -->
        <span class="be-match-marker">
          <svg v-if="decided && match.winner === side" viewBox="0 0 6 8" aria-hidden="true"><path d="M6 0 0 4 6 8Z" /></svg>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.be-match {
  box-sizing: border-box;
  padding: 1rem;
  border: 1px solid var(--beui-border);
  border-radius: 1rem;
  background: var(--beui-card);
  color: var(--beui-foreground);
}
.be-match-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  height: 1.25rem;
  margin-bottom: .75rem;
}
.be-match-when {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: .875rem;
  line-height: 1.25rem;
  color: var(--beui-muted-foreground);
}
.be-match-badge {
  flex: none;
  padding: 0 .625rem;
  border-radius: 999px;
  background: var(--beui-background);
  font-size: .75rem;
  font-weight: 500;
  line-height: 1.25rem;
  color: var(--beui-muted-foreground);
}
.be-match-rows { display: grid; grid-template-columns: minmax(0, 1fr); gap: .625rem; }
.be-match-row { display: flex; align-items: center; gap: .75rem; }
.be-match-crest {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.25rem;
}
.be-match-crest img { width: 1.75rem; height: 1.25rem; object-fit: cover; border: 1px solid color-mix(in srgb, var(--beui-border) 40%, transparent); border-radius: 4px; }
.be-match-crest img.is-logo { width: 1.25rem; height: 1.25rem; border-color: transparent; object-fit: contain; }
.be-match-initials {
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--beui-foreground) 10%, transparent);
  color: var(--beui-foreground);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}
.be-match-shield { width: 1.25rem; height: 1.25rem; color: color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent); }
.be-match-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1rem;
  font-weight: 500;
}
.be-match-score { flex: none; font-size: 1rem; font-weight: 500; font-variant-numeric: tabular-nums; }
.be-match-row.is-dim .be-match-name,
.be-match-row.is-dim .be-match-score { color: var(--beui-muted-foreground); }
.be-match-marker { display: flex; flex: none; align-items: center; width: .375rem; }
.be-match-marker svg { width: .375rem; height: .5rem; fill: var(--beui-foreground); }
</style>
