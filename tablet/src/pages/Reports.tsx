import { useMemo, useState } from 'react';
import { IconBack, IconSettings } from '../components/Icons';
import { useAppStore } from '../store/appStore';

export function Reports() {
  const company = useAppStore(s => s.company);
  const staff = useAppStore(s => s.staff);
  const events = useAppStore(s => s.events);
  const expenses = useAppStore(s => s.expenses);
  const deviceId = useAppStore(s => s.deviceId);
  const lastSyncAt = useAppStore(s => s.lastSyncAt);
  const syncQueue = useAppStore(s => s.syncQueue);
  const syncReports = useAppStore(s => s.syncReports);
  const retryFinalize = useAppStore(s => s.retryFinalize);
  const lastFinalizeMessage = useAppStore(s => s.lastFinalizeMessage);
  const setScreen = useAppStore(s => s.setScreen);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const appointments = events.filter(e => e.kind === 'appointment' && e.status !== 'cancelled');
    const leaves = events.filter(e => e.kind === 'leave' && e.status !== 'cancelled');
    const done = appointments.filter(e => e.status === 'done');
    const collected = done.reduce((sum, e) => sum + (e.collectedPrice ?? 0), 0);
    const cash = done.filter(e => e.paymentMethod === 'cash').reduce((sum, e) => sum + (e.collectedPrice ?? 0), 0);
    const card = done.filter(e => e.paymentMethod === 'card').reduce((sum, e) => sum + (e.collectedPrice ?? 0), 0);
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      appointments: appointments.length,
      done: done.length,
      leaves: leaves.length,
      collected,
      cash,
      card,
      expenseTotal,
      byStaff: staff.map(s => ({
        name: `${s.firstName} ${s.lastName}`,
        count: appointments.filter(e => e.staffId === s.id).length,
        leave: leaves.filter(e => e.staffId === s.id).length,
        collected: done.filter(e => e.staffId === s.id).reduce((sum, e) => sum + (e.collectedPrice ?? 0), 0),
        cash: done.filter(e => e.staffId === s.id && e.paymentMethod === 'cash').reduce((sum, e) => sum + (e.collectedPrice ?? 0), 0),
        card: done.filter(e => e.staffId === s.id && e.paymentMethod === 'card').reduce((sum, e) => sum + (e.collectedPrice ?? 0), 0),
        expense: expenses.filter(e => e.staffId === s.id).reduce((sum, e) => sum + e.amount, 0),
      })),
    };
  }, [events, expenses, staff]);

  const sync = async () => {
    setBusy(true);
    setMessage('');
    const msg = await syncReports();
    setMessage(msg);
    setBusy(false);
  };

  return (
    <div className="min-h-full bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            title="Panele dön"
            aria-label="Panele dön"
            onClick={() => setScreen('board')}
            className="btn btn-secondary btn-icon"
          >
            <IconBack />
          </button>
          <button
            type="button"
            title="Parametre"
            aria-label="Parametre"
            onClick={() => setScreen('settings')}
            className="btn btn-dark btn-icon"
          >
            <IconSettings />
          </button>
        </div>
        <h1 className="mt-3 text-xl font-black">Raporlar</h1>
        <p className="text-xs font-semibold text-slate-500">Cihaz: {deviceId}</p>
      </header>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Card label="Randevu" value={String(stats.appointments)} />
          <Card label="Tamamlanan" value={String(stats.done)} />
          <Card label="İzin" value={String(stats.leaves)} />
          <Card label="Tahsilat" value={`₺${stats.collected}`} />
          <Card label="Nakit" value={`₺${stats.cash}`} />
          <Card label="Kart" value={`₺${stats.card}`} />
          <Card label="Masraf" value={`₺${stats.expenseTotal}`} />
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-black">Çalışan bazında</h2>
          <ul className="mt-3 space-y-2">
            {stats.byStaff.map(row => (
              <li key={row.name} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold">
                <span>{row.name}</span>
                <span className="text-right text-slate-500">
                  {row.count} randevu · {row.leave} izin
                  <br />
                  ₺{row.collected} (N ₺{row.cash} · K ₺{row.card}) · masraf ₺{row.expense}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-black">Online senkron</h2>
          <p className="text-sm text-slate-600">
            Randevu ve izinler tablette tutulur. İnternet varken özet rapor sunucuya gönderilir; merkez bu cihazın verisine buradan ulaşır.
          </p>
          <p className="text-xs font-semibold text-slate-400">
            Son senkron: {lastSyncAt ? new Date(lastSyncAt).toLocaleString('tr-TR') : 'henüz yok'}
            {syncQueue.length > 0 ? ` · kuyruk: ${syncQueue.length}` : ''}
          </p>
          <p className="text-xs font-semibold text-slate-500">
            Merkez firma id: {company?.serverCompanyId ?? 'henüz yok'}
            {lastFinalizeMessage ? ` · ${lastFinalizeMessage}` : ''}
          </p>
          {!company?.serverCompanyId && (
            <button
              type="button"
              disabled={busy || !company}
              onClick={async () => {
                setBusy(true);
                setMessage(await retryFinalize());
                setBusy(false);
              }}
              className="btn btn-secondary btn-block"
            >
              Firmayı sisteme kaydet
            </button>
          )}
          <button
            type="button"
            disabled={busy || !company}
            onClick={sync}
            className="btn btn-primary btn-block"
          >
            {busy ? 'Gönderiliyor…' : 'Raporu sunucuya gönder'}
          </button>
          {message && <p className="text-sm font-bold text-slate-700">{message}</p>}
        </section>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
