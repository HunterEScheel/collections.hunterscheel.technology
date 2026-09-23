export const FLAW_SEVERITIES = [
  { key: 'quirk', label: 'Quirk', bpRefund: 5 },
  { key: 'flaw', label: 'Flaw', bpRefund: 15 },
  { key: 'vice', label: 'Vice', bpRefund: 40 },
] as const

export type FlawSeverity = (typeof FLAW_SEVERITIES)[number]['key']

export const FLAW_BP_BY_SEVERITY: Record<FlawSeverity, number> = {
  quirk: 5,
  flaw: 15,
  vice: 40,
}

export interface Flaw {
  id: string
  description: string
  severity: FlawSeverity
}

export function flawRefundTotal(flaws: Flaw[]): number {
  return flaws.reduce((sum, f) => sum + FLAW_BP_BY_SEVERITY[f.severity], 0)
}
