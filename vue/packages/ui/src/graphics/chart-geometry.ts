export interface LineChartSeries {
  id: string
  name: string
  color: string
  values: readonly (number | null)[]
}

export type LineChartCurve = 'monotone' | 'step' | 'linear'
export type Point = { x: number; y: number }

export function normalizeChart(series: readonly LineChartSeries[], categories: readonly string[]) {
  const seenCategories = new Set<string>()
  const columns = categories.flatMap((label, index) => {
    if (seenCategories.has(label)) return []
    seenCategories.add(label)
    return [{ label, index }]
  })
  const seen = new Set<string>()
  const rows = series.flatMap(row => {
    if (seen.has(row.id)) return []
    seen.add(row.id)
    const values = columns.map(({ index }) => {
      const value = row.values[index]
      return typeof value === 'number' && Number.isFinite(value) ? value : null
    })
    return [{ ...row, values }]
  })
  return { rows, categories: columns.map(column => column.label) }
}

export function valueAxis(rows: readonly LineChartSeries[], includeZero: boolean, fixed?: readonly [number, number]) {
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    for (const value of row.values) {
      if (value === null) continue
      min = Math.min(min, value)
      max = Math.max(max, value)
    }
  }
  if (max < min) [min, max] = [0, 1]
  const fixedAxis = fixed && fixed.every(Number.isFinite) && fixed[0] < fixed[1]
  if (fixedAxis) [min, max] = fixed
  else if (includeZero) {
    min = Math.min(min, 0)
    max = Math.max(max, 0)
  }
  if (min === max) {
    if (min === 0) max = 1
    else {
      const pad = Math.abs(min) * 0.1
      min -= pad
      max += pad
    }
  }
  const raw = (max - min) / 4
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 5, 10].find(size => size >= raw / power) ?? 10) * power
  const tidy = (value: number) => Number(value.toPrecision(12))
  if (!fixedAxis) {
    min = tidy(Math.floor(min / step) * step)
    max = tidy(Math.ceil(max / step) * step)
  }
  const first = Math.ceil(min / step)
  const count = Math.min(10, Math.max(0, Math.floor(max / step + 1e-6) - first + 1))
  const ticks = Array.from({ length: count }, (_, index) => tidy((first + index) * step))
  return { min, max, ticks }
}

const round = (value: number) => Math.round(value * 100) / 100
const coordinate = (point: Point) => `${round(point.x)},${round(point.y)}`

function segment(points: Point[], curve: LineChartCurve) {
  let path = `M${coordinate(points[0])}`
  if (points.length === 1) return `${path}h0`
  if (curve === 'linear' || points.length === 2) return path + points.slice(1).map(point => `L${coordinate(point)}`).join('')
  const slopes = points.slice(1).map((point, index) => (point.y - points[index].y) / (point.x - points[index].x || 1))
  const tangents = points.map((point, index) => {
    if (!index || index === slopes.length) return 0
    const before = slopes[index - 1]
    const after = slopes[index]
    const mean = (before * (points[index + 1].x - point.x) + after * (point.x - points[index - 1].x)) / (points[index + 1].x - points[index - 1].x || 1)
    return (Math.sign(before) + Math.sign(after)) * Math.min(Math.abs(before), Math.abs(after), Math.abs(mean) / 2)
  })
  tangents[0] = (3 * slopes[0] - tangents[1]) / 2
  const last = points.length - 1
  tangents[last] = (3 * slopes[last - 1] - tangents[last - 1]) / 2
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1]
    const end = points[index]
    if (curve === 'step') {
      path += `H${round((start.x + end.x) / 2)}V${round(end.y)}`
    } else {
      const offset = (end.x - start.x) / 3
      path += `C${round(start.x + offset)},${round(start.y + offset * tangents[index - 1])},${round(end.x - offset)},${round(end.y - offset * tangents[index])},${coordinate(end)}`
    }
  }
  return curve === 'step' ? `${path}H${round(points[last].x)}` : path
}

export function seriesPaths(points: readonly (Point | null)[], curve: LineChartCurve, baseline: number) {
  const runs: Point[][] = []
  let run: Point[] = []
  for (const point of points) {
    if (point) run.push(point)
    else if (run.length) { runs.push(run); run = [] }
  }
  if (run.length) runs.push(run)
  let line = ''
  let area = ''
  for (const group of runs) {
    const path = segment(group, curve)
    line += path
    if (group.length > 1) area += `${path}L${round(group[group.length - 1].x)},${round(baseline)}L${round(group[0].x)},${round(baseline)}Z`
  }
  return { line, area }
}
