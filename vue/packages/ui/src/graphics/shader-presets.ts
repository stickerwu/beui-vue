import type { ShaderBackgroundVariant } from './shader-types'

type UniformParameter = number | boolean | string | readonly string[]
type Preset = { pattern?: boolean; noiseTexture?: boolean; speed: number; defaults: Record<string, UniformParameter> }

export const presets: Record<ShaderBackgroundVariant, Preset> = {
  'mesh-gradient': { speed: 1, defaults: {
    colors: ['#e0eaff', '#241d9a', '#f75092', '#9f50d3'], distortion: 0.8, swirl: 0.1, grainMixer: 0, grainOverlay: 0,
  } },
  'grain-gradient': { speed: 1, noiseTexture: true, defaults: {
    colorBack: '#000000', colors: ['#7300ff', '#eba8ff', '#00bfff', '#2a00ff'], softness: 0.5, intensity: 0.5, noise: 0.25, shape: 'corners',
  } },
  'dot-grid': { speed: 0, pattern: true, defaults: {
    colorBack: '#000000', colorFill: '#ffffff', colorStroke: '#ffaa00', size: 2, gapX: 32, gapY: 32, strokeWidth: 0, sizeRange: 0, opacityRange: 0, shape: 'circle',
  } },
  'dot-orbit': { speed: 1.5, pattern: true, noiseTexture: true, defaults: {
    colorBack: '#000000', colors: ['#ffc96b', '#ff6200', '#ff2f00', '#421100', '#1a0000'], size: 1, sizeRange: 0, spreading: 1, stepsPerColor: 4,
  } },
  warp: { speed: 1, pattern: true, noiseTexture: true, defaults: {
    colors: ['#121212', '#9470ff', '#121212', '#8838ff'], proportion: 0.45, softness: 1, distortion: 0.25, swirl: 0.8, swirlIterations: 10, shapeScale: 0.1, shape: 'checks',
  } },
  waves: { speed: 0, pattern: true, defaults: {
    scale: 0.6, colorFront: '#ffbb00', colorBack: '#000000', shape: 0, frequency: 0.5, amplitude: 0.5, spacing: 1.2, proportion: 0.1, softness: 0,
  } },
  water: { speed: 1, defaults: {
    scale: 0.8, image: '', colorBack: '#909090', colorHighlight: '#ffffff', highlights: 0.07, layering: 0.5, edges: 0.8, waves: 0.3, caustic: 0.1, size: 1,
  } },
  voronoi: { speed: 0.5, pattern: true, noiseTexture: true, defaults: {
    colors: ['#ff8247', '#ffe53d'], stepsPerColor: 3, colorGlow: '#ffffff', colorGap: '#2e0000', distortion: 0.4, gap: 0.04, glow: 0, scale: 0.5,
  } },
  swirl: { speed: 0.32, defaults: {
    colorBack: '#330000', colors: ['#ffd1d1', '#ff8a8a', '#660000'], bandCount: 4, twist: 0.1, center: 0.2, proportion: 0.5, softness: 0, noiseFrequency: 0.4, noise: 0.2,
  } },
  'smoke-ring': { speed: 0.5, noiseTexture: true, defaults: {
    colorBack: '#000000', colors: ['#ffffff'], noiseScale: 3, noiseIterations: 8, radius: 0.25, thickness: 0.65, innerShape: 0.7, scale: 0.8,
  } },
  'static-radial-gradient': { speed: 0, defaults: {
    colorBack: '#000000', colors: ['#00bbff', '#00ffe1', '#ffffff'], radius: 0.8, focalDistance: 0.99, focalAngle: 0, falloff: 0.24, mixing: 0.5, distortion: 0, distortionShift: 0, distortionFreq: 12, grainMixer: 0, grainOverlay: 0,
  } },
  'neuro-noise': { speed: 1, pattern: true, defaults: {
    colorFront: '#ffffff', colorMid: '#47a6ff', colorBack: '#000000', brightness: 0.05, contrast: 0.3,
  } },
  metaballs: { speed: 1, noiseTexture: true, defaults: {
    colorBack: '#000000', colors: ['#6e33cc', '#ff5500', '#ffc105', '#ffc800', '#f585ff'], count: 10, size: 0.83,
  } },
  'god-rays': { speed: 0.75, noiseTexture: true, defaults: {
    offsetY: -0.55, colorBack: '#000000', colorBloom: '#0000ff', colors: ['#a600ff6e', '#6200fff0', '#ffffff', '#33fff5'], density: 0.3, spotty: 0.3, midIntensity: 0.4, midSize: 0.2, intensity: 0.8, bloom: 0.4,
  } },
  spiral: { speed: 1, pattern: true, defaults: {
    colorBack: '#001429', colorFront: '#79d1ff', density: 1, distortion: 0, strokeWidth: 0.5, strokeTaper: 0, strokeCap: 0, noise: 0, noiseFrequency: 0, softness: 0,
  } },
  dithering: { speed: 1, pattern: true, defaults: {
    scale: 0.6, colorBack: '#000000', colorFront: '#00b2ff', shape: 'sphere', type: '4x4', size: 2,
  } },
  'pulsing-border': { speed: 1, noiseTexture: true, defaults: {
    scale: 0.6, colorBack: '#000000', colors: ['#0dc1fd', '#d915ef', '#ff3f2ecc'], roundness: 0.25, thickness: 0.1, marginLeft: 0, marginRight: 0, marginTop: 0, marginBottom: 0, aspectRatio: 'auto', softness: 0.75, intensity: 0.2, bloom: 0.25, spots: 5, spotSize: 0.5, pulse: 0.25, smoke: 0.3, smokeSize: 0.6,
  } },
  'color-panels': { speed: 0.5, defaults: {
    colors: ['#ff9d00', '#fd4f30', '#809bff', '#6d2eff', '#333aff', '#f15cff', '#ffd557'], colorBack: '#000000', angle1: 0, angle2: 0, length: 1.1, edges: false, blur: 0, fadeIn: 1, fadeOut: 0.3, gradient: 0, density: 3, scale: 0.8,
  } },
  'static-mesh-gradient': { speed: 0, defaults: {
    rotation: 270, colors: ['#ffad0a', '#6200ff', '#e2a3ff', '#ff99fd'], positions: 2, waveX: 1, waveXShift: 0.6, waveY: 1, waveYShift: 0.21, mixing: 0.93, grainMixer: 0, grainOverlay: 0,
  } },
  'simplex-noise': { speed: 0.5, pattern: true, defaults: {
    scale: 0.6, colors: ['#4449cf', '#ffd1e0', '#f94446', '#ffd36b', '#ffffff'], stepsPerColor: 2, softness: 0,
  } },
  'perlin-noise': { speed: 0.5, pattern: true, defaults: {
    colorBack: '#632ad5', colorFront: '#fccff7', proportion: 0.35, softness: 0.1, octaveCount: 1, persistence: 1, lacunarity: 1.5,
  } },
}
