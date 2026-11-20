<script setup lang="ts">
import { crest, score, type TournamentMatch } from './tournament'
defineProps<{ match: TournamentMatch, tbd: string }>()
</script>

<template>
  <article class="be-block-panel match-card">
    <header v-if="match.date || match.time || match.winner || match.badge" class="be-block-row be-block-muted">
      <span>{{ [match.date, match.time].filter(Boolean).join(' · ') }}</span>
      <span class="be-block-end">{{ match.badge ?? (match.winner ? (match.home.penalties != null ? 'FT (P)' : 'FT') : '') }}</span>
    </header>
    <div v-for="side in (['home','away'] as const)" :key="side" class="be-block-row" :class="{ winner: match.winner === side }">
      <img v-if="crest(match[side].team)" :src="crest(match[side].team)" alt="">
      <span>{{ match[side].team?.name ?? tbd }}</span>
      <span class="be-block-end">{{ score(match[side]) }}</span>
    </div>
  </article>
</template>

<style scoped>
.match-card { display:grid; gap:.25rem; padding:.55rem .8rem; min-width:8rem; border-radius:.65rem; }
img { width:1.1rem; height:1.1rem; object-fit:contain; }
.winner { font-weight:700; }
</style>
