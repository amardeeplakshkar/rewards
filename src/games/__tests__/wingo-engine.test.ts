import { describe, expect, it } from 'vitest'
import { wingoEngine } from '../wingo-engine'

describe('wingoEngine', () => {
  it('starts a valid round with the 0-9 betting board', async () => {
    const game = { reward: { amount: 100 } } as any
    const round = await wingoEngine.start({} as any, game)

    expect(round.client.kind).toBe('WINGO')
    expect(round.client.numbers).toHaveLength(10)
    expect(round.server.kind).toBe('WINGO')
    expect(round.server.winningNumber).toBeGreaterThanOrEqual(0)
    expect(round.server.winningNumber).toBeLessThan(10)
  })

  it('awards the exact number bet at 9x', async () => {
    const game = { reward: { amount: 100 } } as any
    const result = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 7 },
      payload: { type: 'NUMBER', value: 7 },
      elapsedSeconds: 5,
    })

    expect(result.score).toBe(1)
    expect(result.rewardOverride).toBe(900)
  })

  it('applies the color and size payout rules from the 51-game reference', async () => {
    const game = { reward: { amount: 100 } } as any

    const greenResult = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 5 },
      payload: { type: 'COLOR', value: 'green' },
      elapsedSeconds: 5,
    })
    expect(greenResult.score).toBe(1)
    expect(greenResult.rewardOverride).toBe(150)

    const violetResult = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 5 },
      payload: { type: 'COLOR', value: 'violet' },
      elapsedSeconds: 5,
    })
    expect(violetResult.score).toBe(1)
    expect(violetResult.rewardOverride).toBe(450)

    const bigResult = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 8 },
      payload: { type: 'SIZE', value: 'big' },
      elapsedSeconds: 5,
    })
    expect(bigResult.score).toBe(1)
    expect(bigResult.rewardOverride).toBe(200)
  })

  it('rejects invalid Wingo bets', async () => {
    const game = { reward: { amount: 100 } } as any
    const result = await wingoEngine.submit({} as any, game, {
      server: { kind: 'WINGO', winningNumber: 3 },
      payload: { type: 'COLOR', value: 'yellow' },
      elapsedSeconds: 5,
    })

    expect(result.score).toBe(0)
    expect(result.rejectionReason).toBeTruthy()
  })
})
