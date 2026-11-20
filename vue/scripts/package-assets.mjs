import { copyFile } from 'node:fs/promises'

await copyFile(new URL('../../LICENSE', import.meta.url), new URL('../packages/ui/LICENSE', import.meta.url))
await copyFile(new URL('../packages/ui/src/theme.css', import.meta.url), new URL('../packages/ui/dist/theme.css', import.meta.url))
