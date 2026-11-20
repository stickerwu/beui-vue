<script setup lang="ts">
import { computed, ref } from 'vue'
import MatchCard from './MatchCard.vue'
import type { TournamentMatch, TournamentRound } from './tournament'
const props = withDefaults(defineProps<{
  rounds: TournamentRound[]
  initialRound?: number
  thirdPlace?: TournamentMatch
  thirdPlaceLabel?: string
  labels?: Record<string, string>
}>(), { initialRound: 1 })
const first = ref(props.initialRound)
const last = computed(() => Math.max(0, props.rounds.length - 2))
const index = computed(() => Math.max(0, Math.min(first.value, last.value)))
const columns = computed(() => props.rounds.slice(index.value, index.value + 2))
</script>

<template>
  <section class="be-block be-block-stack" :aria-label="labels?.label ?? 'Tournament bracket'">
    <nav class="be-block-row">
      <button type="button" class="be-block-button" :disabled="index === 0" :aria-label="labels?.previousRound ?? 'Previous round'" @click="first = index - 1">‹</button>
      <strong aria-live="polite">{{ columns.map(round => round.name).join(' → ') }}</strong>
      <button type="button" class="be-block-button be-block-end" :disabled="index === last" :aria-label="labels?.nextRound ?? 'Next round'" @click="first = index + 1">›</button>
    </nav>
    <div class="bracket-columns">
      <div v-for="(round, column) in columns" :key="round.name" class="bracket-column">
        <div v-for="match in round.matches" :key="match.id" class="match" :class="{ feeder: !column && columns.length > 1, receiver: column }">
          <MatchCard :match="match" :tbd="labels?.tbd ?? 'TBD'" />
        </div>
      </div>
    </div>
    <template v-if="thirdPlace"><strong>{{ thirdPlaceLabel ?? labels?.thirdPlace ?? 'Third place play-off' }}</strong><MatchCard :match="thirdPlace" :tbd="labels?.tbd ?? 'TBD'" /></template>
  </section>
</template>

<style scoped>
.bracket-columns { display:flex; gap:1.5rem; overflow:auto; }
.bracket-column { flex:1; display:grid; grid-auto-rows:1fr; }
.match { position:relative; display:grid; align-content:center; padding:.4rem 0; }
.feeder::after,.receiver::before { content:''; position:absolute; width:.75rem; border-color:var(--beui-border); border-style:solid; }
.feeder::after { left:100%; top:50%; height:50%; border-width:1px 1px 0 0; }
.feeder:nth-child(even)::after { top:0; border-width:0 1px 1px 0; }
.receiver::before { right:100%; top:50%; border-width:1px 0 0; }
</style>
