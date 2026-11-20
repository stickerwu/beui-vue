export interface Hsva { hue: number; saturation: number; brightness: number; alpha: number }
export const bound = (value: number, maximum = 100) => Math.min(maximum, Math.max(0, Number.isFinite(value) ? value : 0))

export function toRgb(color: Hsva): number[] {
  const brightness = color.brightness / 100
  const saturation = color.saturation / 100
  return [5, 3, 1].map(channel => {
    const phase = (channel + color.hue / 60) % 6
    return Math.round(255 * (brightness - brightness * saturation * Math.max(0, Math.min(phase, 4 - phase, 1))))
  })
}
export function toHex(color: Hsva) {
  const channels = toRgb(color)
  if (color.alpha < 1) channels.push(Math.round(color.alpha * 255))
  return `#${channels.map(value => value.toString(16).padStart(2, '0')).join('')}`
}
export function fromRgb(channels: number[], previous: Hsva): Hsva {
  const [red = 0, green = 0, blue = 0] = channels.map(value => bound(value, 255) / 255)
  const max = Math.max(red, green, blue)
  const range = max - Math.min(red, green, blue)
  let hue = previous.hue
  if (range) {
    const sector = max === red ? (green - blue) / range : max === green ? (blue - red) / range + 2 : (red - green) / range + 4
    hue = (sector * 60 + 360) % 360
  }
  return { hue, saturation: max ? range / max * 100 : previous.saturation, brightness: max * 100, alpha: previous.alpha }
}
export function parseColor(input: string, previous: Hsva) {
  let hex = input.trim().replace(/^#/, '')
  if (!/^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return undefined
  if (hex.length <= 4) hex = Array.from(hex, value => value + value).join('')
  const channels = hex.match(/../g)!.map(channel => parseInt(channel, 16))
  return { ...fromRgb(channels, previous), alpha: (channels[3] ?? 255) / 255 }
}
export function toHsl(color: Hsva) {
  const light = color.brightness * (1 - color.saturation / 200)
  const saturation = !light || light === 100 ? 0 : (color.brightness - light) / Math.min(light, 100 - light) * 100
  return [color.hue, saturation, light].map(Math.round)
}
export function fromHsl(channels: number[], previous: Hsva) {
  const [hue = 0, saturation = 0, lightness = 0] = channels
  const light = bound(lightness)
  const value = light + bound(saturation) * Math.min(light, 100 - light) / 100
  return { ...previous, hue: bound(hue, 360), brightness: value, saturation: value ? (2 - 2 * light / value) * 100 : 0 }
}
