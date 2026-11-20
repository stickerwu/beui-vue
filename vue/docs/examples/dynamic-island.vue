<script setup lang="ts">
import { ref } from 'vue'
import { DynamicIsland, DynamicIslandView } from 'beui-vue'
const view = ref<string|null>(null)
</script>
<template><div class="be-block-stack"><DynamicIsland :view="view" compact="●"><DynamicIslandView id="music">♫ &nbsp; Midnight Radio</DynamicIslandView><DynamicIslandView id="timer">◴ &nbsp; Timer · 05:00</DynamicIslandView></DynamicIsland><div class="be-block-row"><button class="be-block-button" @click="view=null">Compact</button><button class="be-block-button" @click="view='music'">Music</button><button class="be-block-button" @click="view='timer'">Timer</button></div></div></template>
