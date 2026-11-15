import { useEffect, useId, useRef, useState } from 'react';
import { formatDateTr } from '../lib/dates';

/** YYYY-MM-DD → geçerli mi */
function isIsoDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Gün.ay.yıl / gün/ay/yıl → YYYY-MM-DD */
export function parseDateTr(text: string): string | null {
  const t = text.trim().replace(/\s+/g, '');
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(t);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return isIsoDate(iso) ? iso : null;
}

type Props = {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
};

/** Görünüm: GG.AA.YYYY — değer: YYYY-MM-DD */
export function DateField({ value, onChange, className = '', min, max, disabled }: Props) {
  const id = useId();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => formatDateTr(value));

  useEffect(() => {
    setText(formatDateTr(value));
  }, [value]);

  const commitText = () => {
    const parsed = parseDateTr(text);
    if (parsed) {
      if (min && parsed < min) {
        setText(formatDateTr(value));
        return;
      }
      if (max && parsed > max) {
        setText(formatDateTr(value));
        return;
      }
      onChange(parsed);
      setText(formatDateTr(parsed));
      return;
    }
    setText(formatDateTr(value));
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="GG.AA.YYYY"
        value={text === '—' ? '' : text}
        disabled={disabled}
        onChange={e => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitText();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-3 pr-11 font-bold"
        aria-describedby={`${id}-hint`}
      />
      <span id={`${id}-hint`} className="sr-only">
        Tarih gün.ay.yıl
      </span>
      <button
        type="button"
        disabled={disabled}
        title="Takvim"
        aria-label="Takvimden seç"
        onClick={() => {
          const el = pickerRef.current;
          if (!el) return;
          try {
            el.showPicker?.();
          } catch {
            el.click();
          }
        }}
        className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/80 disabled:opacity-40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={isIsoDate(value) ? value : ''}
        min={min}
        max={max}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        onChange={e => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="pointer-events-none absolute inset-0 h-px w-px opacity-0"
      />
    </div>
  );
}
