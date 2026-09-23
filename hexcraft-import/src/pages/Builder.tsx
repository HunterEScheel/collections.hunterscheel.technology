import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  bpBreakdown,
  emptyCharacter,
  ensureCombatSkills,
  restoreToMax,
  type Character,
} from '../system/character'
import { POWER_TIERS } from '../system/powerTiers'
import {
  BP_PER_1_EP,
  BP_PER_3_HP,
  DEFAULT_SPEED,
  SPEED_STEP,
  epCost,
  hpCost,
  speedCost,
} from '../system/costs'
import { TierSelector } from '../components/TierSelector'
import { NumberStepper } from '../components/NumberStepper'
import { AttributesEditor } from '../components/AttributesEditor'
import { MagicSchoolsEditor } from '../components/MagicSchoolsEditor'
import { MagicMediumsEditor } from '../components/MagicMediumsEditor'
import { SkillsEditor } from '../components/SkillsEditor'
import { TethersEditor } from '../components/TethersEditor'
import { FlawsEditor } from '../components/FlawsEditor'
import { BPBar } from '../components/BPBar'
import {
  getCharacter,
  saveCharacter,
  updateCharacter,
} from '../lib/characters'
import { supabaseConfigured } from '../lib/supabase'

const STEPS = [
  { key: 'name', label: 'Name' },
  { key: 'bp', label: 'BP Management' },
  { key: 'pools', label: 'HP, EP & Speed' },
  { key: 'tethers', label: 'Tethers & Flaws' },
  { key: 'attributes', label: 'Attributes' },
  { key: 'skills', label: 'Skills' },
  { key: 'magic', label: 'Magic' },
] as const

const DEFAULT_TIER = POWER_TIERS[2]

export function Builder() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [character, setCharacter] = useState<Character>(() =>
    emptyCharacter(DEFAULT_TIER.name, DEFAULT_TIER.playerBP),
  )
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [customBpInput, setCustomBpInput] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getCharacter(id).then((row) => {
      if (cancelled) return
      if (row) setCharacter(ensureCombatSkills(row.data))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const breakdown = useMemo(() => bpBreakdown(character), [character])

  const patch = (p: Partial<Character>) =>
    setCharacter((c) => ({ ...c, ...p }))

  const handleSave = async () => {
    setSaving(true)
    const normalized = restoreToMax(character)
    if (isEdit && id) {
      const ok = await updateCharacter(id, normalized)
      setSaving(false)
      if (ok) navigate(`/sheet/${id}`)
    } else {
      const newId = await saveCharacter(normalized)
      setSaving(false)
      if (newId) navigate(`/sheet/${newId}`)
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading character…</p>
  }

  const currentStep = STEPS[step]
  const over = breakdown.total > breakdown.effectiveBudget
  const obligationShort =
    breakdown.obligationWeight < character.obligationThreshold
  const canSubmit =
    !over && !obligationShort && character.name.trim().length > 0
  const isLast = step === STEPS.length - 1

  return (
    <div className="space-y-6">
      <StepProgress current={step} onJump={setStep} />

      <div className="sticky top-[64px] z-10 -mx-4 px-4 py-3 bg-zinc-950/90 backdrop-blur border-y border-zinc-800">
        <BPBar breakdown={breakdown} />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 min-h-[20rem]">
        {currentStep.key === 'name' && (
          <StepBlock title="Name" subtitle="What are they called?">
            <label className="flex flex-col gap-1 max-w-md">
              <span className="text-xs text-zinc-500">Character name</span>
              <input
                value={character.name}
                onChange={(e) => patch({ name: e.target.value })}
                autoFocus
                placeholder="Name"
                className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100"
              />
            </label>
          </StepBlock>
        )}

        {currentStep.key === 'bp' && (
          <StepBlock
            title="BP Management"
            subtitle={
              isEdit
                ? 'Add bonus BP earned in play.'
                : 'Pick a power tier — this sets your base BP budget.'
            }
          >
            {isEdit ? (
              (() => {
                const remaining =
                  breakdown.effectiveBudget - breakdown.total
                const addBp = (delta: number) => {
                  if (!Number.isFinite(delta) || delta === 0) return
                  patch({
                    bonusBp: Math.max(0, (character.bonusBp ?? 0) + delta),
                  })
                }
                const parsedInput = () => {
                  if (customBpInput.trim() === '') return 1
                  const n = Math.abs(Number(customBpInput))
                  return Number.isFinite(n) && n > 0 ? n : 0
                }
                const applyCustom = () => {
                  const n = parsedInput()
                  if (n === 0) return
                  addBp(n)
                  setCustomBpInput('')
                }
                const removeCustom = () => {
                  const n = parsedInput()
                  if (n === 0) return
                  addBp(-n)
                  setCustomBpInput('')
                }
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-zinc-500">Remaining</div>
                      <div
                        className={
                          'font-mono text-2xl ' +
                          (remaining < 0
                            ? 'text-rose-400'
                            : 'text-emerald-300')
                        }
                      >
                        {remaining}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={applyCustom}
                        className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-sm"
                      >
                        + Add
                      </button>
                      <input
                        type="number"
                        value={customBpInput}
                        onChange={(e) => setCustomBpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyCustom()
                        }}
                        placeholder="1"
                        className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-2 text-sm text-zinc-100 text-right font-mono"
                      />
                      <button
                        type="button"
                        onClick={removeCustom}
                        className="rounded bg-rose-900/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 px-3 py-2 text-sm"
                      >
                        − Remove
                      </button>
                    </div>
                    <div className="text-xs text-zinc-500 font-mono">
                      Bonus BP earned: +{character.bonusBp ?? 0}
                    </div>
                  </div>
                )
              })()
            ) : (
              <TierSelector
                value={character.tierName}
                onChange={(tierName, bpBudget) =>
                  patch({ tierName, bpBudget })
                }
              />
            )}
          </StepBlock>
        )}

        {currentStep.key === 'pools' && (
          <StepBlock
            title="HP, EP & Speed"
            subtitle="Resource pools and movement. HP keeps you alive; EP fuels spells; speed is feet per move action."
          >
            <Subsection
              title="Hit Points"
              meta={`${BP_PER_3_HP} BP per 3 HP · ${hpCost(character.hp)} BP`}
            >
              <NumberStepper
                label="HP"
                value={character.hp}
                onChange={(hp) => patch({ hp })}
                min={0}
                max={300}
                step={3}
              />
            </Subsection>
            <Subsection
              title="Energy Points"
              meta={`${BP_PER_1_EP} BP per 1 EP · ${epCost(character.ep)} BP`}
            >
              <NumberStepper
                label="EP"
                value={character.ep}
                onChange={(ep) => patch({ ep })}
                min={0}
                max={100}
              />
            </Subsection>
            <Subsection
              title="Movement Speed"
              meta={`Default ${DEFAULT_SPEED} ft · school cost curve · ${speedCost(character.speed ?? DEFAULT_SPEED)} BP`}
            >
              <NumberStepper
                label="Speed (ft)"
                value={character.speed ?? DEFAULT_SPEED}
                onChange={(speed) => patch({ speed })}
                min={0}
                max={40}
                step={SPEED_STEP}
              />
            </Subsection>
          </StepBlock>
        )}

        {currentStep.key === 'tethers' && (
          <StepBlock
            title="Tethers & Flaws"
            subtitle="Both refund BP. Tethers (obligations) carry an obligation weight you must meet; Flaws (quirk/flaw/vice) do not."
          >
            <Subsection
              title="Tethers"
              meta={`+${breakdown.tetherRefund} BP · weight ${breakdown.obligationWeight}`}
            >
              <ObligationGate
                weight={breakdown.obligationWeight}
                threshold={character.obligationThreshold}
                onThresholdChange={(obligationThreshold) =>
                  patch({ obligationThreshold })
                }
              />
              <TethersEditor
                value={character.tethers}
                onChange={(tethers) => patch({ tethers })}
              />
            </Subsection>
            <Subsection title="Flaws" meta={`+${breakdown.flawRefund} BP`}>
              <FlawsEditor
                value={character.flaws}
                onChange={(flaws) => patch({ flaws })}
              />
            </Subsection>
          </StepBlock>
        )}

        {currentStep.key === 'attributes' && (
          <StepBlock
            title="Attributes"
            subtitle={`Each attribute follows the skill cost curve starting at level 5 (range −5 to +5). Total: ${breakdown.attributes} BP.`}
          >
            <AttributesEditor
              value={character.attributes}
              onChange={(attributes) => patch({ attributes })}
            />
          </StepBlock>
        )}

        {currentStep.key === 'skills' && (
          <StepBlock
            title="Skills"
            subtitle="Combat skills are seeded at level 0 and can't be removed. Add as many non-combat skills as you can afford."
          >
            <SkillsEditor
              value={character.skills}
              onChange={(skills) => patch({ skills })}
            />
          </StepBlock>
        )}

        {currentStep.key === 'magic' && (
          <StepBlock
            title="Magic"
            subtitle="Casting a spell requires both a school (the verb) and a medium (the substance). Leave at 0 for non-magical characters."
          >
            <Subsection
              title="Schools"
              meta={`Skill cost curve from level 5 · ${breakdown.magicSchools} BP`}
            >
              <MagicSchoolsEditor
                value={character.magicSchools}
                onChange={(magicSchools) => patch({ magicSchools })}
              />
            </Subsection>
            <Subsection
              title="Mediums"
              meta={`Skill cost curve from level 4 · ${breakdown.magicMediums} BP`}
            >
              <MagicMediumsEditor
                value={character.magicMediums}
                onChange={(magicMediums) => patch({ magicMediums })}
              />
            </Subsection>
          </StepBlock>
        )}
      </div>

      {isLast && over && (
        <div className="rounded border border-rose-700 bg-rose-900/30 p-3 text-sm text-rose-200">
          Over budget by {breakdown.total - breakdown.effectiveBudget} BP. Step
          back and reduce something — or add a tether/flaw for a refund — before
          saving.
        </div>
      )}
      {isLast && obligationShort && (
        <div className="rounded border border-rose-700 bg-rose-900/30 p-3 text-sm text-rose-200">
          Obligation weight is {breakdown.obligationWeight} but the DM&apos;s
          threshold is {character.obligationThreshold}. Add tethers to reach it.
        </div>
      )}
      {isLast && !character.name.trim() && (
        <div className="rounded border border-amber-700 bg-amber-900/30 p-3 text-sm text-amber-200">
          Name is required.
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 px-4 py-2 text-sm"
        >
          ← Back
        </button>
        <div>
          {isEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !canSubmit || !supabaseConfigured}
              title={
                !supabaseConfigured
                  ? 'Supabase not configured'
                  : !character.name.trim()
                    ? 'Name is required'
                    : over
                      ? 'Over BP budget'
                      : obligationShort
                        ? 'Obligation threshold not met'
                        : undefined
              }
              className="rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-zinc-950"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
        {!isLast ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="rounded bg-amber-500 hover:bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950"
          >
            Next →
          </button>
        ) : !isEdit ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSubmit || !supabaseConfigured}
            title={
              !supabaseConfigured
                ? 'Supabase not configured'
                : !character.name.trim()
                  ? 'Name is required'
                  : over
                    ? 'Over BP budget'
                    : obligationShort
                      ? 'Obligation threshold not met'
                      : undefined
            }
            className="rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-zinc-950"
          >
            {saving ? 'Saving…' : 'Create character'}
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}

interface StepProgressProps {
  current: number
  onJump: (i: number) => void
}

function StepProgress({ current, onJump }: StepProgressProps) {
  return (
    <ol className="flex flex-wrap gap-1 text-xs">
      {STEPS.map((s, i) => {
        const active = i === current
        const done = i < current
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onJump(i)}
              className={
                'rounded px-2 py-1 border ' +
                (active
                  ? 'border-amber-400 bg-amber-400/10 text-amber-200'
                  : done
                    ? 'border-emerald-700 bg-emerald-900/30 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-500')
              }
            >
              {i + 1}. {s.label}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

interface StepBlockProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

function StepBlock({ title, subtitle, children }: StepBlockProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
        {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function ObligationGate({
  weight,
  threshold,
  onThresholdChange,
}: {
  weight: number
  threshold: number
  onThresholdChange: (v: number) => void
}) {
  const ok = weight >= threshold
  return (
    <div className="mb-3 rounded border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-xs text-zinc-500">
          Obligation threshold (DM-set)
        </div>
        <div className="text-xs text-zinc-500">
          Sum of tether tiers (I/II/III weighted 1/2/3) must be at least this.
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min={0}
          max={20}
          value={threshold}
          onChange={(e) =>
            onThresholdChange(Math.max(0, Number(e.target.value) || 0))
          }
          className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 text-right"
        />
        <span
          className={
            'font-mono text-sm ' + (ok ? 'text-emerald-300' : 'text-rose-300')
          }
        >
          {weight} / {threshold} {ok ? '✓' : '✗'}
        </span>
      </div>
    </div>
  )
}

function Subsection({
  title,
  meta,
  children,
}: {
  title: string
  meta?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-medium text-zinc-300">{title}</h3>
        {meta && (
          <span className="text-xs text-zinc-500 font-mono">{meta}</span>
        )}
      </div>
      {children}
    </div>
  )
}
