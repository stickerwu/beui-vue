<script setup lang="ts">
import { ColorSelector, ColorSelectorItem, ColorSelectorLabel, ColorSelectorList } from 'beui-vue'
</script>

<template>
  <ColorSelector default-value="blue" name="accent">
    <ColorSelectorLabel>Accent</ColorSelectorLabel>
    <ColorSelectorList>
      <ColorSelectorItem value="blue" color="#3478f6" label="Blue" />
      <ColorSelectorItem value="purple" color="#9270e8" label="Purple" />
      <ColorSelectorItem value="pink" color="#e66aa4" label="Pink" />
      <ColorSelectorItem value="red" color="#e55656" label="Red" />
      <ColorSelectorItem value="orange" color="#ed9141" label="Orange" />
      <ColorSelectorItem value="amber" color="#e5b63c" label="Amber" />
      <ColorSelectorItem value="green" color="#65a65a" label="Green" />
      <ColorSelectorItem value="teal" color="#169d83" label="Teal" />
    </ColorSelectorList>
  </ColorSelector>
</template>
