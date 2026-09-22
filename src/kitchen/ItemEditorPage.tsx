import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Kitchen } from './useKitchen';
import {
  CATEGORY_ORDER,
  UNITS,
  categoryEmoji,
  categoryLabel,
  effectiveStep,
  epochDayToInputDate,
  formatQuantity,
  inputDateToEpochDay,
  unitLabel,
} from './pantry';
import type { KitchenItem } from './types';
import { Field, inputClass, primaryButtonClass, subtleButtonClass } from './ui';

/** Add or edit one pantry item. `/kitchen/item/new` is the add form. */
export function ItemEditorPage({ kitchen }: { kitchen: Kitchen }) {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const existing = kitchen.items.find((item) => item.id === itemId) ?? null;
  const isNew = itemId === 'new';

  if (!isNew && !existing) {
    return (
      <p className="text-zinc-400">
        {kitchen.loading ? 'Loading…' : 'That item is not in the kitchen any more.'}
      </p>
    );
  }

  return (
    <ItemForm
      key={existing?.id ?? 'new'}
      item={existing}
      onCancel={() => navigate(-1)}
      onSave={async (draft) => {
        await kitchen.saveItem(draft, existing?.id);
        navigate('/kitchen');
      }}
      onDelete={
        existing
          ? async () => {
              await kitchen.deleteItem(existing);
              navigate('/kitchen');
            }
          : undefined
      }
    />
  );
}

type Draft = {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  low_threshold: string;
  step: string;
  expires: string;
  notes: string;
};

function ItemForm({
  item,
  onSave,
  onCancel,
  onDelete,
}: {
  item: KitchenItem | null;
  onSave: (draft: Partial<KitchenItem> & { name: string }) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>({
    name: item?.name ?? '',
    category: item?.category ?? 'OTHER',
    quantity: item ? formatQuantity(item.quantity) : '1',
    unit: item?.unit ?? 'PIECES',
    low_threshold: item ? formatQuantity(item.low_threshold) : '0',
    step: item && item.step > 0 ? formatQuantity(item.step) : '',
    expires: item?.expires_on !== null && item ? epochDayToInputDate(item.expires_on!) : '',
    notes: item?.notes ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const nameError = draft.name.trim() ? null : 'Give it a name';
  const quantityError = Number.isFinite(Number(draft.quantity)) && draft.quantity.trim()
    ? null
    : 'Numbers only';
  const thresholdError =
    !draft.low_threshold.trim() || Number.isFinite(Number(draft.low_threshold))
      ? null
      : 'Numbers only';
  const stepError =
    !draft.step.trim() || (Number.isFinite(Number(draft.step)) && Number(draft.step) > 0)
      ? null
      : 'More than zero, or leave it blank';
  const canSave = !nameError && !quantityError && !thresholdError && !stepError && !busy;

  const stepPreview = formatQuantity(
    effectiveStep({
      step: Number(draft.step) || 0,
      unit: draft.unit,
    } as KitchenItem),
  );

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onSave({
        name: draft.name.trim(),
        category: draft.category,
        quantity: Number(draft.quantity) || 0,
        unit: draft.unit,
        low_threshold: Number(draft.low_threshold) || 0,
        step: Number(draft.step) > 0 ? Number(draft.step) : 0,
        expires_on: inputDateToEpochDay(draft.expires),
        notes: draft.notes.trim(),
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'That did not save');
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-base font-medium">{item ? 'Edit item' : 'Add item'}</h2>

      <Field label="Name" error={draft.name ? nameError : null}>
        <input
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Category">
        <select
          value={draft.category}
          onChange={(e) => set('category', e.target.value)}
          className={inputClass}
        >
          {CATEGORY_ORDER.map((category) => (
            <option key={category} value={category}>
              {categoryEmoji(category)} {categoryLabel(category)}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" error={quantityError}>
          <input
            inputMode="decimal"
            value={draft.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Restock at" error={thresholdError} hint="0 = only when it runs out">
          <input
            inputMode="decimal"
            value={draft.low_threshold}
            onChange={(e) => set('low_threshold', e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit">
          <select
            value={draft.unit}
            onChange={(e) => set('unit', e.target.value)}
            className={inputClass}
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unitLabel(unit)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Increment by"
          error={stepError}
          hint={`Each +/- moves ${stepPreview} ${unitLabel(draft.unit)}`}
        >
          <input
            inputMode="decimal"
            placeholder="unit default"
            value={draft.step}
            onChange={(e) => set('step', e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Best before">
        <input
          type="date"
          value={draft.expires}
          onChange={(e) => set('expires', e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Notes">
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button onClick={() => void submit()} disabled={!canSave} className={primaryButtonClass}>
          {item ? 'Save changes' : 'Add to kitchen'}
        </button>
        <button onClick={onCancel} className={subtleButtonClass}>
          Cancel
        </button>
        {onDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete ${item?.name}?`)) void onDelete();
            }}
            className="ml-auto rounded-md px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/10"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
