export interface PayoutDestination {
  method: 'UPI' | 'BANK'
  upiId?: string
  accountNumber?: string
  ifsc?: string
  holderName?: string
  bankName?: string
}

export interface PayoutRequest {
  withdrawalId: number
  amount: number
  currency: string
  destination: PayoutDestination
}

export interface PayoutResult {
  status: 'INITIATED' | 'COMPLETED' | 'FAILED'
  providerReference?: string
  message?: string
}

/** Implement this to plug in a real payout provider (UPI/bank transfer API). */
export interface PayoutProvider {
  name: string
  payout(req: PayoutRequest): Promise<PayoutResult>
}
