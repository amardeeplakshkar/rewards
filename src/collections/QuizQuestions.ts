import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { QUESTION_TYPES, toOptions } from '@/constants'
import { allow, ROLES } from '@/access'
import { auditCollectionHooks } from '@/hooks/audit'

export const QuizQuestions: CollectionConfig = {
  slug: 'quiz-questions',
  labels: { singular: 'Quiz question', plural: 'Quiz questions' },
  admin: {
    group: 'Games',
    useAsTitle: 'question',
    defaultColumns: ['question', 'difficulty', 'category', 'points', 'isActive'],
    listSearchableFields: ['question', 'category'],
  },
  access: {
    read: allow(...ROLES.operationsRead),
    create: allow(...ROLES.content),
    update: allow(...ROLES.content),
    delete: allow(...ROLES.content),
  },
  hooks: {
    ...auditCollectionHooks('quiz-questions', { created: 'CONTENT_UPDATED', updated: 'CONTENT_UPDATED', deleted: 'CONTENT_UPDATED' }),
    beforeValidate: [
      ({ data }) => {
        if (data?.type === 'TRUE_FALSE') {
          const current = data.options as { text: string; isCorrect?: boolean }[] | undefined
          const trueCorrect = current?.find((o) => /^true$/i.test(o.text))?.isCorrect ?? current?.[0]?.isCorrect ?? true
          data.options = [
            { text: 'True', isCorrect: Boolean(trueCorrect) },
            { text: 'False', isCorrect: !trueCorrect },
          ]
        }
        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        const options = (data.options ?? []) as { text: string; isCorrect?: boolean }[]
        if (options.length < 2) throw new APIError('A question needs at least two options.', 400)
        if (options.filter((o) => o.isCorrect).length !== 1) throw new APIError('Mark exactly one option as correct.', 400)
        return data
      },
    ],
  },
  fields: [
    { name: 'question', type: 'textarea', required: true },
    { name: 'type', type: 'select', defaultValue: 'MULTIPLE_CHOICE', required: true, options: toOptions(QUESTION_TYPES) },
    {
      name: 'options',
      type: 'array',
      minRows: 2,
      maxRows: 6,
      required: true,
      admin: { description: 'Tick "Correct answer" on exactly one option. For True/False the options are set automatically.' },
      fields: [
        { name: 'text', type: 'text', required: true },
        { name: 'isCorrect', type: 'checkbox', label: 'Correct answer', defaultValue: false },
      ],
    },
    { name: 'explanation', type: 'textarea', admin: { description: 'Shown to the user after they finish the quiz.' } },
    {
      name: 'difficulty',
      type: 'select',
      required: true,
      defaultValue: 'EASY',
      index: true,
      options: [
        { label: 'Easy', value: 'EASY' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'Hard', value: 'HARD' },
      ],
    },
    { name: 'category', type: 'text', index: true },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'timeLimitSeconds', type: 'number', min: 3, max: 300, admin: { description: 'Overrides the game default for this question.' } },
    { name: 'points', type: 'number', min: 1, defaultValue: 10, required: true },
    { name: 'isActive', type: 'checkbox', defaultValue: true, index: true },
  ],
}
