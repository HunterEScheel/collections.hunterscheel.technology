import { useState } from 'react'
import {
  ARMOR_CLASSES,
  ARMOR_CLASS_STATS,
  DAMAGE_TYPES,
  WEAPON_CATEGORIES,
  armorEvasionReduction,
  armorMaxDurability,
  armorReductionDie,
  armorThreshold,
  newArmorStats,
  newInventoryItem,
  normalizeArmor,
  type ArmorClass,
  type ArmorStats,
  type DamageType,
  type InventoryItem,
  type WeaponCategory,
  weaponCategoryLabel,
} from '../system/inventory'

interface Props {
  value: InventoryItem[]
  onChange: (next: InventoryItem[]) => void
}

export function InventoryEditor({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string, open?: boolean) =>
    setExpanded((s) => {
      const next = new Set(s)
      const shouldOpen = open ?? !next.has(id)
      if (shouldOpen) next.add(id)
      else next.delete(id)
      return next
    })

  const add = () => {
    const item = newInventoryItem()
    onChange([...value, item])
    setExpanded((s) => new Set(s).add(item.id))
  }
  const update = (id: string, patch: Partial<InventoryItem>) =>
    onChange(value.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const remove = (id: string) => {
    onChange(value.filter((i) => i.id !== id))
    setExpanded((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">Empty.</p>
      ) : (
        <ul className="space-y-2">
          {value.map((item) => {
            const isOpen = expanded.has(item.id)
            return (
              <li
                key={item.id}
                className="rounded border border-zinc-800 bg-zinc-900"
              >
                {isOpen ? (
                  <ItemEditor
                    item={item}
                    onChange={(patch) => update(item.id, patch)}
                    onRemove={() => remove(item.id)}
                    onClose={() => toggle(item.id, false)}
                  />
                ) : (
                  <ItemRow
                    item={item}
                    onOpen={() => toggle(item.id, true)}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={add}
        className="rounded bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200"
      >
        + Add item
      </button>
    </div>
  )
}

interface ItemRowProps {
  item: InventoryItem
  onOpen: () => void
}

function ItemRow({ item, onOpen }: ItemRowProps) {
  const typeBadge = item.weaponCategory
    ? weaponCategoryLabel(item.weaponCategory)
    : item.armor
      ? `${ARMOR_CLASS_STATS[item.armor.class].label} armor 1${armorReductionDie(item.armor)}`
      : null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-zinc-800/60 rounded"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-100 truncate">
            {item.name || <span className="italic text-zinc-500">Unnamed</span>}
          </span>
          {typeBadge && (
            <span
              className={
                'text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 border ' +
                (item.equipped
                  ? 'border-amber-500 bg-amber-900/30 text-amber-200'
                  : 'border-zinc-700 bg-zinc-950 text-zinc-400')
              }
            >
              {item.equipped ? 'Equipped · ' : ''}
              {typeBadge}
            </span>
          )}
        </div>
        {item.notes && (
          <div className="text-xs text-zinc-500 truncate">{item.notes}</div>
        )}
      </div>
      <span className="text-xs font-mono text-zinc-400">×{item.quantity}</span>
      <span className="text-zinc-500 text-sm">▸</span>
    </button>
  )
}

interface ItemEditorProps {
  item: InventoryItem
  onChange: (patch: Partial<InventoryItem>) => void
  onRemove: () => void
  onClose: () => void
}

function ItemEditor({ item, onChange, onRemove, onClose }: ItemEditorProps) {
  const itemKind: 'none' | 'weapon' | 'armor' = item.weaponCategory
    ? 'weapon'
    : item.armor
      ? 'armor'
      : 'none'

  const setArmor = (patch: Partial<ArmorStats>) => {
    const current = item.armor ?? newArmorStats()
    onChange({ armor: normalizeArmor({ ...current, ...patch }) })
  }
  const setArmorClass = (cls: ArmorClass) => {
    const current = item.armor ?? newArmorStats()
    // Switching class refreshes currentDurability to the new max — treat it
    // as donning a fresh piece of armor.
    const max = armorMaxDurability({ ...current, class: cls })
    onChange({
      armor: normalizeArmor({
        ...current,
        class: cls,
        currentDurability: max,
      }),
    })
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Item name"
          autoFocus
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100"
        />
        <input
          type="number"
          min={0}
          value={item.quantity}
          onChange={(e) =>
            onChange({
              quantity: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="w-20 bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100 text-right font-mono"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Category
          <select
            value={
              item.weaponCategory ?? (item.armor ? 'armor' : 'misc')
            }
            onChange={(e) => {
              const v = e.target.value
              if (v === 'armor') {
                onChange({
                  weaponCategory: undefined,
                  armor: item.armor ?? newArmorStats(),
                })
              } else if (v === 'misc') {
                onChange({
                  weaponCategory: undefined,
                  armor: undefined,
                  equipped: false,
                })
              } else {
                onChange({
                  weaponCategory: v as WeaponCategory,
                  armor: undefined,
                })
              }
            }}
            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100"
          >
            <option value="misc">— misc —</option>
            {WEAPON_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
            <option value="armor">Armor</option>
          </select>
        </label>
        {itemKind !== 'none' && (
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={Boolean(item.equipped)}
              onChange={(e) => onChange({ equipped: e.target.checked })}
              className="accent-amber-500"
            />
            Equipped
          </label>
        )}
      </div>
      {itemKind === 'armor' && item.armor && (
        <ArmorEditor
          armor={item.armor}
          setArmor={setArmor}
          setArmorClass={setArmorClass}
        />
      )}
      <input
        value={item.notes ?? ''}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Notes (optional)"
        className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-1 text-xs text-zinc-300 placeholder:text-zinc-600"
      />
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-zinc-500 hover:text-rose-400"
        >
          Remove
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950"
        >
          Save
        </button>
      </div>
    </div>
  )
}

interface ArmorEditorProps {
  armor: ArmorStats
  setArmor: (patch: Partial<ArmorStats>) => void
  setArmorClass: (cls: ArmorClass) => void
}

// Weight options: negative = lightweight, positive = heavyweight.
const WEIGHT_OPTIONS: { value: number; label: string }[] = [
  { value: -3, label: 'Lightweight 3 (−3 EV penalty)' },
  { value: -2, label: 'Lightweight 2 (−2 EV penalty)' },
  { value: -1, label: 'Lightweight 1 (−1 EV penalty)' },
  { value: 0, label: 'No weight modifier' },
  { value: 1, label: 'Heavyweight 1 (+1 EV penalty)' },
  { value: 2, label: 'Heavyweight 2 (+2 EV penalty)' },
  { value: 3, label: 'Heavyweight 3 (+3 EV penalty)' },
]

// Durability options: positive = durable, negative = brittle.
const DURABILITY_OPTIONS: { value: number; label: string }[] = [
  { value: -6, label: 'Brittle 6 (−6 durability & threshold)' },
  { value: -4, label: 'Brittle 4 (−4 durability & threshold)' },
  { value: -2, label: 'Brittle 2 (−2 durability & threshold)' },
  { value: 0, label: 'No durability modifier' },
  { value: 2, label: 'Durable 2 (+2 durability & threshold)' },
  { value: 4, label: 'Durable 4 (+4 durability & threshold)' },
  { value: 6, label: 'Durable 6 (+6 durability & threshold)' },
]

function ArmorEditor({ armor, setArmor, setArmorClass }: ArmorEditorProps) {
  const die = armorReductionDie(armor)
  const threshold = armorThreshold(armor)
  const maxDur = armorMaxDurability(armor)
  const evRed = armorEvasionReduction(armor)

  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 p-3 space-y-3">
      {/* Class selector (required) */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-1.5">
          Weight class
        </div>
        <div className="flex flex-wrap gap-1">
          {ARMOR_CLASSES.map((cls) => {
            const stats = ARMOR_CLASS_STATS[cls]
            const active = armor.class === cls
            return (
              <button
                key={cls}
                type="button"
                onClick={() => setArmorClass(cls)}
                aria-pressed={active}
                className={
                  'rounded border px-2 py-1 text-[11px] transition ' +
                  (active
                    ? 'border-amber-400/80 bg-amber-500/15 text-amber-100'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500')
                }
              >
                <span className="uppercase tracking-[0.12em]">
                  {stats.label}
                </span>{' '}
                <span className="font-mono text-zinc-500">
                  1{stats.reductionDie} · T{stats.threshold} · D{stats.durability} · EV
                  −{stats.evasionReduction}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Optional properties */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Extra protective
          <select
            value={armor.extraProtective}
            onChange={(e) =>
              setArmor({ extraProtective: Number(e.target.value) || 0 })
            }
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100"
          >
            <option value={0}>None</option>
            <option value={1}>+1 damage blocked</option>
            <option value={2}>+2 damage blocked</option>
            <option value={3}>+3 damage blocked</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Weight
          <select
            value={armor.weightAdjust}
            onChange={(e) =>
              setArmor({ weightAdjust: Number(e.target.value) || 0 })
            }
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100"
          >
            {WEIGHT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Durability
          <select
            value={armor.durabilityAdjust}
            onChange={(e) =>
              setArmor({ durabilityAdjust: Number(e.target.value) || 0 })
            }
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100"
          >
            {DURABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Computed stats readout */}
      <div className="rounded bg-zinc-900 border border-zinc-800 px-3 py-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[11px]">
        <Stat label="Blocks">
          <span className="font-mono text-emerald-300">
            1{die}
            {armor.extraProtective > 0 && ` + ${armor.extraProtective}`}
          </span>
        </Stat>
        <Stat label="Threshold">
          <span className="font-mono text-zinc-100">{threshold}</span>
        </Stat>
        <Stat label="Max durability">
          <span className="font-mono text-zinc-100">{maxDur}</span>
        </Stat>
        <Stat label="EV penalty">
          <span className="font-mono text-rose-300">−{evRed}</span>
        </Stat>
      </div>

      {/* Current durability — editable so GM can repair between sessions */}
      <label className="flex items-center justify-between gap-2 text-xs text-zinc-400">
        Current durability
        <input
          type="number"
          min={0}
          max={maxDur}
          value={armor.currentDurability}
          onChange={(e) =>
            setArmor({
              currentDurability: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 text-right font-mono"
        />
      </label>

      {/* Damage types */}
      <div>
        <div className="text-xs text-zinc-400 mb-1">Reduces damage of</div>
        <div className="flex flex-wrap gap-1">
          {DAMAGE_TYPES.map((t) => {
            const active = armor.reductionTypes.includes(t)
            return (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setArmor({
                    reductionTypes: active
                      ? armor.reductionTypes.filter((x: DamageType) => x !== t)
                      : [...armor.reductionTypes, t],
                  })
                }
                className={
                  'rounded px-2 py-0.5 text-xs border ' +
                  (active
                    ? 'border-emerald-500 bg-emerald-900/30 text-emerald-200'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500')
                }
              >
                {t}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
      {children}
    </span>
  )
}
