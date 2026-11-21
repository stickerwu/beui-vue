<template>
  <!-- The parachute that opens at a cash out: a scalloped canopy, three lines and the player. -->
  <g class="crash-chute">
    <path d="M-9,0Q-9,-11 0,-11Q9,-11 9,0Q6,-3 3,0Q0,-3 -3,0Q-6,-3 -9,0Z" fill="currentColor" />
    <path d="M-9,0L0,10M0,0L0,10M9,0L0,10" stroke="currentColor" stroke-width="0.75" opacity="0.6" fill="none" />
    <circle cy="11.5" r="2" fill="currentColor" />
  </g>
</template>

<style scoped>
.crash-chute { color: var(--beui-primary); }
</style>
