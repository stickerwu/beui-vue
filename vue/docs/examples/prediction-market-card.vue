<script setup lang="ts">
import { ref } from 'vue'
import { PredictionMarketCard } from 'beui-vue'
const selected = ref('')
const outcomes = [{id:'north',label:'North',probability:.62,color:'#39896e'},{id:'south',label:'South',probability:.38,color:'#bb6438'}]
</script>
<template><div class="be-block-stack"><PredictionMarketCard title="Which team wins the final?" category="Championship" volume="$24,700" :volume-history="[2,4,3,5,4,6,8]" :outcomes="outcomes" @outcome-click="selected=`${$event.outcomeId} · ${$event.side}`" /><output>{{ selected }}</output></div></template>
