import type { GameType } from '@/constants'
import type { GameEngine } from './types'
import { quizEngine } from './quiz-core'
import { sudokuEngine } from './sudoku-engine'
import { memoryEngine } from './memory-engine'
import { numberSequenceEngine } from './number-sequence-engine'
import { mathEngine } from './math-engine'
import { reactionEngine } from './reaction-engine'
import { spinWheelEngine } from './spin-wheel-engine'

export const ENGINES: Record<GameType, GameEngine> = {
  QUIZ: quizEngine,
  SUDOKU: sudokuEngine,
  MEMORY: memoryEngine,
  NUMBER_SEQUENCE: numberSequenceEngine,
  MATH: mathEngine,
  REACTION: reactionEngine,
  SPIN_WHEEL: spinWheelEngine,
}