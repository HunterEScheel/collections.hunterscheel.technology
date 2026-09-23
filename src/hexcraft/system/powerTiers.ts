export interface PowerTier {
  name: string
  playerBP: number
  enemyBP: number
}

export const POWER_TIERS: readonly PowerTier[] = [
  { name: 'Peasants', playerBP: 150, enemyBP: 750 },
  { name: 'Soldiers', playerBP: 300, enemyBP: 1500 },
  { name: 'New Adventurers', playerBP: 400, enemyBP: 2000 },
  { name: 'Guild Regulars', playerBP: 550, enemyBP: 2750 },
  { name: 'Proven Hand', playerBP: 700, enemyBP: 3500 },
  { name: 'Guild Veteran', playerBP: 900, enemyBP: 4500 },
  { name: 'Guild Elite', playerBP: 1100, enemyBP: 5500 },
  { name: 'National Elite', playerBP: 1400, enemyBP: 7000 },
  { name: 'World Savior', playerBP: 2000, enemyBP: 10000 },
] as const
