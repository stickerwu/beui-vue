export const gameTargets = [1.5, 2, 3, 5, 10, 25, 100]

export function floor2(value: number) {
  return Math.floor(value * 100 + 1e-9) / 100
}

export function formatMultiplier(value: number) {
  if (value < 10_000) return `${value.toFixed(2)}×`
  if (value >= 1e15) {
    const exponent = Math.floor(Math.log10(value))
    return `${Math.floor(value / 10 ** exponent * 10) / 10}e${exponent}×`
  }
  const power = value >= 1e12 ? 12 : value >= 1e9 ? 9 : value >= 1e6 ? 6 : 3
  const suffix = ({ 3: 'K', 6: 'M', 9: 'B', 12: 'T' } as const)[power]
  return `${Math.floor(value / 10 ** power * 10) / 10}${suffix}×`
}

export function crashPoint(random: () => number = Math.random, houseEdge = 0) {
  const edge = Math.min(1, Math.max(0, houseEdge))
  return Math.min(1_000_000, Math.max(1, Math.floor(100 * (1 - edge) / (1 - random())) / 100))
}

export function slideResult(random: () => number = Math.random, houseEdge = .01) {
  return crashPoint(random, houseEdge)
}

export function minesMultiplier(tiles: number, mines: number, gems: number) {
  const mineCount = Math.max(0, Math.min(Math.round(mines), tiles - 1))
  const picks = Math.max(0, Math.min(Math.round(gems), tiles - mineCount))
  let result = 1
  for (let pick = 0; pick < picks; pick++) result *= (tiles - pick) / (tiles - mineCount - pick)
  return result
}

export function plinkoSlots(rowCount: number, options: { center?: number; edge?: number } = {}) {
  const rows = Math.max(1, Math.round(rowCount) || 1)
  const center = Math.max(.01, options.center ?? 1)
  const edge = Math.max(center, options.edge ?? 100)
  return Array.from({ length: rows + 1 }, (_, slot) => {
    const value = center * (edge / center) ** (Math.abs(slot - rows / 2) / (rows / 2))
    return value >= 1 && value < 10 ? Math.round(value) : Number(value.toPrecision(1))
  })
}
