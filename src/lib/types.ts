export const FIREWORK_TYPES = [
  'mortars',
  'comets',
  'parachutes',
  'fountain',
  'other',
  'buyers_choice',
] as const

export const DEFAULT_FIREWORK_TYPE = 'buyers_choice' as const

export type FireworkType = (typeof FIREWORK_TYPES)[number]

export interface PublicEvent {
  id: string
  name: string
  event_date: string | null
  description: string | null
  created_at: string
}

export interface AdminEvent extends PublicEvent {
  secret: string
}

export interface Contribution {
  id: string
  event_id: string
  contributor_name: string
  amount: number
  firework_type: FireworkType
  firework_other: string | null
  created_at: string
}

export interface Purchase {
  id: string
  event_id: string
  item_name: string
  firework_type: FireworkType | null
  cost: number
  quantity: number
  notes: string | null
  created_at: string
}

export function fireworkLabel(type: FireworkType, other?: string | null): string {
  if (type === 'buyers_choice') return "Buyer's choice"
  if (type === 'other') return other ? `Other: ${other}` : 'Other'
  if (type === 'comets') return 'Risers' // umbrella for comets, tails, and pearls
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}
