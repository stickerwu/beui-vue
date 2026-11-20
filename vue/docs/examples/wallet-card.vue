<script setup lang="ts">
import { ref } from 'vue'
import { WalletCard } from 'beui-vue'
const action = ref('')
const accounts = [{id:'main',name:'Main wallet',address:'0x71…c924'},{id:'studio',name:'Studio wallet',address:'0x42…5a12'}]
</script>
<template><div class="be-block-stack"><WalletCard :accounts="accounts" :balance="2480.5" :default-change="48.12" :search-recent="['Design team']" has-notifications @send="action='Send'" @deposit="action='Deposit'" @buy="action='Buy'" @swap="action='Swap'" @notifications="action='Notifications'" @search-submit="action=$event" /><output>{{ action }}</output></div></template>
