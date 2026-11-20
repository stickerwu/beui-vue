import type {
  ColorPanelsParams, DitheringParams, DotGridParams, DotOrbitParams, GodRaysParams,
  GrainGradientParams, MeshGradientParams, MetaballsParams, NeuroNoiseParams,
  PerlinNoiseParams, PulsingBorderParams, SimplexNoiseParams, SmokeRingParams,
  SpiralParams, StaticMeshGradientParams, StaticRadialGradientParams, SwirlParams,
  VoronoiParams, WarpParams, WaterParams, WavesParams,
} from '@paper-design/shaders'

export interface ShaderParameters {
  'mesh-gradient': MeshGradientParams
  'grain-gradient': GrainGradientParams
  'dot-grid': DotGridParams
  'dot-orbit': DotOrbitParams
  warp: WarpParams
  waves: WavesParams
  water: WaterParams
  voronoi: VoronoiParams
  swirl: SwirlParams
  'smoke-ring': SmokeRingParams
  'static-radial-gradient': StaticRadialGradientParams
  'neuro-noise': NeuroNoiseParams
  metaballs: MetaballsParams
  'god-rays': GodRaysParams
  spiral: SpiralParams
  dithering: DitheringParams
  'pulsing-border': PulsingBorderParams
  'color-panels': ColorPanelsParams
  'static-mesh-gradient': StaticMeshGradientParams
  'simplex-noise': SimplexNoiseParams
  'perlin-noise': PerlinNoiseParams
}

export type ShaderBackgroundVariant = keyof ShaderParameters

export const SHADER_BACKGROUND_VARIANTS = [
  'mesh-gradient', 'grain-gradient', 'dot-grid', 'dot-orbit', 'warp', 'waves', 'water',
  'voronoi', 'swirl', 'smoke-ring', 'static-radial-gradient', 'neuro-noise', 'metaballs',
  'god-rays', 'spiral', 'dithering', 'pulsing-border', 'color-panels', 'static-mesh-gradient',
  'simplex-noise', 'perlin-noise',
] as const satisfies readonly ShaderBackgroundVariant[]

export interface ShaderBackgroundProps<Variant extends ShaderBackgroundVariant = ShaderBackgroundVariant> {
  variant: Variant
  params?: ShaderParameters[Variant]
  speed?: number
  frame?: number
  width?: number | string
  height?: number | string
  minPixelRatio?: number
  maxPixelCount?: number
  webGlContextAttributes?: WebGLContextAttributes
  colors?: readonly string[]
  colorBack?: string
  colorFront?: string
  colorMid?: string
  colorFill?: string
  colorStroke?: string
  colorHighlight?: string
  colorBloom?: string
  colorGlow?: string
  colorGap?: string
  fit?: 'none' | 'contain' | 'cover'
  scale?: number
  rotation?: number
  originX?: number
  originY?: number
  offsetX?: number
  offsetY?: number
  worldWidth?: number
  worldHeight?: number
  shape?: string | number
  size?: number
  distortion?: number
  swirl?: number
  softness?: number
  intensity?: number
  noise?: number
  grainMixer?: number
  grainOverlay?: number
}
