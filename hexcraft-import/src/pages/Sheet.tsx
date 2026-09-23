import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  combatSkillLevel,
  ensureCombatSkills,
  equippedArmorEvasionReduction,
  evasion,
  normalizeCurrentValues,
  restoreToMax,
  type BodyPart,
  type Character,
} from '../system/character'
import { skillCost } from '../system/costs'
import { ATTRIBUTES } from '../system/attributes'
import { COMBAT_SKILLS, isCombatSkillId } from '../system/combatSkills'
import { MAGIC_MEDIUMS, MAGIC_SCHOOLS } from '../system/magicSchools'
import { TETHER_TIERS } from '../system/tethers'
import { FLAW_SEVERITIES } from '../system/flaws'
import { getCharacter, updateCharacter } from '../lib/characters'
import { supabaseConfigured } from '../lib/supabase'
import { BodyDiagramEditor } from '../components/BodyDiagramEditor'
import { InventoryEditor } from '../components/InventoryEditor'
import { QuickCast } from '../components/QuickCast'
import { SavedSpells } from '../components/SavedSpells'
import { TakeDamagePanel } from '../components/TakeDamagePanel'
import { DeathSavePanel } from '../components/DeathSavePanel'

type Tab = 'general' | 'combat' | 'spellcasting' | 'description'

const TABS: { key: Tab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'combat', label: 'Combat' },
  { key: 'spellcasting', label: 'Spellcasting' },
  { key: 'description', label: 'Description' },
]

const ATTRIBUTE_ABBR: Record<(typeof ATTRIBUTES)[number], string> = {
  Power: 'POW',
  Agility: 'AGI',
  Intelligence: 'INT',
  Sense: 'SEN',
  Influence: 'INF',
}

export function Sheet() {
  const { id } = useParams<{ id: string }>()
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [tab, setTab] = useState<Tab>('combat')
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  )
  const [adjusting, setAdjusting] = useState<'hp' | 'ep' | null>(null)
  const saveTimer = useRef<number | null>(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getCharacter(id).then((row) => {
      if (cancelled) return
      if (row) setCharacter(ensureCombatSkills(row.data))
      else setMissing(true)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!character || !id) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    setSavingState('saving')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const ok = await updateCharacter(id, character)
      setSavingState(ok ? 'saved' : 'idle')
    }, 600)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [character, id])

  const { combatSkills, otherSkills } = useMemo(() => {
    if (!character) return { combatSkills: [], otherSkills: [] }
    const combatById = new Map(
      character.skills
        .filter((s) => isCombatSkillId(s.id))
        .map((s) => [s.id, s]),
    )
    const combat = COMBAT_SKILLS.map(
      (def) =>
        combatById.get(def.id) ?? { id: def.id, name: def.name, level: 0 },
    )
    const other = character.skills
      .filter((s) => !isCombatSkillId(s.id))
      .sort((a, b) => b.level - a.level)
    return { combatSkills: combat, otherSkills: other }
  }, [character])

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>
  if (missing || !character) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">Character not found.</p>
        <Link to="/" className="text-sm text-amber-300 hover:text-amber-200">
          ← Back to roster
        </Link>
      </div>
    )
  }

  const adjustHp = (delta: number) =>
    setCharacter((c) =>
      c ? normalizeCurrentValues({ ...c, currentHp: c.currentHp + delta }) : c,
    )
  const adjustEp = (delta: number) =>
    setCharacter((c) =>
      c ? normalizeCurrentValues({ ...c, currentEp: c.currentEp + delta }) : c,
    )
  const adjustTempHp = (delta: number) =>
    setCharacter((c) =>
      c
        ? normalizeCurrentValues({
            ...c,
            tempHp: (c.tempHp ?? 0) + delta,
          })
        : c,
    )
  const longRest = () => setCharacter((c) => (c ? restoreToMax(c) : c))
  const setGold = (gold: number) =>
    setCharacter((c) => (c ? { ...c, gold: Math.max(0, gold) } : c))
  const setInventory = (inventory: typeof character.inventory) =>
    setCharacter((c) => (c ? { ...c, inventory } : c))
  const setBodyDescriptions = (bodyDescriptions: Partial<Record<BodyPart, string>>) =>
    setCharacter((c) => (c ? { ...c, bodyDescriptions } : c))

  const hasMagic =
    Object.values(character.magicSchools).some((v) => v > 0) ||
    Object.values(character.magicMediums).some((v) => v > 0)

  return (
    <div className="space-y-4">
      {/* Band 1 — Identity strip */}
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-2 border-b border-zinc-800 pb-2">
        <h2 className="text-xl font-medium uppercase tracking-[0.18em] text-zinc-100">
          {character.name || 'Unnamed'}
        </h2>
        <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          {character.tierName}
        </span>
        {character.currentHp === 0 && (
          <span
            title="At 0 HP — rolling death saves"
            className="rounded-sm bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-950"
          >
            Down
          </span>
        )}
        {character.tethers.map((t) => {
          const tierLabel =
            TETHER_TIERS.find((o) => o.tier === t.tier)?.label ??
            `Tier ${t.tier}`
          return (
            <span
              key={t.id}
              title={`Tether · ${tierLabel}`}
              className="border-l-2 border-sky-600/70 pl-1.5 text-[11px] text-sky-300"
            >
              {t.description || 'Untitled tether'}
            </span>
          )
        })}
        {character.flaws.map((f) => {
          const sevLabel =
            FLAW_SEVERITIES.find((o) => o.key === f.severity)?.label ??
            f.severity
          return (
            <span
              key={f.id}
              title={`Flaw · ${sevLabel}`}
              className="border-l-2 border-rose-600/70 pl-1.5 text-[11px] text-rose-300"
            >
              {f.description || 'Untitled flaw'}
            </span>
          )
        })}
        <div className="ml-auto flex items-baseline gap-4 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          {savingState !== 'idle' && (
            <span
              className={
                savingState === 'saving' ? 'text-zinc-400' : 'text-emerald-400'
              }
            >
              <span aria-hidden>●</span>{' '}
              {savingState === 'saving' ? 'Saving' : 'Saved'}
            </span>
          )}
          {id && (
            <Link
              to={`/builder/${id}`}
              className="text-amber-300 hover:text-amber-200"
            >
              Edit ▸
            </Link>
          )}
        </div>
      </header>

      {/* Band 2 — Stats ribbon (tactical HUD) */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-zinc-800 pb-2">
        <Stat
          label="HP"
          tooltip="Click to adjust"
          onClick={() => setAdjusting('hp')}
        >
          <span className="font-mono text-base whitespace-nowrap leading-none text-rose-300">
            {character.currentHp}
            <span className="text-zinc-500 text-[10px]"> /{character.hp}</span>
            {(character.tempHp ?? 0) > 0 && (
              <span className="text-sky-300"> +{character.tempHp}</span>
            )}
          </span>
        </Stat>
        <Stat
          label="EP"
          tooltip="Click to adjust"
          onClick={() => setAdjusting('ep')}
        >
          <span className="font-mono text-base whitespace-nowrap leading-none text-sky-300">
            {character.currentEp}
            <span className="text-zinc-500 text-[10px]"> /{character.ep}</span>
          </span>
        </Stat>
        <Stat
          label="EVA"
          value={evasion(character)}
          color="text-amber-300"
          tooltip={evasionBreakdown(character)}
        />
        <RibbonRule />
        {ATTRIBUTES.map((a) => (
          <Stat
            key={a}
            label={ATTRIBUTE_ABBR[a]}
            value={fmt(character.attributes[a] ?? 0)}
            color="text-zinc-100"
          />
        ))}
        <RibbonRule />
        <Stat
          label="DDG"
          value={fmt(combatSkillLevel(character, 'combat-dodge'))}
          color="text-amber-300"
          tooltip="Dodge"
        />
        <Stat
          label="GRT"
          value={fmt(combatSkillLevel(character, 'combat-grit'))}
          color="text-amber-300"
          tooltip="Grit"
        />
        <Stat
          label="RSL"
          value={fmt(combatSkillLevel(character, 'combat-resolve'))}
          color="text-amber-300"
          tooltip="Resolve"
        />
        <button
          type="button"
          onClick={longRest}
          title="Long rest — restore HP & EP, clear death saves"
          aria-label="Long rest"
          className="ml-auto self-end inline-flex items-center justify-center rounded bg-emerald-700/90 hover:bg-emerald-600 border border-emerald-500/40 h-8 w-8 text-emerald-50 transition"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 2 C8.6 4, 10.5 5, 10.5 8 C10.5 10, 9.2 11.2, 8 12 C6.8 11.2, 5.5 10, 5.5 8 C5.5 5, 7.4 4, 8 2 Z" />
            <rect
              x="2"
              y="13"
              width="12"
              height="1.5"
              rx="0.6"
              transform="rotate(-12 8 13.75)"
            />
            <rect
              x="2"
              y="13"
              width="12"
              height="1.5"
              rx="0.6"
              transform="rotate(12 8 13.75)"
            />
          </svg>
        </button>
      </div>

      <nav className="flex gap-1 border-b border-zinc-800">
        {TABS.map((t) => {
          const active = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                'px-4 py-2 text-sm border-b-2 -mb-px transition ' +
                (active
                  ? 'border-amber-400 text-amber-200'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300')
              }
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      {tab === 'combat' && (
        <CombatTab
          character={character}
          combatSkills={combatSkills}
          onTakeDamage={(next) =>
            setCharacter((c) => (c ? normalizeCurrentValues(next) : c))
          }
        />
      )}

      {tab === 'spellcasting' && (
        <div className="space-y-3">
          {hasMagic && (
            <>
              <div className="rounded border border-sky-800/60 bg-sky-900/20 px-3 py-2 text-xs text-sky-200 flex items-start gap-2">
                <span aria-hidden className="font-bold">ⓘ</span>
                <span>
                  Spells can be amped on the fly: every extra 5 EP spent casting
                  raises your hit bonus <em>or</em> save DC by 1.
                </span>
              </div>
              <ReadOnlySection title="Quick cast" collapsible defaultOpen={false}>
                <QuickCast
                  schools={character.magicSchools}
                  mediums={character.magicMediums}
                  currentEp={character.currentEp}
                  savedSpells={character.savedSpells ?? []}
                  onCast={(cost) =>
                    setCharacter((c) =>
                      c
                        ? normalizeCurrentValues({
                            ...c,
                            currentEp: c.currentEp - cost,
                          })
                        : c,
                    )
                  }
                  onSave={(spell) =>
                    setCharacter((c) =>
                      c
                        ? {
                            ...c,
                            savedSpells: [
                              ...(c.savedSpells ?? []),
                              {
                                id: crypto.randomUUID(),
                                ...spell,
                              },
                            ],
                          }
                        : c,
                    )
                  }
                />
              </ReadOnlySection>
              <ReadOnlySection title="Saved spells">
                <SavedSpells
                  schools={character.magicSchools}
                  mediums={character.magicMediums}
                  savedSpells={character.savedSpells ?? []}
                  currentEp={character.currentEp}
                  onCast={(cost) =>
                    setCharacter((c) =>
                      c
                        ? normalizeCurrentValues({
                            ...c,
                            currentEp: c.currentEp - cost,
                          })
                        : c,
                    )
                  }
                  onRemove={(id) =>
                    setCharacter((c) =>
                      c
                        ? {
                            ...c,
                            savedSpells: (c.savedSpells ?? []).filter(
                              (s) => s.id !== id,
                            ),
                          }
                        : c,
                    )
                  }
                />
              </ReadOnlySection>
            </>
          )}
          {hasMagic ? (
            <>
              {Object.values(character.magicSchools).some((v) => v > 0) && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs uppercase tracking-wide text-zinc-500 mr-1">
                    Schools
                  </span>
                  {MAGIC_SCHOOLS.filter(
                    (s) => character.magicSchools[s] > 0,
                  ).map((s) => (
                    <SaveBadge
                      key={s}
                      label={s}
                      value={character.magicSchools[s]}
                    />
                  ))}
                </div>
              )}
              {Object.values(character.magicMediums).some((v) => v > 0) && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs uppercase tracking-wide text-zinc-500 mr-1">
                    Mediums
                  </span>
                  {MAGIC_MEDIUMS.filter(
                    (m) => character.magicMediums[m] > 0,
                  ).map((m) => (
                    <SaveBadge
                      key={m}
                      label={m}
                      value={character.magicMediums[m]}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500 italic">
              Non-magical character.
            </p>
          )}
        </div>
      )}

      {tab === 'general' && (
        <div className="space-y-3">
          <ReadOnlySection title="Gold">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={character.gold}
                onChange={(e) => setGold(Number(e.target.value) || 0)}
                className="w-32 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-amber-300 font-mono text-right"
              />
              <div className="flex gap-1">
                {[-10, -1, +1, +10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setGold(character.gold + d)}
                    className="rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-xs font-mono"
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </div>
          </ReadOnlySection>

          <ReadOnlySection title="Inventory">
            <InventoryEditor
              value={character.inventory}
              onChange={setInventory}
            />
          </ReadOnlySection>

          <ReadOnlySection title="Skills">
            {otherSkills.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No other skills.</p>
            ) : (
              <SkillList skills={otherSkills} />
            )}
          </ReadOnlySection>

        </div>
      )}

      {tab === 'description' && (
        <div className="space-y-3">
          <ReadOnlySection title="Character Description">
            <BodyDiagramEditor
              value={character.bodyDescriptions ?? {}}
              onChange={setBodyDescriptions}
            />
          </ReadOnlySection>
        </div>
      )}

      {!supabaseConfigured && (
        <div className="rounded border border-amber-700/50 bg-amber-900/20 p-3 text-xs text-amber-200">
          Supabase isn&apos;t configured — changes won&apos;t be saved.
        </div>
      )}

      {adjusting && (
        <ResourceAdjustDialog
          label={adjusting === 'hp' ? 'HP' : 'EP'}
          current={
            adjusting === 'hp' ? character.currentHp : character.currentEp
          }
          max={adjusting === 'hp' ? character.hp : character.ep}
          color={adjusting === 'hp' ? 'rose' : 'sky'}
          onAdjust={adjusting === 'hp' ? adjustHp : adjustEp}
          onClose={() => setAdjusting(null)}
          tempHp={adjusting === 'hp' ? character.tempHp ?? 0 : undefined}
          onAdjustTempHp={adjusting === 'hp' ? adjustTempHp : undefined}
        />
      )}
    </div>
  )
}

interface CombatTabProps {
  character: Character
  combatSkills: { id: string; name: string; level: number }[]
  onTakeDamage: (next: Character) => void
}

function CombatTab({
  character,
  combatSkills,
  onTakeDamage,
}: CombatTabProps) {
  const parryLv = combatSkillLevel(character, 'combat-parry')

  const skillByName = new Map(combatSkills.map((s) => [s.id, s]))
  const equippedByCategory = new Map<string, typeof character.inventory>()
  for (const item of character.inventory) {
    if (!item.equipped || !item.weaponCategory) continue
    const list = equippedByCategory.get(item.weaponCategory) ?? []
    list.push(item)
    equippedByCategory.set(item.weaponCategory, list)
  }

  type ActionRow = {
    key: string
    label: string
    notes?: string
    def: (typeof COMBAT_SKILLS)[number]
    level: number
    attrValue: number
    total: number
  }

  const actions: ActionRow[] = []
  for (const def of COMBAT_SKILLS) {
    if (def.category !== 'action') continue
    const level = skillByName.get(def.id)?.level ?? 0
    const attrValue = def.attribute
      ? (character.attributes[def.attribute] ?? 0)
      : 0
    const total = level + attrValue
    if (def.requiresWeapon) {
      const weapons = equippedByCategory.get(def.requiresWeapon) ?? []
      for (const w of weapons) {
        actions.push({
          key: `${def.id}:${w.id}`,
          label: w.name || def.name,
          notes: w.notes,
          def,
          level,
          attrValue,
          total,
        })
      }
    } else {
      actions.push({
        key: def.id,
        label: def.name,
        def,
        level,
        attrValue,
        total,
      })
    }
  }

  return (
    <div className="space-y-3">
      {character.currentHp === 0 && (
        <ReadOnlySection title="Death saves">
          <DeathSavePanel character={character} onApply={onTakeDamage} />
        </ReadOnlySection>
      )}

      <TakeDamagePanel character={character} onApply={onTakeDamage} />

      <ReadOnlySection title="Actions in combat">
        <ul className="space-y-1">
          <li className="flex items-start justify-between gap-3 rounded bg-zinc-900 border border-zinc-800 px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-100">Move</div>
              <div className="text-xs text-zinc-400">
                Move up to your speed.
              </div>
            </div>
            <span className="text-base font-mono text-zinc-100 whitespace-nowrap">
              {character.speed ?? 20} ft
            </span>
          </li>
          {actions.map((a) => (
            <li
              key={a.key}
              className="flex items-center justify-between gap-3 rounded bg-zinc-900 border border-zinc-800 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm text-zinc-100">{a.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {a.def.name}
                  </span>
                </div>
                {a.notes && (
                  <div className="text-xs text-zinc-300">{a.notes}</div>
                )}
                <div className="text-xs text-zinc-500 font-mono">
                  Skill {fmt(a.level)}
                  {a.def.attribute &&
                    ` · ${a.def.attribute} ${fmt(a.attrValue)}`}
                </div>
              </div>
              <span className="text-base font-mono text-amber-300 whitespace-nowrap">
                {fmt(a.total)}
              </span>
            </li>
          ))}
        </ul>
        {actions.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500 italic">
            Equip a weapon on the General tab to add attack actions.
          </p>
        )}
      </ReadOnlySection>

      <ReadOnlySection title="Reactions">
        <ul className="space-y-2">
          <ReactionRow
            name="Move your character"
            description="Use your reaction to move."
            value={`${character.speed ?? 20} ft`}
          />
          <ReactionRow
            name="Opportunity attack"
            description="Attack a creature that leaves your reach."
          />
          <ReactionRow
            name="Parry"
            description={
              <>
                Subtract <span className="font-mono text-amber-300">1d4 + {parryLv}</span>{' '}
                from an attack roll made by a creature adjacent to you.
              </>
            }
          />
        </ul>
      </ReadOnlySection>

    </div>
  )
}

function ReactionRow({
  name,
  description,
  value,
}: {
  name: string
  description: React.ReactNode
  value?: React.ReactNode
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded bg-zinc-900 border border-zinc-800 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100">{name}</div>
        <div className="text-xs text-zinc-400">{description}</div>
      </div>
      {value !== undefined && (
        <span className="text-base font-mono text-zinc-100 whitespace-nowrap">
          {value}
        </span>
      )}
    </li>
  )
}

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

interface SkillListProps {
  skills: { id: string; name: string; level: number }[]
}

function SkillList({ skills }: SkillListProps) {
  return (
    <ul className="space-y-1">
      {skills.map((s) => (
        <li
          key={s.id}
          className="flex items-center justify-between rounded bg-zinc-900 border border-zinc-800 px-3 py-2"
        >
          <span className="text-sm text-zinc-100">{s.name}</span>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-500 font-mono">
              {skillCost(s.level)} BP
            </span>
            <span className="text-amber-300 font-mono">Lv {s.level}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function RibbonRule() {
  return (
    <span
      aria-hidden
      className="self-stretch w-px bg-zinc-700/60 mx-1"
    />
  )
}

function evasionBreakdown(c: Character): string {
  const agility = c.attributes['Agility'] ?? 0
  const dodgeLv = combatSkillLevel(c, 'combat-dodge')
  const armorPart =
    (c.armorModifier ?? 0) > 0 ? ` − Armor ${c.armorModifier}` : ''
  const worn = equippedArmorEvasionReduction(c)
  const wornPart = worn > 0 ? ` − Worn ${worn}` : ''
  return `10 + AGI ${fmt(agility)} + Dodge ${fmt(dodgeLv)}${armorPart}${wornPart}`
}

interface StatProps {
  label: string
  value?: number | string
  color?: string
  suffix?: string
  tooltip?: string
  onClick?: () => void
  children?: React.ReactNode
}

function Stat({
  label,
  value,
  color,
  suffix,
  tooltip,
  onClick,
  children,
}: StatProps) {
  const inner = (
    <>
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 group-hover:text-amber-300 transition">
        {label}
      </span>
      {children ?? (
        <span
          className={
            'font-mono text-base whitespace-nowrap leading-none ' +
            (color ?? 'text-zinc-100')
          }
        >
          {value}
          {suffix && <span className="text-zinc-500 text-[10px]"> {suffix}</span>}
        </span>
      )}
    </>
  )
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={tooltip}
        className="group flex flex-col gap-0.5 min-w-0 items-start text-left cursor-pointer rounded -mx-1 px-1 transition hover:bg-zinc-800/40"
      >
        {inner}
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-0.5 min-w-0" title={tooltip}>
      {inner}
    </div>
  )
}

interface ResourceAdjustDialogProps {
  label: string
  current: number
  max: number
  color: 'rose' | 'sky'
  onAdjust: (delta: number) => void
  onClose: () => void
  tempHp?: number
  onAdjustTempHp?: (delta: number) => void
}

function parseDelta(raw: string): number {
  if (raw.trim() === '') return 1
  const n = Math.abs(Math.floor(Number(raw)))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function ResourceAdjustDialog({
  label,
  current,
  max,
  color,
  onAdjust,
  onClose,
  tempHp,
  onAdjustTempHp,
}: ResourceAdjustDialogProps) {
  const [delta, setDelta] = useState('')
  const [tempDelta, setTempDelta] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const accent = color === 'rose' ? 'text-rose-300' : 'text-sky-300'
  const ring = color === 'rose' ? 'border-rose-500/40' : 'border-sky-500/40'
  const parsed = parseDelta(delta)
  const parsedTemp = parseDelta(tempDelta)
  const showTemp = onAdjustTempHp !== undefined && tempHp !== undefined

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const apply = (sign: 1 | -1) => {
    if (parsed === 0) return
    onAdjust(sign * parsed)
    setDelta('')
    inputRef.current?.focus()
  }
  const applyTemp = (sign: 1 | -1) => {
    if (parsedTemp === 0 || !onAdjustTempHp) return
    onAdjustTempHp(sign * parsedTemp)
    setTempDelta('')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-adjust-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          'rounded-lg border bg-zinc-900 shadow-2xl max-w-xs w-full p-5 space-y-4 ' +
          ring
        }
      >
        <div className="flex items-center justify-between">
          <h3
            id="resource-adjust-title"
            className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500"
          >
            Adjust {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-600 hover:text-zinc-200 text-sm leading-none"
          >
            ✕
          </button>
        </div>

        <div className="text-center">
          <span className={'font-mono text-4xl leading-none ' + accent}>
            {current}
          </span>
          <span className="font-mono text-base text-zinc-500 leading-none">
            {' '}/ {max}
          </span>
          {showTemp && tempHp! > 0 && (
            <span className="font-mono text-2xl text-sky-300 leading-none ml-2">
              +{tempHp}
            </span>
          )}
        </div>

        <AdjustRow
          delta={delta}
          setDelta={setDelta}
          parsed={parsed}
          apply={apply}
          inputRef={inputRef}
          ariaLabel={label}
        />

        {showTemp && (
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <div className="text-[10px] font-medium uppercase tracking-[0.3em] text-sky-300/80">
              Temp HP
            </div>
            <AdjustRow
              delta={tempDelta}
              setDelta={setTempDelta}
              parsed={parsedTemp}
              apply={applyTemp}
              ariaLabel="Temp HP"
            />
          </div>
        )}

        <div className="text-center text-[9px] uppercase tracking-[0.25em] text-zinc-600">
          Enter to add · Esc to close
        </div>
      </div>
    </div>
  )
}

interface AdjustRowProps {
  delta: string
  setDelta: (v: string) => void
  parsed: number
  apply: (sign: 1 | -1) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  ariaLabel: string
}

function AdjustRow({
  delta,
  setDelta,
  parsed,
  apply,
  inputRef,
  ariaLabel,
}: AdjustRowProps) {
  return (
    <div className="flex items-stretch justify-center gap-2">
      <button
        type="button"
        onClick={() => apply(-1)}
        disabled={parsed === 0}
        aria-label={`Subtract ${parsed} ${ariaLabel}`}
        className="rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 px-4 text-lg font-mono text-zinc-100"
      >
        −
      </button>
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply(1)
        }}
        placeholder="1"
        className="w-20 bg-zinc-950 border border-zinc-700 rounded px-2 py-2 text-lg text-zinc-100 text-center font-mono"
      />
      <button
        type="button"
        onClick={() => apply(1)}
        disabled={parsed === 0}
        aria-label={`Add ${parsed} ${ariaLabel}`}
        className="rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 px-4 text-lg font-mono text-zinc-100"
      >
        +
      </button>
    </div>
  )
}

function ReadOnlySection({
  title,
  children,
  collapsible,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (!collapsible) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
          {title}
        </h3>
        {children}
      </section>
    )
  }
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-zinc-500 text-xs font-mono">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  )
}

function SaveBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900/60 px-2 py-1 text-xs">
      <span className="text-zinc-400">{label}</span>
      <span className="font-mono text-amber-300">{fmt(value)}</span>
    </span>
  )
}

