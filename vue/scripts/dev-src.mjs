// VitePress dev server that serves beui-vue from source (hot reload while porting).
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const vue = fileURLToPath(new URL('../', import.meta.url))
const bin = fileURLToPath(new URL('../node_modules/vitepress/bin/vitepress.js', import.meta.url))
const child = spawn(process.execPath, [bin, 'dev', 'docs', '--host', '127.0.0.1', '--port', process.env.PORT ?? '5173', '--strictPort'], {
  cwd:vue, stdio:'inherit', env:{...process.env, BEUI_SRC:'1'},
})
child.on('exit', code => process.exit(code ?? 0))
