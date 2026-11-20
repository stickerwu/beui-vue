import {
  ShaderMount, defaultObjectSizing, defaultPatternSizing, ShaderFitOptions, DotGridShapes,
  WarpPatterns, DitheringShapes, DitheringTypes, GrainGradientShapes, PulsingBorderAspectRatios,
  getShaderColorFromString, getShaderNoiseTexture, emptyPixel, type ShaderMountUniforms,
  meshGradientFragmentShader, grainGradientFragmentShader, dotGridFragmentShader,
  dotOrbitFragmentShader, warpFragmentShader, wavesFragmentShader, waterFragmentShader,
  voronoiFragmentShader, swirlFragmentShader, smokeRingFragmentShader,
  staticRadialGradientFragmentShader, neuroNoiseFragmentShader, metaballsFragmentShader,
  godRaysFragmentShader, spiralFragmentShader, ditheringFragmentShader, pulsingBorderFragmentShader,
  colorPanelsFragmentShader, staticMeshGradientFragmentShader, simplexNoiseFragmentShader, perlinNoiseFragmentShader,
} from '@paper-design/shaders'
import { presets } from './shader-presets'
import type { ShaderBackgroundVariant } from './shader-types'

export { ShaderMount }

export const fragments = {
  'mesh-gradient': meshGradientFragmentShader, 'grain-gradient': grainGradientFragmentShader,
  'dot-grid': dotGridFragmentShader, 'dot-orbit': dotOrbitFragmentShader, warp: warpFragmentShader,
  waves: wavesFragmentShader, water: waterFragmentShader, voronoi: voronoiFragmentShader,
  swirl: swirlFragmentShader, 'smoke-ring': smokeRingFragmentShader, 'static-radial-gradient': staticRadialGradientFragmentShader,
  'neuro-noise': neuroNoiseFragmentShader, metaballs: metaballsFragmentShader, 'god-rays': godRaysFragmentShader,
  spiral: spiralFragmentShader, dithering: ditheringFragmentShader, 'pulsing-border': pulsingBorderFragmentShader,
  'color-panels': colorPanelsFragmentShader, 'static-mesh-gradient': staticMeshGradientFragmentShader,
  'simplex-noise': simplexNoiseFragmentShader, 'perlin-noise': perlinNoiseFragmentShader,
} satisfies Record<ShaderBackgroundVariant, string>

const shapeOptions: Partial<Record<ShaderBackgroundVariant, Record<string, number>>> = {
  'dot-grid': DotGridShapes, warp: WarpPatterns, dithering: DitheringShapes, 'grain-gradient': GrainGradientShapes,
}

async function imageUniform(source: unknown) {
  const image = source instanceof HTMLImageElement ? source : new Image()
  if (typeof source === 'string') {
    image.crossOrigin = 'anonymous'
    image.src = source || emptyPixel
  }
  if (!image.complete || !image.naturalWidth) await image.decode()
  return image
}

export async function uniformsFor(variant: ShaderBackgroundVariant, options: Record<string, unknown>) {
  const preset = presets[variant]
  const defaults = { ...(preset.pattern ? defaultPatternSizing : defaultObjectSizing), ...preset.defaults }
  const uniforms: ShaderMountUniforms = {}
  for (const [key, initial] of Object.entries(defaults)) {
    const margin = key.startsWith('margin') ? options.margin : undefined
    const value = options[key] ?? margin ?? initial
    const uniform = `u_${key}`
    if (key === 'colors' && Array.isArray(value)) {
      uniforms.u_colors = value.map(color => getShaderColorFromString(String(color)))
      uniforms.u_colorsCount = value.length
    } else if (key.startsWith('color') && typeof value === 'string') {
      uniforms[uniform] = getShaderColorFromString(value)
    } else if (key === 'image') {
      uniforms.u_image = await imageUniform(value)
    } else if (typeof value === 'string') {
      const dictionary = key === 'fit' ? ShaderFitOptions : key === 'type' ? DitheringTypes
        : key === 'aspectRatio' ? PulsingBorderAspectRatios : shapeOptions[variant]
      const values: Record<string, number> | undefined = dictionary
      uniforms[uniform] = values?.[value] ?? values?.[String(initial)]
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      const renamed = key === 'size' && variant === 'dot-grid' ? 'u_dotSize'
        : key === 'size' && variant === 'dithering' ? 'u_pxSize' : uniform
      uniforms[renamed] = value
    }
  }
  if (preset.noiseTexture) {
    const texture = getShaderNoiseTexture()
    if (texture) uniforms.u_noiseTexture = await imageUniform(texture)
  }
  return uniforms
}
