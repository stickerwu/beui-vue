import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '@/components/motion/button/base'
import { Tabs, TabsList, TabsTrigger } from '@/components/motion/tabs'
import { BeforeAfterSlider } from '@/components/motion/before-after-slider'
import { AnimatedToastStack } from '@/components/motion/animated-toast-stack'
import { ShaderBackground } from '@/components/motion/shader-background'
import { LineChart } from '@/components/charts/line-chart'
import './reference.css'
import { categories, series, tabs, toasts } from './data'

function Scene({slug}: {slug:string}) {
  const [changed, setChanged] = useState(false)
  useEffect(() => { document.body.dataset.ready = 'true' }, [])
  switch (slug) {
    case 'button-base': return <Button>Continue</Button>
    case 'tabs': return <Tabs defaultValue="Overview"><TabsList>{tabs.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}</TabsList></Tabs>
    case 'before-after-slider': return <div className="sample"><BeforeAfterSlider hint={false} before={<div className="parity-before"/>} after={<div className="parity-after"/>}/></div>
    case 'animated-toast-stack': return <div className="sample"><button className="scene-action" onClick={() => setChanged(true)}>Notify</button><AnimatedToastStack toasts={changed ? [...toasts,{id:'two',title:'Export ready',status:'success',duration:0}] : toasts} placement="static" /></div>
    case 'line-chart': return <div className="sample"><LineChart categories={categories} series={series}/></div>
    case 'shader-background': return <div><button className="scene-action" onClick={() => setChanged(true)}>Advance shader</button><ShaderBackground variant="mesh-gradient" speed={0} frame={changed ? 800 : 0} width={480} height={280}/></div>
    default: throw Error(`Unknown fixture: ${slug}`)
  }
}
export function mount(slug:string) { createRoot(document.querySelector('#stage')!).render(<Scene slug={slug}/>) }
