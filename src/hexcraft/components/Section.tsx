import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  subtitle?: string
  cost?: number
  children: ReactNode
}

export function Section({ title, subtitle, cost, children }: SectionProps) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <header className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          {subtitle && (
            <p className="text-xs text-zinc-500">{subtitle}</p>
          )}
        </div>
        {cost !== undefined && (
          <span className="text-sm text-amber-300 font-mono">
            {cost} BP
          </span>
        )}
      </header>
      {children}
    </section>
  )
}
