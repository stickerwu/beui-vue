<script setup lang="ts">
import { ref } from 'vue'
import { ButtonBase, MorphingModal } from 'beui-vue'
const view = ref<string|null>(null)
</script>
<template>
  <ButtonBase @click="view='options'">Open wallet options</ButtonBase>
  <MorphingModal v-model:view-id="view" label="Wallet options" v-slot="{ close }">
    <section v-if="view==='options'"><h3>Wallet options</h3><button @click="view='private-key'">Private key</button><button @click="view='recovery'">Recovery phrase</button><button @click="close">Close</button></section>
    <section v-else><h3>{{ view==='private-key' ? 'Private key' : 'Recovery phrase' }}</h3><p>Manage your wallet backup settings.</p><button @click="view='options'">Back to options</button></section>
  </MorphingModal>
</template>
<style scoped>section { display:grid; gap:.55rem; } button { text-align:left; padding:.65rem; border-radius:.55rem; border:1px solid var(--beui-border); color:inherit; background:var(--beui-muted); cursor:pointer; }</style>
