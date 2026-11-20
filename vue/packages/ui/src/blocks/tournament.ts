export interface TournamentTeam {
  name: string
  logo?: string
  code?: string
}

export interface TournamentSide {
  team: TournamentTeam | null
  score: number | null
  penalties?: number | null
}

export interface TournamentMatch {
  id: string
  date?: string
  time?: string
  status?: 'finished' | 'upcoming'
  home: TournamentSide
  away: TournamentSide
  winner?: 'home' | 'away'
  badge?: string
}

export interface TournamentRound {
  name: string
  matches: TournamentMatch[]
}

export function score(side: TournamentSide) {
  if (side.score === null) return '–'
  return side.penalties == null ? String(side.score) : `${side.score} (${side.penalties})`
}

export function crest(team: TournamentTeam | null) {
  if (team?.logo) return team.logo
  return team?.code ? `https://flagcdn.com/w40/${encodeURIComponent(team.code.toLowerCase())}.png` : undefined
}
