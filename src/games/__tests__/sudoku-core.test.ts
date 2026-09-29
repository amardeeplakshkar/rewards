import { describe, expect, it } from 'vitest'
import { countSolutions, generatePuzzle, gridToString, isValidSolution, matchesGivens, parseGrid, solve } from '../sudoku-core'

const VALID_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

describe('parseGrid', () => {
  it('parses an 81-character grid using 0 or . for blanks', () => {
    const withDots = VALID_SOLUTION.slice(0, 40) + '.'.repeat(41)
    const grid = parseGrid(withDots)
    expect(grid).not.toBeNull()
    expect(grid).toHaveLength(81)
    expect(grid![40]).toBe(0)
  })
  it('rejects the wrong length or invalid characters', () => {
    expect(parseGrid('123')).toBeNull()
    expect(parseGrid('a'.repeat(81))).toBeNull()
  })
})

describe('isValidSolution', () => {
  it('accepts a real solved grid', () => {
    expect(isValidSolution(parseGrid(VALID_SOLUTION)!)).toBe(true)
  })
  it('rejects a grid with a repeated digit in a row', () => {
    const broken = parseGrid(VALID_SOLUTION)!
    broken[1] = broken[0] // duplicate within row 0
    expect(isValidSolution(broken)).toBe(false)
  })
  it('rejects an incomplete grid', () => {
    const incomplete = parseGrid(VALID_SOLUTION)!
    incomplete[0] = 0
    expect(isValidSolution(incomplete)).toBe(false)
  })
})

describe('matchesGivens', () => {
  it('is true when every non-zero puzzle cell matches the solution', () => {
    const solution = parseGrid(VALID_SOLUTION)!
    const puzzle = solution.map((v, i) => (i % 3 === 0 ? v : 0))
    expect(matchesGivens(puzzle, solution)).toBe(true)
  })
  it('is false when a clue contradicts the solution', () => {
    const solution = parseGrid(VALID_SOLUTION)!
    const puzzle = new Array(81).fill(0)
    puzzle[0] = solution[0] === 9 ? 1 : 9
    expect(matchesGivens(puzzle, solution)).toBe(false)
  })
})

describe('solve / countSolutions', () => {
  it('solves a puzzle down to a valid grid consistent with the givens', () => {
    const solution = parseGrid(VALID_SOLUTION)!
    const puzzle = solution.map((v, i) => (i % 2 === 0 ? v : 0))
    const solved = solve(puzzle)
    expect(solved).not.toBeNull()
    expect(isValidSolution(solved!)).toBe(true)
    expect(matchesGivens(puzzle, solved!)).toBe(true)
  })
  it('a puzzle generated with a unique solution reports exactly one', () => {
    const { puzzle } = generatePuzzle('EASY', 1500)
    expect(countSolutions(puzzle, 2)).toBe(1)
  }, 10_000)
  it('reports 0 solutions for a puzzle whose givens contradict each other', () => {
    const solution = parseGrid(VALID_SOLUTION)!
    const puzzle = new Array(81).fill(0)
    puzzle[0] = solution[0]
    puzzle[1] = solution[0] // same digit given twice in row 0 — no valid completion exists
    expect(countSolutions(puzzle, 2)).toBe(0)
  })
})

describe('generatePuzzle', () => {
  it('produces a puzzle whose givens match its own solution and has a unique solution', () => {
    const { puzzle, solution } = generatePuzzle('EASY', 1500)
    expect(isValidSolution(solution)).toBe(true)
    expect(matchesGivens(puzzle, solution)).toBe(true)
    expect(countSolutions(puzzle, 2)).toBe(1)
  }, 10_000)

  it('harder difficulties have fewer or equal clues than easier ones', () => {
    const easy = generatePuzzle('EASY', 1200)
    const hard = generatePuzzle('HARD', 1200)
    const clues = (g: number[]) => g.filter((n) => n !== 0).length
    expect(clues(hard.puzzle)).toBeLessThanOrEqual(clues(easy.puzzle))
  }, 15_000)
})

describe('gridToString', () => {
  it('round-trips with parseGrid', () => {
    const grid = parseGrid(VALID_SOLUTION)!
    expect(gridToString(grid)).toBe(VALID_SOLUTION)
  })
})
