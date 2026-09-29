'use client'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { api, ApiError } from '@/lib/api-client'
import { money } from '@/lib/format'

interface PayoutMethod { id: number; type: 'UPI' | 'BANK'; label: string; maskedDetails: string; isDefault: boolean }

export function WithdrawDialog({ available, onDone }: { available: number; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [methods, setMethods] = useState<PayoutMethod[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [addingMethod, setAddingMethod] = useState(false)

  const loadMethods = () =>
    api.get<{ methods: PayoutMethod[] }>('/payout-methods').then((d) => {
      setMethods(d.methods)
      setSelected((prev) => prev ?? d.methods.find((m) => m.isDefault)?.id ?? d.methods[0]?.id ?? null)
    })

  useEffect(() => {
    if (open) loadMethods()
  }, [open])

  const submit = async () => {
    if (!selected) return toast.error('Add a payout method first.')
    setBusy(true)
    try {
      await api.post('/withdrawals', { amount, payoutMethodId: selected })
      toast.success('Withdrawal requested')
      setOpen(false)
      setAmount('')
      onDone()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not request this withdrawal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="marigold" size="sm" className="mt-5">Withdraw</Button>
      </DialogTrigger>
      <DialogContent title="Withdraw funds">
        {addingMethod ? (
          <AddMethodForm
            onAdded={(m) => {
              setMethods((prev) => [...(prev ?? []), m])
              setSelected(m.id)
              setAddingMethod(false)
            }}
            onCancel={() => setAddingMethod(false)}
          />
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
              <p className="mt-1 text-[12px] text-ink-faint">Available: {money(available)}</p>
            </div>
            <div>
              <Label>Payout method</Label>
              {!methods ? (
                <p className="text-[13px] text-ink-faint">Loading…</p>
              ) : methods.length === 0 ? (
                <Button variant="outline" size="sm" onClick={() => setAddingMethod(true)}>Add a payout method</Button>
              ) : (
                <div className="space-y-2">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelected(m.id)}
                      className={`flex w-full items-center justify-between rounded-control border px-4 py-3 text-left text-[14px] ${
                        selected === m.id ? 'border-banyan bg-banyan-tint' : 'border-ink/15'
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className="text-ink-faint">{m.maskedDetails}</span>
                    </button>
                  ))}
                  <button onClick={() => setAddingMethod(true)} className="text-[13px] text-ink-faint underline">Add another method</button>
                </div>
              )}
            </div>
            <Button className="w-full" disabled={busy || !amount || !selected} onClick={submit}>
              {busy ? 'Requesting…' : 'Request withdrawal'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddMethodForm({ onAdded, onCancel }: { onAdded: (m: PayoutMethod) => void; onCancel: () => void }) {
  const [type, setType] = useState<'UPI' | 'BANK'>('UPI')
  const [upiId, setUpiId] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [holderName, setHolderName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      const method = await api.post<{ method: PayoutMethod }>('/payout-methods', {
        type,
        label: type === 'UPI' ? 'UPI' : 'Bank account',
        upiId: type === 'UPI' ? upiId : undefined,
        accountNumber: type === 'BANK' ? accountNumber : undefined,
        ifsc: type === 'BANK' ? ifsc : undefined,
        holderName: holderName || undefined,
      })
      toast.success('Payout method added')
      onAdded(method.method)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not add this payout method.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setType('UPI')} className={`flex-1 rounded-control border py-2.5 text-[14px] ${type === 'UPI' ? 'border-banyan bg-banyan-tint' : 'border-ink/15'}`}>UPI</button>
        <button onClick={() => setType('BANK')} className={`flex-1 rounded-control border py-2.5 text-[14px] ${type === 'BANK' ? 'border-banyan bg-banyan-tint' : 'border-ink/15'}`}>Bank account</button>
      </div>
      {type === 'UPI' ? (
        <div>
          <Label htmlFor="upi">UPI ID</Label>
          <Input id="upi" placeholder="name@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
        </div>
      ) : (
        <>
          <div>
            <Label htmlFor="acc">Account number</Label>
            <Input id="acc" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div>
            <Label htmlFor="ifsc">IFSC code</Label>
            <Input id="ifsc" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} />
          </div>
        </>
      )}
      <div>
        <Label htmlFor="holder">Account holder name</Label>
        <Input id="holder" value={holderName} onChange={(e) => setHolderName(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Back</Button>
        <Button className="flex-1" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save method'}</Button>
      </div>
    </div>
  )
}
