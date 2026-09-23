export const POTE_POINTS: Record<number, number> = {
  1: 18,
  2: 12,
  3: 10,
  4: 6,
  5: 3,
  6: 1,
}

export const POTES = [1, 2, 3, 4, 5, 6] as const
export const TEAMS = [1, 2, 3] as const
export const ROUND_SIZE = 18
export const POT_SIZE = 3
// Minimo de jogadores de linha para sortear: 3 times de 4.
export const MIN_ROUND_SIZE = 12

// Totais aceitos para montar potes: multiplos de POT_SIZE entre MIN_ROUND_SIZE e ROUND_SIZE.
// Cada pote sempre com POT_SIZE jogadores, e a quantidade de potes varia (12 -> 4, 15 -> 5, 18 -> 6),
// para que cada time receba exatamente 1 jogador de cada pote e os times saiam do mesmo tamanho.
export const VALID_ROUND_SIZES = [12, 15, 18] as const

export function isValidRoundSize(n: number): boolean {
  return n >= MIN_ROUND_SIZE && n <= ROUND_SIZE && n % POT_SIZE === 0
}
