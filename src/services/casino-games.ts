import type { Payload, PayloadRequest } from 'payload'

import { randomBytes, randomInt } from 'node:crypto'

import { AppError } from '@/lib/errors'

import { DEFAULT_CURRENCY, MINOR_UNITS_PER_MAJOR } from '@/constants'

import { creditWallet, debitWallet, getWallet } from '@/services/wallet'

import { withFlag } from '@/services/context'



type Req = Partial<PayloadRequest> | undefined

type Game = 'MINE' | 'POKER' | 'CRASH' | 'SLIDE'

const amount = (n: unknown) => { if (!Number.isSafeInteger(n) || Number(n) < MINOR_UNITS_PER_MAJOR) throw new AppError('BAD_REQUEST', 'Bet must be at least ₹1.'); return Number(n) }

const uid = (u: any) => Number(u.id)

const key = (g: string, id: number, a: string) => `casino:${g}:${id}:${a}`

async function own(payload: Payload, id: number, userId: number, req: Req) { const r: any = await payload.findByID({ collection: 'casino-rounds', id, depth: 0, overrideAccess: true, req: req as PayloadRequest }); if (!r || Number(r.user?.id ?? r.user) !== userId) throw new AppError('NOT_FOUND', 'Game round not found.'); return r }

async function create(payload: Payload, req: Req, userId: number, game: Game, bet: number, state: any) { return withFlag(req ?? {}, 'serviceWrite', () => payload.create({ collection: 'casino-rounds', overrideAccess: true, depth: 0, req: req as PayloadRequest, data: { game, user: userId, status: 'ACTIVE', betAmount: bet, payoutAmount: 0, currency: DEFAULT_CURRENCY, state, startedAt: new Date().toISOString() } })) }

async function finish(payload: Payload, req: Req, r: any, status: 'WON' | 'LOST' | 'CASHED_OUT', payout: number, description: string) { if (r.status !== 'ACTIVE') return r; if (payout > 0) await creditWallet({ payload, req, userId: Number(r.user?.id ?? r.user), type: 'GAME_REWARD', amount: payout, description, idempotencyKey: key(r.game, r.id, status), referenceType: 'casino-round', referenceId: r.id, metadata: { game: r.game } }); return withFlag(req ?? {}, 'serviceWrite', () => payload.update({ collection: 'casino-rounds', id: r.id, overrideAccess: true, depth: 0, req: req as PayloadRequest, data: { status, payoutAmount: payout, settledAt: new Date().toISOString() } })) }

async function active(payload: Payload, req: Req, userId: number, game: Game) { const x = await payload.find({ collection: 'casino-rounds', where: { and: [{ user: { equals: userId } }, { game: { equals: game } }, { status: { equals: 'ACTIVE' } }] }, limit: 1, overrideAccess: true, depth: 0, req: req as PayloadRequest }); return x.docs[0] as any }



export async function startMine(payload: Payload, req: Req, userId: number, bet: number, mines: number) { amount(bet); if (!Number.isInteger(mines) || mines < 1 || mines > 24) throw new AppError('BAD_REQUEST', 'Choose 1–24 mines.'); if (await active(payload, req, userId, 'MINE')) throw new AppError('CONFLICT', 'Finish your active Mine round first.'); await debitWallet({ payload, req, userId, amount: bet, description: 'Mine game bet', idempotencyKey: `casino:mine:new:${userId}:${Date.now()}` }); const set = new Set<number>(); while (set.size < mines) set.add(randomInt(25)); const r = await create(payload, req, userId, 'MINE', bet, { mines, mineIndexes: [...set], picks: [], multiplier: 1 }); return { id: r.id, mines, picks: [], balance: (await getWallet(payload, userId)).availableBalance } }

export async function mineStatus(payload: Payload, req: Req, userId: number) { const r = await active(payload, req, userId, 'MINE'); return r ? { id: r.id, betAmount: r.betAmount, mines: r.state.mines, picks: r.state.picks, multiplier: r.state.multiplier } : null }

function mineMultiplier(mines: number, picks: number) { if (!picks) return 1; let m = .99, safe = 25 - mines; for (let i = 0; i < picks; i++)m *= ((25 - i) / (safe - i)); return Math.round(m * 1e6) / 1e6 }

export async function minePick(payload: Payload, req: Req, userId: number, id: number, point: number) { const r: any = await own(payload, id, userId, req); if (r.game !== 'MINE' || r.status !== 'ACTIVE') throw new AppError('CONFLICT', 'Round is not active.'); if (!Number.isInteger(point) || point < 0 || point > 24) throw new AppError('BAD_REQUEST', 'Invalid tile.'); if (r.state.picks.includes(point)) throw new AppError('CONFLICT', 'Tile already opened.'); r.state.picks.push(point); if (r.state.mineIndexes.includes(point)) { await finish(payload, req, r, 'LOST', 0, 'Mine game lost'); return { status: 'LOST', picks: r.state.picks, mineIndexes: r.state.mineIndexes, payout: 0, balance: (await getWallet(payload, userId)).availableBalance } } r.state.multiplier = mineMultiplier(r.state.mines, r.state.picks.length); if (r.state.picks.length === 25 - r.state.mines) { const payout = Math.floor(r.betAmount * r.state.multiplier); await finish(payload, req, r, 'WON', payout, 'Mine game reward'); return { status: 'WON', picks: r.state.picks, mineIndexes: r.state.mineIndexes, multiplier: r.state.multiplier, payout, balance: (await getWallet(payload, userId)).availableBalance } } await withFlag(req ?? {}, 'serviceWrite', () => payload.update({ collection: 'casino-rounds', id: r.id, overrideAccess: true, depth: 0, req: req as PayloadRequest, data: { state: r.state } })); return { status: 'BET', picks: r.state.picks, multiplier: r.state.multiplier, payout: 0, balance: (await getWallet(payload, userId)).availableBalance } }

export async function mineCashout(payload: Payload, req: Req, userId: number, id: number) { const r: any = await own(payload, id, userId, req); if (r.game !== 'MINE' || r.status !== 'ACTIVE') throw new AppError('CONFLICT', 'Round is not active.'); const payout = Math.floor(r.betAmount * Number(r.state.multiplier || 1)); await finish(payload, req, r, 'CASHED_OUT', payout, 'Mine cashout'); return { status: 'CASHED_OUT', payout, picks: r.state.picks, mineIndexes: r.state.mineIndexes, balance: (await getWallet(payload, userId)).availableBalance } }



const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades']; const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']; type Card = { rank: string; suit: string };

const deck = () => SUITS.flatMap(s => RANKS.map(rank => ({ rank, suit: s }))); function shuffle<T>(a: T[]) { for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1);[a[i], a[j]] = [a[j], a[i]] } return a }

function evalPoker(c: Card[]) { const v = c.map(x => RANKS.indexOf(x.rank) + 2).sort((a, b) => a - b), counts = new Map<number, number>(); v.forEach(x => counts.set(x, (counts.get(x) || 0) + 1)); const g = [...counts.values()].sort((a, b) => b - a), flush = c.every(x => x.suit === c[0].suit), u = [...new Set(v)], straight = u.length === 5 && (u[4] - u[0] === 4 || JSON.stringify(u) === '[2,3,4,5,14]'); if (straight && flush && v[4] === 14) return 'royal_flush'; if (straight && flush) return 'straight_flush'; if (g[0] === 4) return '4_of_a_kind'; if (g[0] === 3 && g[1] === 2) return 'full_house'; if (flush) return 'flush'; if (straight) return 'straight'; if (g[0] === 3) return '3_of_a_kind'; if (g[0] === 2 && g[1] === 2) return '2_pair'; if (g[0] === 2) { const p = [...counts.entries()].find(([, n]) => n === 2)?.[0] || 0; return p >= 11 ? 'pair' : 'nothing' } return 'nothing' }

const PAY: Record<string, number> = { royal_flush: 800, straight_flush: 60, '4_of_a_kind': 22, full_house: 9, flush: 6, straight: 4, '3_of_a_kind': 3, '2_pair': 2, pair: 1, nothing: 0 }

export async function pokerInit(payload: Payload, req: Req, userId: number, bet: number) { amount(bet); if (await active(payload, req, userId, 'POKER')) throw new AppError('CONFLICT', 'Finish the current poker hand first.'); await debitWallet({ payload, req, userId, amount: bet, description: 'Video Poker bet', idempotencyKey: `casino:poker:new:${userId}:${Date.now()}` }); const d = shuffle(deck()), hand = d.splice(0, 5), r = await create(payload, req, userId, 'POKER', bet, { hand, deck: d }); return { id: r.id, hand, balance: (await getWallet(payload, userId)).availableBalance } }

export async function pokerState(payload: Payload, req: Req, userId: number) { const r = await active(payload, req, userId, 'POKER'); return r ? { id: r.id, hand: r.state.hand } : null }

export async function pokerDraw(payload: Payload, req: Req, userId: number, id: number, holds: number[]) { const r: any = await own(payload, id, userId, req); if (r.game !== 'POKER' || r.status !== 'ACTIVE') throw new AppError('CONFLICT', 'Round is not active.'); if (!Array.isArray(holds) || holds.some(i => !Number.isInteger(i) || i < 0 || i > 4)) throw new AppError('BAD_REQUEST', 'Invalid holds.'); const hand = r.state.hand as Card[], d = r.state.deck as Card[]; for (let i = 0; i < 5; i++)if (!holds.includes(i)) { const card = d.shift(); if (card) hand[i] = card; } const result = evalPoker(hand), mult = PAY[result], payout = Math.floor(r.betAmount * mult); await finish(payload, req, r, payout ? 'WON' : 'LOST', payout, `Video Poker — ${result.replaceAll('_', ' ')}`); return { hand, result, multiplier: mult, payout, balance: (await getWallet(payload, userId)).availableBalance } }



function point(game: Game) { const h = randomBytes(8).readBigUInt64BE(0); const u = Number(h % 1000000n) / 1e6; return Math.max(1.01, Math.min(game === 'SLIDE' ? 50 : 20, Math.floor((1 + (-Math.log(1 - u) * 2)) * 100) / 100)) }

export async function multiplierStart(payload: Payload, req: Req, userId: number, game: 'CRASH' | 'SLIDE', bet: number, target: number) { amount(bet); if (!Number.isFinite(target) || target < 1.01 || target > 50) throw new AppError('BAD_REQUEST', 'Target must be between 1.01x and 50x.'); if (await active(payload, req, userId, game)) throw new AppError('CONFLICT', 'Finish your active round first.'); await debitWallet({ payload, req, userId, amount: bet, description: `${game === 'CRASH' ? 'Crash' : 'Slide'} game bet`, idempotencyKey: `casino:${game.toLowerCase()}:new:${userId}:${Date.now()}` }); const r = await create(payload, req, userId, game, bet, { crashPoint: point(game), target }); return { id: r.id, balance: (await getWallet(payload, userId)).availableBalance } }

export async function multiplierState(payload: Payload, req: Req, userId: number, id: number) { const r: any = await own(payload, id, userId, req); if (!['CRASH', 'SLIDE'].includes(r.game) || r.status !== 'ACTIVE') return { status: r.status }; const elapsed = Math.max(0, (Date.now() - new Date(r.startedAt).getTime()) / 1000), m = Math.round(Math.exp(elapsed * .22) * 100) / 100; if (m >= r.state.crashPoint) { await finish(payload, req, r, 'LOST', 0, `${r.game} round lost`); return { status: 'LOST', crashed: true, multiplier: r.state.crashPoint } } return { status: 'ACTIVE', crashed: false, multiplier: m, target: r.state.target } }

export async function multiplierCashout(payload: Payload, req: Req, userId: number, id: number) { const s: any = await multiplierState(payload, req, userId, id); if (s.status !== 'ACTIVE') return s; const r: any = await own(payload, id, userId, req), payout = Math.floor(r.betAmount * s.multiplier); await finish(payload, req, r, 'CASHED_OUT', payout, `${r.game} cashout`); return { status: 'CASHED_OUT', multiplier: s.multiplier, payout, balance: (await getWallet(payload, userId)).availableBalance } }
