import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { previews } from '@/components/previews'
import './reference.css'

export function mount(key:string) {
  const Preview = previews[key]
  if (!Preview) throw Error(`Unregistered upstream preview ${key}`)
  const stage = document.querySelector<HTMLElement>('#stage')!
  const ready = new MutationObserver(() => {
    if (stage.querySelector(':scope > :not(script,style,template)')) {
      document.body.dataset.ready = 'true'
      ready.disconnect()
    }
  })
  ready.observe(stage, {subtree:true, childList:true})
  const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  createRoot(stage).render(<ThemeProvider attribute="class" forcedTheme={theme}><Preview/></ThemeProvider>)
}
