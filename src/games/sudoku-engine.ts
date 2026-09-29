import type { GameEngine, SubmitInput, SubmitResult } from './types'
import { generatePuzzle, gridToString, matchesGivens, parseGrid } from './sudoku-core'
import { AppError } from '@/lib/errors'

export const sudokuEngine: GameEngine = {
  type: 'SUDOKU',
  async start(payload, game) {
    const source = game.config?.sudokuSource ?? 'CMS_THEN_GENERATED'
    let puzzle: number[] | null = null
    let solution: number[] | null = null

    if (source !== 'GENERATED') {
      const res = await payload.find({ collection: 'sudoku-puzzles', where: { difficulty: { equals: game.difficulty }, isActive: { equals: true } }, limit: 50, depth: 0, overrideAccess: true })
      if (res.docs.length) {
        const pick = res.docs[Math.floor(Math.random() * res.docs.length)]!
        puzzle = parseGrid(pick.puzzle)
        solution = parseGrid(pick.solution)
      }
    }
    if (!puzzle || !solution) {
      if (source === 'CMS_ONLY') throw new AppError('NOT_AVAILABLE', 'No puzzles are available for this difficulty right now.')
      const gen = generatePuzzle(game.difficulty)
      puzzle = gen.puzzle
      solution = gen.solution
    }
    const clueCount = puzzle.filter((n) => n !== 0).length
    const maxScore = 81 - clueCount
    return {
      client: { kind: 'SUDOKU', puzzle: gridToString(puzzle), difficulty: game.difficulty },
      server: { kind: 'SUDOKU', puzzle, solution },
      maxScore,
    }
  },
  async submit(_payload, game, input: SubmitInput): Promise<SubmitResult> {
    const server = (input.server as unknown) as { puzzle: number[]; solution: number[] }
    const given = (input.payload as { grid?: string })?.grid
    const grid = given ? parseGrid(given) : null
    const minSolveSeconds = game.config?.minSolveSeconds ?? 20
    const maxScore = 81 - server.puzzle.filter((n: number) => n !== 0).length

    if (!grid) return { score: 0, maxScore, rounds: null, rejectionReason: 'Malformed submission.' }
    if (input.elapsedSeconds < minSolveSeconds) return { score: 0, maxScore, rounds: null, rejectionReason: 'Submitted implausibly fast.' }
    if (!matchesGivens(server.puzzle, grid)) return { score: 0, maxScore, rounds: null, rejectionReason: 'Given clues were modified.' }

    const blanks = server.puzzle.filter((n) => n === 0).length
    const solvedCells = server.puzzle.reduce((acc, v, i) => acc + (v === 0 && grid[i] === server.solution[i] ? 1 : 0), 0)
    return { score: solvedCells, maxScore: blanks, rounds: { solvedCells, totalBlanks: blanks } }
  },
}
