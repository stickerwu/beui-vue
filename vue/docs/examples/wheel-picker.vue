<script setup lang="ts">
import { ref } from 'vue'
import { WheelPicker } from 'beui-vue'
const city = ref('上海')
</script>
<template><WheelPicker v-model="city" label="城市" :options="['北京','上海','广州','深圳','杭州','成都']"/><output>{{ city }}</output></template>
