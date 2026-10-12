import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { EXPENSE_CATEGORIES, expensesApi, type Expense, type ExpenseCategory, type Period } from '../../api/business';
import { apiError } from '../../api/client';
import { PeriodTabs } from '../../components/business/PeriodTabs';
import { Button, Card, EmptyState, Sheet, Spinner, formatMoney } from '../../components/ui';
import { dateKey, dayLabel, todayKey } from '../../lib/dates';

const CATEGORY_KEYS = Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[];

const emptyForm = () => ({ amount: '', description: '', category: 'supplies' as ExpenseCategory, date: todayKey() });

export function ExpensesTab() {
    const [period, setPeriod] = useState<Period>('month');
    const [items, setItems] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [deleting, setDeleting] = useState<Expense | null>(null);
    const [busy, setBusy] = useState(false);
    const requestRef = useRef(0);

    const load = useCallback(async () => {
        const request = ++requestRef.current;
        setLoading(true);
        try {
            const list = await expensesApi.list(period, todayKey());
            if (request !== requestRef.current) return;
            setItems(list);
            setError('');
        } catch (err) {
            if (request === requestRef.current) setError(apiError(err, 'Masraflar yüklenemedi'));
        } finally {
            if (request === requestRef.current) setLoading(false);
        }
    }, [period]);

    useEffect(() => { load(); }, [load]);

    const amount = Number(form.amount.replace(',', '.'));
    const canSave = amount > 0 && form.description.trim().length > 0;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSave || saving) return;
        setSaving(true);
        setFormError('');
        try {
            await expensesApi.create({ amount, description: form.description.trim(), category: form.category, date: form.date });
            setForm(f => ({ ...emptyForm(), category: f.category }));
            await load();
        } catch (err) {
            setFormError(apiError(err, 'Masraf kaydedilemedi'));
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!deleting) return;
        setBusy(true);
        try {
            await expensesApi.remove(deleting.id);
            setDeleting(null);
            await load();
        } catch (err) {
            setError(apiError(err, 'Masraf silinemedi'));
            setDeleting(null);
        } finally {
            setBusy(false);
        }
    };

    const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return (
        <div className="space-y-6">
            <Card>
                <form onSubmit={submit} className="space-y-4">
                    <h2 className="font-black text-slate-900">Yeni masraf</h2>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-slate-400">₺</span>
                        <input
                            inputMode="decimal"
                            value={form.amount}
                            onChange={e => setForm(f => ({ ...f, amount: e.target.value.replace(/[^\d.,]/g, '') }))}
                            placeholder="0"
                            aria-label="Tutar"
                            className="w-full pl-10 pr-4 py-4 rounded-2xl border-2 border-slate-100 text-2xl font-black text-slate-900 outline-none focus:border-brand-500"
                        />
                    </div>
                    <div role="radiogroup" aria-label="Kategori" className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
                        {CATEGORY_KEYS.map(key => (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={form.category === key}
                                onClick={() => setForm(f => ({ ...f, category: key }))}
                                className={`shrink-0 px-3 py-2 rounded-full text-xs font-black border transition ${form.category === key ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                                {EXPENSE_CATEGORIES[key].icon} {EXPENSE_CATEGORIES[key].label}
                            </button>
                        ))}
                    </div>
                    <input
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, 500) }))}
                        placeholder="Açıklama (ör. Ekim kirası, şampuan)"
                        aria-label="Açıklama"
                        className="w-full p-4 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-brand-500"
                    />
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={form.date}
                            max={todayKey()}
                            onChange={e => e.target.value && setForm(f => ({ ...f, date: e.target.value }))}
                            aria-label="Tarih"
                            className="flex-1 p-3 rounded-2xl border-2 border-slate-100 font-bold text-slate-700"
                        />
                        <Button type="submit" size="lg" loading={saving} disabled={!canSave}>Kaydet</Button>
                    </div>
                    {formError && <p role="alert" className="text-sm font-bold text-rose-600">{formError}</p>}
                </form>
            </Card>

            <section className="space-y-3" aria-labelledby="expenses-title">
                <PeriodTabs value={period} onChange={setPeriod} />
                <div className="flex items-baseline justify-between px-1">
                    <h2 id="expenses-title" className="text-xs font-black text-slate-400 uppercase tracking-widest">Masraflar · {items.length}</h2>
                    <p className="text-lg font-black text-rose-600">{formatMoney(total)}</p>
                </div>

                {error && <p role="alert" className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold">{error}</p>}

                {loading ? (
                    <div className="py-12 flex justify-center"><Spinner /></div>
                ) : items.length === 0 ? (
                    <EmptyState icon="🧾" title="Bu dönemde masraf yok" />
                ) : (
                    <ul className="space-y-2">
                        {items.map(item => {
                            const category = EXPENSE_CATEGORIES[item.category ?? 'other'] ?? EXPENSE_CATEGORIES.other;
                            return (
                                <li key={item.id}>
                                    <Card className="flex items-center gap-3">
                                        <span className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-xl shrink-0" aria-hidden>{category.icon}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black text-slate-900 truncate">{item.description}</p>
                                            <p className="text-xs font-bold text-slate-400 truncate">
                                                {category.label} · {dayLabel(dateKey(item.expense_date))}
                                                {item.created_by_name && ` · ${item.created_by_name}`}
                                            </p>
                                        </div>
                                        <p className="font-black text-slate-900 shrink-0">{formatMoney(item.amount)}</p>
                                        <button
                                            type="button"
                                            onClick={() => setDeleting(item)}
                                            aria-label={`${item.description} masrafını sil`}
                                            className="w-9 h-9 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 shrink-0"
                                        >
                                            ✕
                                        </button>
                                    </Card>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <Sheet
                open={!!deleting}
                onClose={() => setDeleting(null)}
                title="Masraf silinsin mi?"
                footer={
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="secondary" onClick={() => setDeleting(null)}>Vazgeç</Button>
                        <Button variant="danger" loading={busy} onClick={remove}>Sil</Button>
                    </div>
                }
            >
                {deleting && (
                    <p className="font-bold text-slate-600">{deleting.description} · {formatMoney(deleting.amount)}</p>
                )}
            </Sheet>
        </div>
    );
}
