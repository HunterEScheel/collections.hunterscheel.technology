export const TETHER_TIERS = [
  { tier: 1, label: 'Minor', bpRefund: 5 },
  { tier: 2, label: 'Major', bpRefund: 15 },
  { tier: 3, label: 'Binding', bpRefund: 40 },
] as const

export type TetherTier = (typeof TETHER_TIERS)[number]['tier']

export const TETHER_BP_BY_TIER: Record<TetherTier, number> = {
  1: 5,
  2: 15,
  3: 40,
}

export interface Tether {
  id: string
  description: string
  tier: TetherTier
}

export function tetherRefundTotal(tethers: Tether[]): number {
  return tethers.reduce((sum, t) => sum + TETHER_BP_BY_TIER[t.tier], 0)
}

// Obligation weight = sum of tiers. Tier I=1, II=2, III=3.
// DM sets a minimum threshold the character must meet.
export function tetherObligationWeight(tethers: Tether[]): number {
  return tethers.reduce((sum, t) => sum + t.tier, 0)
}
