import { useMemo, useState } from 'react'
import { ATTRIBUTES } from '../system/attributes'
import { COMBAT_SKILLS } from '../system/combatSkills'
import { MAX_SKILL_LEVEL, SPEED_STEP } from '../system/costs'
import { DAMAGE_TYPES, type DamageType } from '../system/inventory'
import {
  emptyMonster,
  monsterBpBreakdown,
  monsterEvasion,
  spellFactors,
  spellTargetingLabel,
  type LairAction,
  type LegendaryAction,
  type Monster,
  type MonsterAttack,
} from '../system/monster'
import { POWER_TIERS } from '../system/powerTiers'
import { spellCost } from '../system/spells'
import { AttributesEditor } from '../components/AttributesEditor'
import { MonsterSpellComposer } from '../components/MonsterSpellComposer'
import { NumberStepper } from '../components/NumberStepper'
import { Section } from '../components/Section'
import { TierSelector } from '../components/TierSelector'

const ATTRIBUTE_ABBR: Record<(typeof ATTRIBUTES)[number], string> = {
  Power: 'POW',
  Agility: 'AGI',
  Intelligence: 'INT',
  Sense: 'SEN',
  Influence: 'INF',
}

const DEFAULT_TIER = POWER_TIERS[2]

export function MonsterMaker() {
  const [monster, setMonster] = useState<Monster>(() =>
    emptyMonster(DEFAULT_TIER.name, DEFAULT_TIER.enemyBP),
  )
  const [showBlock, setShowBlock] = useState(false)

  const breakdown = useMemo(() => monsterBpBreakdown(monster), [monster])
  const over = breakdown.remaining < 0

  const patch = (p: Partial<Monster>) => setMonster((m) => ({ ...m, ...p }))

  if (showBlock) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowBlock(false)}
          className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
        >
          ← Back to editing
        </button>
        <StatBlock monster={monster} />
        <p className="text-xs text-zinc-500 italic">
          Monsters are not saved — screenshot the stat block above to keep it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">NPC / Monster Maker</h1>
        <div className="text-sm font-mono">
          <span className={over ? 'text-rose-400' : 'text-amber-300'}>
            {breakdown.total}
          </span>
          <span className="text-zinc-500"> / {monster.bpBudget} BP</span>
        </div>
      </div>

      <Section title="Name & tier" subtitle="Enemy budget is 5× the player budget for the tier.">
        <div className="space-y-3">
          <input
            type="text"
            value={monster.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Monster name…"
            className="w-full max-w-sm bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <TierSelector
            value={monster.tierName}
            bpSource="enemy"
            onChange={(tierName, bpBudget) => patch({ tierName, bpBudget })}
          />
        </div>
      </Section>

      <Section
        title="Pools"
        cost={breakdown.hp + breakdown.ep + breakdown.speed}
      >
        <div className="flex flex-wrap gap-6">
          <NumberStepper
            label="HP"
            value={monster.hp}
            onChange={(hp) => patch({ hp })}
            min={0}
            step={3}
          />
          <NumberStepper
            label="EP"
            value={monster.ep}
            onChange={(ep) => patch({ ep })}
            min={0}
          />
          <NumberStepper
            label="Speed (ft)"
            value={monster.speed}
            onChange={(speed) => patch({ speed })}
            min={0}
            step={SPEED_STEP}
          />
        </div>
      </Section>

      <Section title="Attributes" cost={breakdown.attributes}>
        <AttributesEditor
          value={monster.attributes}
          onChange={(attributes) => patch({ attributes })}
          max={Infinity}
        />
      </Section>

      <Section
        title="Combat skills"
        subtitle="Passives raise saves, actions raise attack totals."
        cost={breakdown.skills}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {COMBAT_SKILLS.map((def) => (
            <div key={def.id} className="flex items-center justify-between gap-2">
              <NumberStepper
                label={def.name}
                value={monster.combatSkills[def.id] ?? 0}
                onChange={(lv) =>
                  patch({
                    combatSkills: { ...monster.combatSkills, [def.id]: lv },
                  })
                }
                min={0}
                max={MAX_SKILL_LEVEL}
              />
              <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                {def.category}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Attacks"
        subtitle="Free-form — hit bonus and damage are whatever fits the monster."
      >
        <div className="space-y-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-zinc-400 block mb-1">
              Multiattack
            </span>
            <input
              type="text"
              value={monster.multiattack}
              onChange={(e) => patch({ multiattack: e.target.value })}
              placeholder="e.g. Makes three attacks: two claws and one bite."
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <AttacksEditor
            value={monster.attacks}
            onChange={(attacks) => patch({ attacks })}
          />
        </div>
      </Section>

      <Section
        title="Spells"
        subtitle="Monsters know spells innately — no training gates or save slots. Casting still costs EP."
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <NumberStepper
              label="Spell bonus"
              value={monster.spellBonus}
              onChange={(spellBonus) => patch({ spellBonus })}
              min={-Infinity}
            />
            <span className="text-xs text-zinc-500">
              Sets spell hit bonus; save DC is 10 + bonus.
            </span>
          </div>
          <MonsterSpellComposer
            spellBonus={monster.spellBonus}
            value={monster.spells}
            onChange={(spells) => patch({ spells })}
          />
        </div>
      </Section>

      <Section
        title="Lair actions"
        subtitle="Environment effects the lair itself takes on its own initiative."
      >
        <LairActionsEditor
          value={monster.lairActions}
          onChange={(lairActions) => patch({ lairActions })}
        />
      </Section>

      <Section
        title="Legendary actions"
        subtitle="Slots refresh each round and are spent between other creatures' turns."
      >
        <div className="space-y-3">
          <NumberStepper
            label="Slots / round"
            value={monster.legendaryActionSlots}
            onChange={(legendaryActionSlots) => patch({ legendaryActionSlots })}
            min={0}
          />
          <LegendaryActionsEditor
            value={monster.legendaryActions}
            onChange={(legendaryActions) => patch({ legendaryActions })}
          />
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowBlock(true)}
          className="rounded bg-amber-500 hover:bg-amber-400 px-4 py-2 font-medium text-zinc-950"
        >
          View stat block
        </button>
        {over && (
          <span className="text-sm text-rose-400">
            Over budget by {-breakdown.remaining} BP
          </span>
        )}
      </div>
    </div>
  )
}

function AttacksEditor({
  value,
  onChange,
}: {
  value: MonsterAttack[]
  onChange: (next: MonsterAttack[]) => void
}) {
  const add = () =>
    onChange([
      ...value,
      {
        id: `monster-attack-${crypto.randomUUID()}`,
        name: '',
        hitBonus: 0,
        damage: '',
        damageType: 'Physical',
        note: '',
      },
    ])
  const update = (id: string, p: Partial<MonsterAttack>) =>
    onChange(value.map((a) => (a.id === id ? { ...a, ...p } : a)))
  const remove = (id: string) => onChange(value.filter((a) => a.id !== id))

  return (
    <div className="space-y-2">
      {value.map((a) => (
        <div
          key={a.id}
          className="rounded bg-zinc-900 border border-zinc-800 px-3 py-2 flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            value={a.name}
            onChange={(e) => update(a.id, { name: e.target.value })}
            placeholder="Attack name"
            className="flex-1 min-w-[8rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
          />
          <label className="flex items-center gap-1 text-xs text-zinc-400">
            hit +
            <input
              type="number"
              value={a.hitBonus}
              onChange={(e) =>
                update(a.id, { hitBonus: Number(e.target.value) || 0 })
              }
              className="w-14 bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 font-mono"
            />
          </label>
          <input
            type="text"
            value={a.damage}
            onChange={(e) => update(a.id, { damage: e.target.value })}
            placeholder="2d6+2"
            className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 font-mono"
          />
          <select
            value={a.damageType}
            onChange={(e) =>
              update(a.id, { damageType: e.target.value as DamageType })
            }
            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
          >
            {DAMAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={a.note}
            onChange={(e) => update(a.id, { note: e.target.value })}
            placeholder="Note (reach, recharge…)"
            className="flex-1 min-w-[10rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
          />
          <button
            type="button"
            onClick={() => remove(a.id)}
            className="text-zinc-500 hover:text-rose-400 text-sm"
            aria-label={`Remove ${a.name || 'attack'}`}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
      >
        + Add attack
      </button>
    </div>
  )
}

function LairActionsEditor({
  value,
  onChange,
}: {
  value: LairAction[]
  onChange: (next: LairAction[]) => void
}) {
  const add = () =>
    onChange([
      ...value,
      { id: `lair-action-${crypto.randomUUID()}`, name: '', description: '' },
    ])
  const update = (id: string, p: Partial<LairAction>) =>
    onChange(value.map((a) => (a.id === id ? { ...a, ...p } : a)))

  return (
    <div className="space-y-2">
      {value.map((a) => (
        <div
          key={a.id}
          className="rounded bg-zinc-900 border border-zinc-800 px-3 py-2 flex flex-wrap items-start gap-2"
        >
          <input
            type="text"
            value={a.name}
            onChange={(e) => update(a.id, { name: e.target.value })}
            placeholder="Lair action name"
            className="w-48 bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
          />
          <textarea
            value={a.description}
            onChange={(e) => update(a.id, { description: e.target.value })}
            rows={2}
            placeholder="What happens…"
            className="flex-1 min-w-[14rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 resize-y"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x.id !== a.id))}
            className="text-zinc-500 hover:text-rose-400 text-sm"
            aria-label={`Remove ${a.name || 'lair action'}`}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
      >
        + Add lair action
      </button>
    </div>
  )
}

function LegendaryActionsEditor({
  value,
  onChange,
}: {
  value: LegendaryAction[]
  onChange: (next: LegendaryAction[]) => void
}) {
  const add = () =>
    onChange([
      ...value,
      {
        id: `legendary-action-${crypto.randomUUID()}`,
        name: '',
        cost: 1,
        description: '',
      },
    ])
  const update = (id: string, p: Partial<LegendaryAction>) =>
    onChange(value.map((a) => (a.id === id ? { ...a, ...p } : a)))

  return (
    <div className="space-y-2">
      {value.map((a) => (
        <div
          key={a.id}
          className="rounded bg-zinc-900 border border-zinc-800 px-3 py-2 flex flex-wrap items-start gap-2"
        >
          <input
            type="text"
            value={a.name}
            onChange={(e) => update(a.id, { name: e.target.value })}
            placeholder="Legendary action name"
            className="w-48 bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
          />
          <label className="flex items-center gap-1 text-xs text-zinc-400 pt-1.5">
            costs
            <input
              type="number"
              min={1}
              value={a.cost}
              onChange={(e) =>
                update(a.id, { cost: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-14 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 font-mono"
            />
          </label>
          <textarea
            value={a.description}
            onChange={(e) => update(a.id, { description: e.target.value })}
            rows={2}
            placeholder="What happens…"
            className="flex-1 min-w-[14rem] bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 resize-y"
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x.id !== a.id))}
            className="text-zinc-500 hover:text-rose-400 text-sm"
            aria-label={`Remove ${a.name || 'legendary action'}`}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
      >
        + Add legendary action
      </button>
    </div>
  )
}

function StatBlock({ monster }: { monster: Monster }) {
  const skillLv = (id: string) => monster.combatSkills[id] ?? 0
  const reactions = COMBAT_SKILLS.filter(
    (d) => d.category === 'reaction' && skillLv(d.id) > 0,
  )
  const otherActions = COMBAT_SKILLS.filter(
    (d) => d.category === 'action' && skillLv(d.id) > 0,
  )

  return (
    <div className="rounded-lg border border-amber-700/40 bg-zinc-950 p-5 space-y-4 max-w-2xl">
      <header className="border-b border-zinc-800 pb-3">
        <h2 className="text-xl font-semibold uppercase tracking-[0.18em] text-zinc-100">
          {monster.name || 'Unnamed monster'}
        </h2>
        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mt-1">
          {monster.tierName} · {monster.bpBudget} BP
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <BlockStat label="HP" value={String(monster.hp)} color="text-rose-300" />
        <BlockStat label="EP" value={String(monster.ep)} color="text-sky-300" />
        <BlockStat
          label="EVA"
          value={String(monsterEvasion(monster))}
          color="text-amber-300"
        />
        <BlockStat
          label="SPD"
          value={`${monster.speed} ft`}
          color="text-zinc-200"
        />
        <BlockRule />
        {ATTRIBUTES.map((a) => (
          <BlockStat
            key={a}
            label={ATTRIBUTE_ABBR[a]}
            value={fmt(monster.attributes[a])}
            color="text-zinc-200"
          />
        ))}
        <BlockRule />
        <BlockStat label="DDG" value={fmt(skillLv('combat-dodge'))} color="text-amber-200" />
        <BlockStat label="GRT" value={fmt(skillLv('combat-grit'))} color="text-amber-200" />
        <BlockStat label="RSL" value={fmt(skillLv('combat-resolve'))} color="text-amber-200" />
      </div>

      {(monster.attacks.length > 0 || monster.multiattack.trim()) && (
        <BlockSection title="Attacks">
          {monster.multiattack.trim() && (
            <p className="text-sm mb-1">
              <span className="text-zinc-100 font-medium">Multiattack</span>
              <span className="text-zinc-400"> — {monster.multiattack}</span>
            </p>
          )}
          <ul className="space-y-1">
            {monster.attacks.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="text-zinc-100 font-medium">
                  {a.name || 'Attack'}
                </span>
                <span className="font-mono text-amber-300">
                  {fmt(a.hitBonus)} to hit
                </span>
                {a.damage && (
                  <span className="font-mono text-zinc-300">
                    {a.damage} {a.damageType}
                  </span>
                )}
                {a.note && <span className="text-zinc-500">{a.note}</span>}
              </li>
            ))}
          </ul>
        </BlockSection>
      )}

      {otherActions.length > 0 && (
        <BlockSection title="Combat actions">
          <ul className="space-y-1">
            {otherActions.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="text-zinc-100 font-medium">{d.name}</span>
                <span className="font-mono text-amber-300">
                  {fmt(
                    skillLv(d.id) +
                      (d.attribute ? monster.attributes[d.attribute] : 0),
                  )}
                </span>
                <span className="text-zinc-500 text-xs">{d.effect}</span>
              </li>
            ))}
          </ul>
        </BlockSection>
      )}

      {reactions.length > 0 && (
        <BlockSection title="Reactions">
          <ul className="space-y-1">
            {reactions.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="text-zinc-100 font-medium">{d.name}</span>
                <span className="font-mono text-amber-300">Lv {skillLv(d.id)}</span>
                <span className="text-zinc-500 text-xs">{d.effect}</span>
              </li>
            ))}
          </ul>
        </BlockSection>
      )}

      {monster.spells.length > 0 && (
        <BlockSection title="Spells" meta={`spell bonus ${fmt(monster.spellBonus)}`}>
          <ul className="space-y-2">
            {monster.spells.map((s) => (
              <li key={s.id} className="text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-zinc-100 font-medium">{s.name}</span>
                  <span className="font-mono text-amber-300">
                    {spellTargetingLabel(s, monster.spellBonus)}
                  </span>
                  <span className="font-mono text-zinc-400">
                    {spellCost(s.draft).totalEp} EP
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {spellFactors(s).map((label, i) => (
                    <span
                      key={i}
                      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-300"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </BlockSection>
      )}

      {monster.lairActions.length > 0 && (
        <BlockSection title="Lair actions">
          <ul className="space-y-1">
            {monster.lairActions.map((a) => (
              <li key={a.id} className="text-sm">
                <span className="text-zinc-100 font-medium">
                  {a.name || 'Lair action'}
                </span>
                {a.description && (
                  <span className="text-zinc-400"> — {a.description}</span>
                )}
              </li>
            ))}
          </ul>
        </BlockSection>
      )}

      {(monster.legendaryActions.length > 0 ||
        monster.legendaryActionSlots > 0) && (
        <BlockSection
          title="Legendary actions"
          meta={`${monster.legendaryActionSlots} slots / round`}
        >
          <ul className="space-y-1">
            {monster.legendaryActions.map((a) => (
              <li key={a.id} className="text-sm">
                <span className="text-zinc-100 font-medium">
                  {a.name || 'Legendary action'}
                </span>
                <span className="font-mono text-amber-300">
                  {' '}
                  ({a.cost} {a.cost === 1 ? 'slot' : 'slots'})
                </span>
                {a.description && (
                  <span className="text-zinc-400"> — {a.description}</span>
                )}
              </li>
            ))}
          </ul>
        </BlockSection>
      )}
    </div>
  )
}

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : String(n)
}

function BlockStat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <span className={`font-mono text-base leading-none ${color}`}>
        {value}
      </span>
    </div>
  )
}

function BlockRule() {
  return <span className="self-stretch w-px bg-zinc-700/60 mx-1" />
}

function BlockSection({
  title,
  meta,
  children,
}: {
  title: string
  meta?: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-zinc-800 pt-3">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
          {title}
        </h3>
        {meta && <span className="text-xs text-zinc-500 font-mono">{meta}</span>}
      </div>
      {children}
    </section>
  )
}
