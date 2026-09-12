'use client'

import { useState, useEffect } from 'react'
import { PlayerLayout } from '@/components/PlayerLayout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface PlayerRanking {
  id: number; name: string; total_points: number; vote_count: number; ranking_index: number
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<PlayerRanking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ranking').then(r => r.json()).then(data => { setRanking(data); setLoading(false) })
  }, [])

  const withVotes = ranking.filter(p => p.vote_count > 0)
  const noVotes = ranking.filter(p => p.vote_count === 0)

  return (
    <PlayerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Ranking geral</h1>
          <p className="text-sm text-muted-foreground">Índice = média de pontos recebidos</p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-card rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {withVotes.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Jogador</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Índice</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden sm:table-cell">Votos</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground hidden sm:table-cell">Total pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withVotes.map((player, i) => (
                        <tr key={player.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{i + 1}º</td>
                          <td className="px-4 py-3 font-medium">
                            {i === 0 && <span className="mr-1">🥇</span>}
                            {i === 1 && <span className="mr-1">🥈</span>}
                            {i === 2 && <span className="mr-1">🥉</span>}
                            {player.name}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-primary tabular-nums">
                              {Number(player.ranking_index).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden sm:table-cell">
                            {player.vote_count}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden sm:table-cell">
                            {player.total_points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {noVotes.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Sem votos recebidos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {noVotes.map(p => (
                      <Badge key={p.id} variant="secondary">{p.name}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {ranking.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum voto registrado ainda.
              </div>
            )}
          </>
        )}
      </div>
    </PlayerLayout>
  )
}
