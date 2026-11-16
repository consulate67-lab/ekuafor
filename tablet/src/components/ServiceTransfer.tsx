import { useMemo, useState } from 'react';
import type { Service } from '../types';

type Props = {
  services: Service[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Kısa etiket — örn. grup dersi */
  labelExtra?: (svc: Service) => string;
  emptyHint?: string;
};

function ListBox({
  title,
  items,
  selected,
  onToggle,
  onSelectAllVisible,
  emptyText,
  labelExtra,
}: {
  title: string;
  items: Service[];
  selected: Set<string>;
  onToggle: (id: string, additive: boolean) => void;
  onSelectAllVisible: () => void;
  onActivate: (id: string) => void;
  emptyText: string;
  labelExtra?: (svc: Service) => string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400">{items.length}</span>
          {items.length > 0 && (
            <button
              type="button"
              onClick={onSelectAllVisible}
              className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-black text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
            >
              Tümü
            </button>
          )}
        </div>
      </div>
      <ul
        className="max-h-48 flex-1 space-y-0.5 overflow-y-auto p-2"
        role="listbox"
        aria-multiselectable="true"
        aria-label={title}
      >
        {items.length === 0 ? (
          <li className="px-2 py-4 text-center text-xs font-semibold text-slate-400">{emptyText}</li>
        ) : (
          items.map(svc => {
            const on = selected.has(svc.id);
            const extra = labelExtra?.(svc);
            return (
              <li key={svc.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={e => onToggle(svc.id, e.ctrlKey || e.metaKey)}
                  onDoubleClick={() => onActivate(svc.id)}
                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-bold ${
                    on
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50'
                  }`}
                >
                  <span className="truncate">
                    {svc.name}
                    {extra ? ` · ${extra}` : ''}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
      <p className="border-t border-slate-200 px-3 py-1.5 text-[9px] font-semibold text-slate-400">
        Ctrl · çoklu · çift tık aktarır
      </p>
    </div>
  );
}

export function ServiceTransfer({
  services,
  selectedIds,
  onChange,
  labelExtra,
  emptyHint = 'Hizmet yok',
}: Props) {
  const [leftPick, setLeftPick] = useState<Set<string>>(() => new Set());
  const [rightPick, setRightPick] = useState<Set<string>>(() => new Set());

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const available = useMemo(
    () => services.filter(s => !selectedSet.has(s.id)),
    [services, selectedSet],
  );
  const assigned = useMemo(
    () => services.filter(s => selectedSet.has(s.id)),
    [services, selectedSet],
  );

  const togglePick = (
    side: 'left' | 'right',
    id: string,
    additive: boolean,
  ) => {
    const setter = side === 'left' ? setLeftPick : setRightPick;
    setter(prev => {
      if (!additive) {
        return prev.has(id) && prev.size === 1 ? new Set() : new Set([id]);
      }
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moveToRight = (ids: string[]) => {
    if (!ids.length) return;
    onChange([...new Set([...selectedIds, ...ids])]);
    setLeftPick(new Set());
  };

  const moveToLeft = (ids: string[]) => {
    if (!ids.length) return;
    const drop = new Set(ids);
    onChange(selectedIds.filter(id => !drop.has(id)));
    setRightPick(new Set());
  };

  if (services.length === 0) {
    return <p className="text-sm font-semibold text-slate-400">{emptyHint}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
      <ListBox
        title="Tüm hizmetler"
        items={available}
        selected={leftPick}
        onToggle={(id, additive) => togglePick('left', id, additive)}
        onSelectAllVisible={() => setLeftPick(new Set(available.map(s => s.id)))}
        onActivate={id => moveToRight([id])}
        emptyText="Hepsi sağda"
        labelExtra={labelExtra}
      />

      <div className="flex flex-row items-center justify-center gap-2 sm:flex-col sm:px-1">
        <button
          type="button"
          title="Seçilenleri sağa aktar"
          disabled={leftPick.size === 0}
          onClick={() => moveToRight([...leftPick])}
          className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40"
        >
          →
        </button>
        <button
          type="button"
          title="Tümünü sağa aktar"
          disabled={available.length === 0}
          onClick={() => moveToRight(available.map(s => s.id))}
          className="rounded-xl bg-brand-100 px-3 py-2 text-[10px] font-black text-brand-800 ring-1 ring-brand-200 disabled:opacity-40"
        >
          Tümü →
        </button>
        <button
          type="button"
          title="Seçilenleri sola al"
          disabled={rightPick.size === 0}
          onClick={() => moveToLeft([...rightPick])}
          className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-40"
        >
          ←
        </button>
        <button
          type="button"
          title="Sağdakilerin tümünü çıkar"
          disabled={assigned.length === 0}
          onClick={() => moveToLeft(assigned.map(s => s.id))}
          className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600 ring-1 ring-slate-200 disabled:opacity-40"
        >
          ← Tümü
        </button>
      </div>

      <ListBox
        title="Atanan"
        items={assigned}
        selected={rightPick}
        onToggle={(id, additive) => togglePick('right', id, additive)}
        onSelectAllVisible={() => setRightPick(new Set(assigned.map(s => s.id)))}
        onActivate={id => moveToLeft([id])}
        emptyText="Henüz yok"
        labelExtra={labelExtra}
      />
    </div>
  );
}
