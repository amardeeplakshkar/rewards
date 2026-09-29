'use client'
import React, { useEffect, useState } from 'react'
import { Gutter } from '@payloadcms/ui'

interface Metrics {
  range: string
  totalUsers: number
  newUsers: number
  activeUsers: number
  rewardsIssuedAllTime: number
  rewardsIssuedRange: number
  totalWithdrawalsCompleted: number
  withdrawalsPending: number
  withdrawalsCompleted: number
  withdrawalsFailed: number
  taskCompletions: number
  gamesPlayed: number
  campaignClaims: number
  referralConversions: number
}

const money = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const RANGES: { value: string; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
]

const Card: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 'var(--style-radius-m)', padding: 20, background: 'var(--theme-elevation-0)' }}>
    <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.1 }}>{value}</div>
    {sub ? <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>{sub}</div> : null}
  </div>
)

export const Dashboard: React.FC = () => {
  const [range, setRange] = useState('today')
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/metrics?range=${range}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => setMetrics(json.ok ? json.data : null))
      .finally(() => setLoading(false))
  }, [range])

  return (
    <Gutter>
      <div style={{ paddingTop: 24, paddingBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1px solid var(--theme-elevation-150)',
                  background: range === r.value ? 'var(--theme-elevation-800)' : 'transparent',
                  color: range === r.value ? 'var(--theme-elevation-0)' : 'inherit',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {loading || !metrics ? (
          <div style={{ opacity: 0.6 }}>Loading metrics…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
              <Card label="Total users" value={metrics.totalUsers.toLocaleString('en-IN')} />
              <Card label="New users" value={metrics.newUsers.toLocaleString('en-IN')} sub={RANGES.find((r) => r.value === range)?.label} />
              <Card label="Active users" value={metrics.activeUsers.toLocaleString('en-IN')} sub="Logged in during range" />
              <Card label="Rewards issued (all time)" value={money(metrics.rewardsIssuedAllTime)} />
              <Card label="Rewards issued" value={money(metrics.rewardsIssuedRange)} sub={RANGES.find((r) => r.value === range)?.label} />
              <Card label="Total withdrawals paid" value={money(metrics.totalWithdrawalsCompleted)} sub="All time, completed" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <Card label="Withdrawals pending" value={metrics.withdrawalsPending.toLocaleString('en-IN')} />
              <Card label="Withdrawals completed" value={metrics.withdrawalsCompleted.toLocaleString('en-IN')} />
              <Card label="Withdrawals failed" value={metrics.withdrawalsFailed.toLocaleString('en-IN')} />
              <Card label="Task completions" value={metrics.taskCompletions.toLocaleString('en-IN')} />
              <Card label="Games played" value={metrics.gamesPlayed.toLocaleString('en-IN')} />
              <Card label="Campaign claims" value={metrics.campaignClaims.toLocaleString('en-IN')} />
              <Card label="Referral conversions" value={metrics.referralConversions.toLocaleString('en-IN')} />
            </div>
          </>
        )}
      </div>
    </Gutter>
  )
}
