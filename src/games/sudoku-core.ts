import { randomInt } from 'node:crypto'
import type { Difficulty } from '@/constants'

/** Pure Sudoku helpers (no I/O). A grid is a flat array of 81 numbers, 0 = empty. */
export type Grid = number[]

export const CLUES_BY_DIFFICULTY: Record<Difficulty, number> = { EASY: 42, MEDIUM: 35, HARD: 30, EXPERT: 26 }

export function parseGrid(s: string): Grid | null {
  const clean = s.replace(/\s+/g, '')
  if (clean.length !== 81 || !/^[0-9.]{81}$/.test(clean)) return null
  return [...clean].map((c) => (c === '.' ? 0 : Number(c)))
}

export const gridToString = (g: Grid) => g.map((n) => (n === 0 ? '0' : String(n))).join('')

const rowOf = (i: number) => (i / 9) | 0
const colOf = (i: number) => i % 9
const boxOf = (i: number) => ((rowOf(i) / 3) | 0) * 3 + ((colOf(i) / 3) | 0)

/** No digit repeated within any row, column or box (blanks ignored). */
export function isConsistent(g: Grid): boolean {
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)
  for (let i = 0; i < 81; i++) {
    const d = g[i]!
    if (d === 0) continue
    if (d < 1 || d > 9) return false
    const bit = 1 << d
    if (rows[rowOf(i)] & bit || cols[colOf(i)] & bit || boxes[boxOf(i)] & bit) return false
    rows[rowOf(i)] |= bit
    cols[colOf(i)] |= bit
    boxes[boxOf(i)] |= bit
  }
  return true
}

/** Completely filled and consistent. */
export function isValidSolution(g: Grid): boolean {
  return g.length === 81 && g.every((n) => n >= 1 && n <= 9) && isConsistent(g)
}

/** Every non-empty clue in `puzzle` equals the same cell in `solution`. */
export function matchesGivens(puzzle: Grid, solution: Grid): boolean {
  return puzzle.every((n, i) => n === 0 || n === solution[i])
}

const popcount = (n: number) => {
  let c = 0
  while (n) {
    n &= n - 1
    c++
  }
  return c
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

interface SearchOpts {
  limit: number
  randomise?: boolean
}

/** Backtracking solver with minimum-remaining-values heuristic. Returns solution count (capped) and first solution. */
function search(input: Grid, opts: SearchOpts): { count: number; solution: Grid | null } {
  // Guard: if two already-filled cells conflict, the row/col/box bitmasks below would silently
  // collapse the duplicate bit, and the search would proceed as if only one cell were given — it can
  // never detect a given-vs-given conflict on its own. Bail out up front instead.
  if (!isConsistent(input)) return { count: 0, solution: null }

  const g = input.slice()
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)
  for (let i = 0; i < 81; i++) {
    if (g[i]) {
      const bit = 1 << g[i]!
      rows[rowOf(i)] |= bit
      cols[colOf(i)] |= bit
      boxes[boxOf(i)] |= bit
    }
  }
  let count = 0
  let first: Grid | null = null

  const go = () => {
    if (count >= opts.limit) return
    let best = -1
    let bestMask = 0
    let bestN = 10
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) continue
      const mask = ~(rows[rowOf(i)] | cols[colOf(i)] | boxes[boxOf(i)]) & 0x3fe
      const n = popcount(mask)
      if (n === 0) return
      if (n < bestN) {
        best = i
        bestMask = mask
        bestN = n
        if (n === 1) break
      }
    }
    if (best === -1) {
      count++
      if (!first) first = g.slice()
      return
    }
    const digits = opts.randomise ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]) : [1, 2, 3, 4, 5, 6, 7, 8, 9]
    for (const d of digits) {
      if (!(bestMask & (1 << d))) continue
      const bit = 1 << d
      g[best] = d
      rows[rowOf(best)] |= bit
      cols[colOf(best)] |= bit
      boxes[boxOf(best)] |= bit
      go()
      g[best] = 0
      rows[rowOf(best)] &= ~bit
      cols[colOf(best)] &= ~bit
      boxes[boxOf(best)] &= ~bit
      if (count >= opts.limit) return
    }
  }
  go()
  return { count, solution: first }
}

export const countSolutions = (g: Grid, limit = 2) => search(g, { limit }).count

export function solve(g: Grid): Grid | null {
  return search(g, { limit: 1 }).solution
}

/** Generate a puzzle with a unique solution. Falls back to a slightly easier puzzle if the time budget is hit. */
export function generatePuzzle(difficulty: Difficulty, budgetMs = 2500): { puzzle: Grid; solution: Grid } {
  const solution = search(new Array(81).fill(0), { limit: 1, randomise: true }).solution!
  const puzzle = solution.slice()
  const target = CLUES_BY_DIFFICULTY[difficulty]
  const deadline = Date.now() + budgetMs
  let clues = 81
  for (const idx of shuffle([...Array(81).keys()])) {
    if (clues <= target || Date.now() > deadline) break
    const keep = puzzle[idx]!
    puzzle[idx] = 0
    if (countSolutions(puzzle, 2) !== 1) puzzle[idx] = keep
    else clues--
  }
  return { puzzle, solution }
}
