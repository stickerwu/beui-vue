<script setup lang="ts">
import { ButtonBase, WalletCard } from 'beui-vue'
import { shallowRef } from 'vue'

const ACCOUNTS = [
  { id: 'main', name: 'Main Wallet', address: '0x8f3Cb1a29e4D7c6F1B2a3E9d0C4b5A6f7D8e9C0b' },
  { id: 'trading', name: 'Trading', address: '0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B' },
  { id: 'cold', name: 'Cold Storage', address: '0x9F8e7D6c5B4a3E2d1C0b9A8f7E6d5C4b3A2e1F0d' },
]
const RECENT_SEARCHES = ['vitalik.eth', '0xA0b8…6EB4', 'Uniswap', 'Send to Trading']

const balance = shallowRef(12480.32)
function simulate() {
  balance.value += (Math.random() > 0.5 ? 1 : -1) * (50 + Math.random() * 400)
}
</script>

<template>
  <div class="wallet-demo">
    <WalletCard :accounts="ACCOUNTS" :balance="balance" :default-change="124.5" :search-recent="RECENT_SEARCHES" has-notifications />
    <ButtonBase variant="ghost" size="sm" @click="simulate">Simulate balance change</ButtonBase>
  </div>
</template>

<style scoped>
.wallet-demo { display: flex; box-sizing: border-box; width: 100%; flex-direction: column; align-items: center; gap: 1rem; padding: 1.5rem; }
</style>
