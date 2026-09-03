export interface Player {
  id: number
  name: string
  active: boolean
  created_at: string
}

export interface Vote {
  id: number
  voter_id: number
  votee_id: number
  pote: number
  points: number
  created_at: string
}

export interface PlayerRanking {
  id: number
  name: string
  active: boolean
  total_points: number
  vote_count: number
  ranking_index: number
}

export interface Round {
  id: number
  scheduled_date: string
  status: 'draft' | 'open' | 'closed' | 'drawn'
  created_at: string
}

export interface RoundParticipant {
  round_id: number
  player_id: number
  is_novice: boolean
  manual_pote: number | null
  player?: Pick<Player, 'id' | 'name'>
  ranking_index?: number
}

export interface RoundPot {
  round_id: number
  player_id: number
  pote: number
  player?: Pick<Player, 'id' | 'name'>
}

export interface RoundTeam {
  round_id: number
  team: number
  player_id: number
  pote: number
  player?: Pick<Player, 'id' | 'name'>
}
