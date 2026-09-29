/**
 * Seeds a working demo environment: an admin, feature/site/reward settings, a couple of tasks, games,
 * quiz questions, a campaign, a referral rule and a banner. Run with:  npm run seed
 */
import 'dotenv/config'
import { getPayloadClient } from '../src/lib/payload'

async function upsertGlobal(payload: Awaited<ReturnType<typeof getPayloadClient>>, slug: 'site-settings' | 'reward-settings' | 'feature-settings', data: Record<string, unknown>) {
  await payload.updateGlobal({ slug, data: data as never, overrideAccess: true })
}

async function main() {
  const payload = await getPayloadClient()
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe!12345'

  const existingAdmin = await payload.find({ collection: 'admins', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
  if (!existingAdmin.docs.length) {
    await payload.create({ collection: 'admins', data: { email, password, name: 'Super Admin', roles: ['SUPER_ADMIN'], isActive: true }, overrideAccess: true })
    console.log(`Created super admin: ${email} / ${password}`)
  } else {
    console.log(`Admin ${email} already exists, skipping.`)
  }

  await upsertGlobal(payload, 'site-settings', { appName: 'Rewards', tagline: 'Play, complete tasks and earn.', defaultTimezone: 'Asia/Kolkata', currency: 'INR' })
  await upsertGlobal(payload, 'feature-settings', { gamesEnabled: true, tasksEnabled: true, campaignsEnabled: true, referralsEnabled: true, withdrawalsEnabled: true, registrationEnabled: true, maintenanceMode: false })
  await upsertGlobal(payload, 'reward-settings', { minimumWithdrawal: 10000, maximumWithdrawal: 1000000, dailyWithdrawalLimit: 2500000, maxOpenWithdrawals: 1, defaultReferralReward: 1000, defaultReferralQualification: 'FIRST_TASK', defaultReferralPerReferrerLimit: 50 })

  const taskExists = await payload.find({ collection: 'tasks', where: { slug: { equals: 'follow-us-on-social' } }, limit: 1, overrideAccess: true })
  if (!taskExists.docs.length) {
    await payload.create({
      collection: 'tasks',
      data: {
        title: 'Follow us on social media',
        slug: 'follow-us-on-social',
        description: 'Follow our official page and stay updated.',
        instructions: 'Open the app store page, follow us, then tap Complete.',
        rewardAmount: 200,
        rewardType: 'CASH',
        perUserLimit: 1,
        perUserDailyLimit: 0,
        cooldownMinutes: 0,
        dailyLimit: 0,
        totalLimit: 0,
        status: 'ACTIVE',
        isActive: true,
        featured: true,
        priority: 10,
        verification: { type: 'NONE' },
      },
      overrideAccess: true,
    })
    console.log('Created sample task.')
  }

  const quizExists = await payload.find({ collection: 'quiz-questions', limit: 1, overrideAccess: true })
  if (!quizExists.docs.length) {
    const sample = [
      { question: 'What is the capital of France?', options: [{ text: 'Paris', isCorrect: true }, { text: 'Rome', isCorrect: false }, { text: 'Berlin', isCorrect: false }, { text: 'Madrid', isCorrect: false }] },
      { question: 'What is 9 + 10?', options: [{ text: '19', isCorrect: true }, { text: '21', isCorrect: false }, { text: '18', isCorrect: false }] },
      { question: 'The sun rises in the east.', type: 'TRUE_FALSE', options: [{ text: 'True', isCorrect: true }, { text: 'False', isCorrect: false }] },
    ]
    for (const q of sample) {
      await payload.create({ collection: 'quiz-questions', data: { question: q.question, type: q.type ?? 'MULTIPLE_CHOICE', options: q.options, difficulty: 'EASY', points: 10, isActive: true } as never, overrideAccess: true })
    }
    console.log('Created sample quiz questions.')
  }

  const gameExists = await payload.find({ collection: 'games', where: { slug: { equals: 'quiz-easy' } }, limit: 1, overrideAccess: true })
  if (!gameExists.docs.length) {
    await payload.create({
      collection: 'games',
      data: {
        name: 'Quiz — Easy',
        slug: 'quiz-easy',
        description: 'Answer 5 quick questions correctly to earn a reward.',
        type: 'QUIZ',
        difficulty: 'EASY',
        status: 'ACTIVE',
        featured: true,
        reward: { mode: 'FIXED', amount: 50, minScorePercent: 60 },
        maxAttemptsPerDay: 10,
        dailyRewardedPlays: 5,
        cooldownSeconds: 10,
        durationSeconds: 180,
        config: { questionCount: 5, secondsPerQuestion: 20 },
      } as never,
      overrideAccess: true,
    })
    await payload.create({
      collection: 'games',
      data: {
        name: 'Sudoku — Easy',
        slug: 'sudoku-easy',
        description: 'Solve an easy Sudoku puzzle.',
        type: 'SUDOKU',
        difficulty: 'EASY',
        status: 'ACTIVE',
        featured: true,
        reward: { mode: 'FIXED', amount: 100, minScorePercent: 100 },
        maxAttemptsPerDay: 5,
        dailyRewardedPlays: 3,
        cooldownSeconds: 30,
        durationSeconds: 600,
        config: { sudokuSource: 'GENERATED', minSolveSeconds: 20 },
      } as never,
      overrideAccess: true,
    })
    await payload.create({
      collection: 'games',
      data: {
        name: 'Spin the Wheel',
        slug: 'spin-the-wheel',
        description: 'One free spin a day — see what you win.',
        type: 'SPIN_WHEEL',
        difficulty: 'EASY',
        status: 'ACTIVE',
        featured: true,
        reward: { mode: 'FIXED', amount: 0, minScorePercent: 0 },
        maxAttemptsPerDay: 1,
        dailyRewardedPlays: 1,
        cooldownSeconds: 0,
        durationSeconds: 60,
        config: {
          segments: [
            { label: '₹1', amount: 100, weight: 3, color: '#6D5DF6' },
            { label: '₹2', amount: 200, weight: 2, color: '#3B82F6' },
            { label: 'Try again', amount: 0, weight: 4, color: '#34D399' },
            { label: '₹5', amount: 500, weight: 1, color: '#F59E0B' },
            { label: '₹1', amount: 100, weight: 3, color: '#F87171' },
            { label: '₹10', amount: 1000, weight: 0.3, color: '#22D3EE' },
          ],
        },
      } as never,
      overrideAccess: true,
    })
    console.log('Created sample games.')
  }

  const campaignExists = await payload.find({ collection: 'campaigns', where: { slug: { equals: 'welcome-campaign' } }, limit: 1, overrideAccess: true })
  if (!campaignExists.docs.length) {
    await payload.create({
      collection: 'campaigns',
      data: {
        name: 'Welcome campaign',
        slug: 'welcome-campaign',
        description: 'Complete any task and play any game once to claim a welcome bonus.',
        rewardAmount: 500,
        rewardType: 'CASH',
        requiredActions: [
          { type: 'TASKS_COMPLETED', target: 1, label: 'Complete 1 task' },
          { type: 'GAMES_PLAYED', target: 1, label: 'Play 1 game' },
        ],
        perUserLimit: 1,
        status: 'ACTIVE',
        featured: true,
      } as never,
      overrideAccess: true,
    })
    console.log('Created sample campaign.')
  }

  console.log('Seed complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})