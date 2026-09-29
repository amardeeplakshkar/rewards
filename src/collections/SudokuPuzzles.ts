import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { DIFFICULTIES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { isValidSolution, parseGrid, matchesGivens } from '@/games/sudoku-core'

export const SudokuPuzzles: CollectionConfig = {
  slug: 'sudoku-puzzles',
  labels: { singular: 'Sudoku puzzle', plural: 'Sudoku puzzles' },
  admin: {
    group: 'Games',
    useAsTitle: 'label',
    defaultColumns: ['label', 'difficulty', 'isActive', 'createdAt'],
    description:
      'Optional curated puzzles. Enter 81 characters row by row: digits 1-9, and 0 or . for an empty cell. Games can also generate puzzles automatically.',
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    ...auditCollectionHooks('sudoku-puzzles', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' }),
    beforeChange: [
      ({ data }) => {
        const puzzle = parseGrid(String(data.puzzle ?? ''))
        const solution = parseGrid(String(data.solution ?? ''))
        if (!puzzle || !solution) throw new APIError('Puzzle and solution must each be exactly 81 characters (digits 1-9, and 0 or . for blanks).', 400)
        if (solution.includes(0)) throw new APIError('The solution must be completely filled in.', 400)
        if (!isValidSolution(solution)) throw new APIError('The solution is not a valid Sudoku grid.', 400)
        if (!matchesGivens(puzzle, solution)) throw new APIError('The puzzle clues do not match the solution.', 400)
        data.puzzle = puzzle.join('')
        data.solution = solution.join('')
        data.clueCount = puzzle.filter((n) => n !== 0).length
        return data
      },
    ],
  },
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'difficulty', type: 'select', required: true, index: true, options: toOptions(DIFFICULTIES) },
    { name: 'puzzle', type: 'textarea', required: true },
    { name: 'solution', type: 'textarea', required: true },
    { name: 'clueCount', type: 'number', admin: { readOnly: true } },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
  ],
}
