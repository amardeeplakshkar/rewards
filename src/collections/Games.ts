import type { CollectionConfig, Field } from 'payload'
import { APIError } from 'payload'
import { DIFFICULTIES, GAME_STATUSES, GAME_TYPES, MATH_OPERATIONS, REWARD_MODES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'
import { invalidateCollectionCache } from '@/hooks/cache'
import { moneyField, schedule, slugify } from '@/utilities/fields'

const audit = auditCollectionHooks('games', { created: 'GAME_CREATED', updated: 'GAME_UPDATED', deleted: 'GAME_DELETED' })
const cache = invalidateCollectionCache('games')

const when = (...types: string[]) => ({ condition: (data: Record<string, unknown>) => types.includes(String(data?.type)) })

const configFields: Field[] = [
  // QUIZ
  { name: 'questionCount', type: 'number', min: 1, max: 50, defaultValue: 5, admin: { ...when('QUIZ', 'NUMBER_SEQUENCE', 'MATH'), description: 'Number of questions per session.' } },
  { name: 'secondsPerQuestion', type: 'number', min: 3, max: 300, defaultValue: 20, admin: { ...when('QUIZ', 'NUMBER_SEQUENCE', 'MATH'), description: 'Default time per question (quiz questions can override it).' } },
  { name: 'category', type: 'text', admin: { ...when('QUIZ'), description: 'Optional: only draw questions from this category.' } },
  // SUDOKU
  {
    name: 'sudokuSource',
    type: 'select',
    defaultValue: 'CMS_THEN_GENERATED',
    options: [
      { label: 'Use puzzles from the Sudoku collection, generate if none', value: 'CMS_THEN_GENERATED' },
      { label: 'Only puzzles from the Sudoku collection', value: 'CMS_ONLY' },
      { label: 'Always generate a fresh puzzle', value: 'GENERATED' },
    ],
    admin: when('SUDOKU'),
  },
  { name: 'minSolveSeconds', type: 'number', min: 0, defaultValue: 20, admin: { ...when('SUDOKU', 'MEMORY'), description: 'Completions faster than this are rejected as implausible.' } },
  // MEMORY
  { name: 'rows', type: 'number', min: 2, max: 8, defaultValue: 4, admin: when('MEMORY') },
  { name: 'cols', type: 'number', min: 2, max: 8, defaultValue: 4, admin: { ...when('MEMORY'), description: 'rows × cols must be an even number.' } },
  // MATH
  {
    name: 'mathOperations',
    type: 'select',
    hasMany: true,
    options: toOptions(MATH_OPERATIONS),
    defaultValue: ['MIXED'],
    admin: when('MATH'),
  },
  // REACTION
  { name: 'rounds', type: 'number', min: 1, max: 10, defaultValue: 5, admin: when('REACTION') },
  { name: 'minDelayMs', type: 'number', min: 500, defaultValue: 1200, admin: when('REACTION') },
  { name: 'maxDelayMs', type: 'number', min: 1000, defaultValue: 4000, admin: when('REACTION') },
  // SPIN_WHEEL
  {
    name: 'segments',
    type: 'array',
    minRows: 2,
    maxRows: 12,
    admin: {
      ...when('SPIN_WHEEL'),
      description: 'Each slice of the wheel. Weight controls how often it is picked (higher = more likely). Use amount 0 for a "Try again" slice.',
    },
    fields: [
      { name: 'label', type: 'text', required: true, admin: { description: 'Shown on the wheel, e.g. "₹5" or "Try again".' } },
      moneyField('amount', { required: true, defaultValue: 0 }),
      { name: 'weight', type: 'number', required: true, min: 0.01, defaultValue: 1, admin: { description: 'Relative odds. A weight of 2 lands twice as often as a weight of 1.' } },
      { name: 'color', type: 'text', admin: { description: 'Optional hex color for this slice, e.g. #6D5DF6' } },
    ],
  },
]

export const Games: CollectionConfig = {
  slug: 'games',
  labels: { singular: 'Game', plural: 'Games' },
  admin: {
    group: 'Games',
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'difficulty', 'status', 'featured', 'sortOrder'],
    listSearchableFields: ['name', 'slug'],
    description: 'Each record is a playable game room. Create one record per difficulty (e.g. Sudoku Easy, Sudoku Hard) to give each its own reward and limits.',
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow('ADMIN'),
    update: allow('ADMIN'),
    delete: allow('ADMIN'),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        if (!data.slug && data.name) data.slug = slugify(data.name)
        if (typeof data.slug === 'string') data.slug = slugify(data.slug)
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc }) => {
        const type = data.type ?? originalDoc?.type
        const cfg = { ...(originalDoc?.config ?? {}), ...(data.config ?? {}) }
        if (data.startsAt && data.endsAt && new Date(data.endsAt) <= new Date(data.startsAt)) throw new APIError('The end time must be after the start time.', 400)
        if (type === 'MEMORY' && ((cfg.rows ?? 4) * (cfg.cols ?? 4)) % 2 !== 0) throw new APIError('Memory Match needs an even number of cards (rows × cols).', 400)
        if (type === 'REACTION' && (cfg.maxDelayMs ?? 4000) <= (cfg.minDelayMs ?? 1200)) throw new APIError('Max delay must be greater than min delay.', 400)
        if (type === 'SPIN_WHEEL' && !((cfg.segments?.length ?? 0) >= 2)) throw new APIError('Add at least two wheel segments.', 400)
        const reward = { ...(originalDoc?.reward ?? {}), ...(data.reward ?? {}) }
        if (reward.mode === 'TIERED' && !(reward.tiers?.length > 0)) throw new APIError('Add at least one reward tier.', 400)
        return data
      },
    ],
    afterChange: [...audit.afterChange, ...cache.afterChange],
    afterDelete: [...audit.afterDelete, ...cache.afterDelete],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true, unique: true, index: true },
            { name: 'description', type: 'textarea', required: true },
            { name: 'type', type: 'select', required: true, index: true, options: toOptions(GAME_TYPES) },
            { name: 'difficulty', type: 'select', required: true, defaultValue: 'EASY', options: toOptions(DIFFICULTIES), admin: { description: 'Drives question/puzzle difficulty. Quiz supports Easy–Hard; Sudoku supports Easy–Expert.' } },
            { name: 'icon', type: 'upload', relationTo: 'media' },
            { name: 'thumbnail', type: 'upload', relationTo: 'media' },
            { name: 'featured', type: 'checkbox', defaultValue: false, index: true },
            { name: 'sortOrder', type: 'number', defaultValue: 0 },
          ],
        },
        {
          label: 'Status & schedule',
          fields: [
            { name: 'status', type: 'select', required: true, index: true, defaultValue: 'DRAFT', options: toOptions(GAME_STATUSES) },
            ...schedule(),
          ],
        },
        {
          label: 'Reward',
          fields: [
            {
              name: 'reward',
              type: 'group',
              fields: [
                {
                  name: 'mode',
                  type: 'select',
                  defaultValue: 'FIXED',
                  options: [
                    { label: 'Fixed — full amount if the minimum score is reached', value: 'FIXED' },
                    { label: 'Per score — proportional to the score', value: 'PER_SCORE' },
                    { label: 'Tiered — different amount per score band', value: 'TIERED' },
                  ],
                },
                moneyField('amount', { defaultValue: 50, admin: { description: 'FIXED: paid amount · PER_SCORE: paid at 100% score.' } }),
                { name: 'minScorePercent', type: 'number', min: 0, max: 100, defaultValue: 60, admin: { description: 'Minimum score (%) required to earn anything.' } },
                {
                  name: 'tiers',
                  type: 'array',
                  admin: { condition: (_, s) => s?.mode === 'TIERED', description: 'The highest tier whose minimum the score reaches is paid.' },
                  fields: [
                    { name: 'minScorePercent', type: 'number', required: true, min: 0, max: 100 },
                    moneyField('amount', { required: true }),
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Limits',
          fields: [
            { name: 'maxAttemptsPerDay', type: 'number', min: 0, defaultValue: 5, admin: { description: 'Sessions a user can start per day. 0 = unlimited.' } },
            { name: 'dailyRewardedPlays', type: 'number', min: 0, defaultValue: 3, admin: { description: 'Sessions per day that can pay a reward. 0 = unlimited.' } },
            { name: 'cooldownSeconds', type: 'number', min: 0, defaultValue: 30, admin: { description: 'Wait time between two sessions of this game.' } },
            { name: 'durationSeconds', type: 'number', min: 10, defaultValue: 180, admin: { description: 'Time allowed to finish a session before it expires.' } },
          ],
        },
        {
          label: 'Configuration',
          fields: [{ name: 'config', type: 'group', fields: configFields, admin: { description: 'Only the settings relevant to the selected game type apply.' } }],
        },
      ],
    },
  ],
}