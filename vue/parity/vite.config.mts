import tailwind from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const repo = fileURLToPath(new URL('../../', import.meta.url))
export default {
  root: fileURLToPath(new URL('./', import.meta.url)),
  cacheDir: fileURLToPath(new URL('../.artifacts/parity-vite', import.meta.url)),
  plugins: [tailwind(), react()],
  define: { __VUE_OPTIONS_API__: true, __VUE_PROD_DEVTOOLS__: false, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: true },
  resolve: {alias: {'@':repo}},
  server: {host:'127.0.0.1', port:4185, strictPort:true, fs:{allow:[repo]}},
}
