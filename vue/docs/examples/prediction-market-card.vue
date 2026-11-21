<script setup lang="ts">
import { ButtonBase, PredictionMarketCard } from 'beui-vue'
import { computed, shallowRef } from 'vue'

// Demo markets use team marks and the Federal Reserve seal, loaded from public hosts.
const markets = [
  {
    id: 'basketball', title: 'Boston Celtics vs. Los Angeles Lakers', category: 'Basketball', status: 'Sunday · 7:30 PM', volume: '$2.4M', live: false,
    image: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', history: [12, 18, 15, 26, 20, 32, 29, 38, 34, 48, 43, 58],
    outcomes: [
      { id: 'boston', label: 'Celtics', probability: 0.51, next: 0.56, color: '#34d399', image: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png' },
      { id: 'lakers', label: 'Lakers', probability: 0.49, next: 0.44, color: '#fbbf24', image: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png' },
    ],
  },
  {
    id: 'baseball', title: 'Tampa Bay Rays vs. Atlanta Braves', category: 'MLB', status: 'Mid 6th', volume: '$458K', live: true,
    image: 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png', history: [8, 12, 10, 19, 15, 28, 23, 34, 30, 40, 36, 45],
    outcomes: [
      { id: 'rays', label: 'Rays', probability: 0.46, next: 0.52, color: '#60a5fa', image: 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png' },
      { id: 'braves', label: 'Braves', probability: 0.54, next: 0.48, color: '#fb7185', image: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png' },
    ],
  },
  {
    id: 'rates', title: 'Where will interest rates land by the end of the year?', category: 'Economics', status: 'Dec 31', volume: '$347K', live: false,
    image: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Seal_of_the_United_States_Federal_Reserve_Board.svg', history: [15, 11, 17, 14, 24, 21, 30, 25, 32, 29, 39, 42],
    outcomes: [
      { id: 'below', label: 'Below 3.5%', probability: 0.68, next: 0.72, color: '#34d399', image: null },
      { id: 'above', label: 'Above 4.0%', probability: 0.23, next: 0.18, color: '#60a5fa', image: null },
    ],
  },
]

const updated = shallowRef(false)
const saved = shallowRef<Record<string, boolean>>({})
const shown = computed(() => markets.map(market => ({
  ...market,
  outcomes: market.outcomes.map(outcome => ({ ...outcome, probability: updated.value ? outcome.next : outcome.probability })),
})))
</script>

<template>
  <div class="market-cards">
    <div class="market-cards-head">
      <div>
        <p class="market-cards-title">On the radar</p>
        <p class="market-cards-sub">Demo markets · simulated prices</p>
      </div>
      <ButtonBase variant="secondary" size="sm" class="market-cards-update" @click="updated = !updated">Update odds</ButtonBase>
    </div>
    <div class="market-cards-grid">
      <PredictionMarketCard
        v-for="market in shown" :key="market.id"
        :title="market.title" :category="market.category" :status="market.status" :live="market.live" :volume="market.volume" :volume-history="market.history"
        :bookmarked="saved[market.id] ?? false" :outcomes="market.outcomes"
        @bookmark-change="value => saved = { ...saved, [market.id]: value }"
      >
        <template #icon><img :src="market.image" alt="" width="48" height="48" :class="['market-cards-img', { 'is-seal': market.id === 'rates' }]"></template>
        <template #outcome-icon="{ outcome }"><img v-if="(outcome as typeof market.outcomes[number]).image" :src="(outcome as typeof market.outcomes[number]).image!" alt="" width="32" height="32" class="market-cards-logo"></template>
      </PredictionMarketCard>
    </div>
  </div>
</template>

<style scoped>
.market-cards { container-type: inline-size; box-sizing: border-box; width: 100%; max-width: 48rem; }
.market-cards > * + * { margin-top: 1.25rem; }
.market-cards-head { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.market-cards-head p { margin: 0; }
.market-cards-title { font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.market-cards-sub { margin-top: .25rem !important; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.market-cards-update { flex: none; }
.market-cards-grid { display: grid; grid-auto-rows: 1fr; gap: 1rem; }
@container (min-width: 640px) { .market-cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.market-cards-img { display: block; width: 100%; height: 100%; box-sizing: border-box; padding: .25rem; object-fit: contain; }
.market-cards-img.is-seal { background: #fff; }
.market-cards-logo { display: block; width: 100%; height: 100%; box-sizing: border-box; padding: .125rem; object-fit: contain; }
</style>
