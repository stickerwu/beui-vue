import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
    rollupOptions: {
      external: ['vue', 'motion-v', '@paper-design/shaders', '@vueuse/core', 'lenis'],
      output: { assetFileNames: 'style[extname]' },
    },
  },
})
