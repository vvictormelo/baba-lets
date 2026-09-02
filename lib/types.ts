export interface Participant {
  id: number
  name: string
  has_voted: boolean
}

export interface VoteEntry {
  voted_for_id: number
  voted_for_name: string
  pote: number
}

export interface PoteResult {
  pote: number
  ranking: { name: string; votes: number }[]
}
