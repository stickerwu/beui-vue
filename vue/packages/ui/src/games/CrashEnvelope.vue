<template>
  <!-- The envelope, centred on the origin: a teardrop with a lighter middle gore and a throat. -->
  <g>
    <path d="M0,-26C16,-26 26,-14 26,-2C26,12 12,20 7,28L-7,28C-12,20 -26,12 -26,-2C-26,-14 -16,-26 0,-26Z" fill="currentColor" />
    <path d="M0,-26C10,-12 10,14 4,28L-4,28C-10,14 -10,-12 0,-26Z" class="gore" />
    <rect x="-6" y="28" width="12" height="3" rx="1" fill="currentColor" opacity="0.7" />
  </g>
</template>

<style scoped>
.gore { fill: color-mix(in oklab, var(--beui-card) 25%, transparent); }
</style>
