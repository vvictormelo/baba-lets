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

// Qualquer total entre MIN_ROUND_SIZE e ROUND_SIZE monta potes. Quando nao e
// multiplo de POT_SIZE, o ultimo pote fica incompleto e um ou dois times ficam
// com um jogador a menos -- a lacuna e sorteada, nao cai sempre nos mesmos times.
export function isValidRoundSize(n: number): boolean {
  return n >= MIN_ROUND_SIZE && n <= ROUND_SIZE
}

// Quantidade de potes para um total de jogadores de linha.
export function potCountFor(n: number): number {
  return Math.ceil(n / POT_SIZE)
}

// Capacidade de um pote especifico: todos levam POT_SIZE, menos o ultimo quando
// o total nao e multiplo de POT_SIZE.
export function potCapacity(pote: number, total: number): number {
  const full = Math.floor(total / POT_SIZE)
  return pote <= full ? POT_SIZE : total - full * POT_SIZE
}
