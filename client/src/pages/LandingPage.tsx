import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../api/client';
import { sectorsApi, type Sector } from '../api/sectors';
import { Button, SectorIcon, Sheet } from '../components/ui';
import { getPosition } from '../lib/geo';

const VERIFICATION_PHONE = '+908503058349';

const FEATURES = [
    { icon: '📅', title: 'Online randevu', text: 'Müşterileriniz 7/24 uygun saati görüp randevu alır; çakışma ve çift satış olmaz.' },
    { icon: '✅', title: 'Onay ve bildirim', text: 'Gelen talepleri tek dokunuşla onaylayın, müşteriye SMS ve bildirim gitsin.' },
    { icon: '📊', title: 'Masraf ve rapor', text: 'Günlük ciro, masraf ve personel bazında raporlar cebinizde.' },
    { icon: '📺', title: 'İşletme ekranı', text: 'Tablet veya TV’de günün tüm randevuları, sahaları ve dersleri tek bakışta.' },
];

const EMPTY_FORM = {
    name: '', phone: '', email: '', password: '', address_line: '', city: '', district: '',
    sector_slug: '', latitude: null as number | null, longitude: null as number | null,
};

export default function LandingPage() {
    const navigate = useNavigate();
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [locating, setLocating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        sectorsApi.list().then(setSectors).catch(() => setSectors([]));
    }, []);

    const set = (patch: Partial<typeof EMPTY_FORM>) => setForm(prev => ({ ...prev, ...patch }));

    const locate = async () => {
        setLocating(true);
        const pos = await getPosition(10000);
        setLocating(false);
        if (pos) set({ latitude: pos.lat, longitude: pos.lng });
        else setError('Konum alınamadı. Tarayıcının konum iznini kontrol edin.');
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
            const res = await api.post('/companies/register', { ...form, email: form.email.toLowerCase().trim(), sector_slug: form.sector_slug || undefined });
            const code = res.data.data.verification_code;
            const separator = /iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?';
            setDone(true);
            setTimeout(() => { window.location.href = `sms:${VERIFICATION_PHONE}${separator}body=${code}`; }, 1500);
        } catch (err) {
            setError(apiError(err, 'Kayıt sırasında bir hata oluştu.'));
        } finally {
            setSubmitting(false);
        }
    };

    const close = () => {
        if (submitting) return;
        setOpen(false);
        if (done) {
            setDone(false);
            setForm(EMPTY_FORM);
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900">
            <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
                <div className="flex items-center gap-2">
                    <img src="./app-icon.png" alt="" className="w-10 h-10 rounded-xl" />
                    <span className="text-xl font-black tracking-tight">Saloon</span>
                </div>
                <button type="button" onClick={() => navigate('/login')} className="text-sm font-bold text-slate-600 hover:text-brand-600">İşletme girişi</button>
            </nav>

            <header className="max-w-6xl mx-auto px-6 pt-10 pb-16 text-center">
                <p className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-black uppercase tracking-widest">Her sektör için online randevu</p>
                <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-tight leading-tight">
                    Randevularınız tek yerde,<br className="hidden md:block" /> müşterileriniz bir dokunuş uzağınızda.
                </h1>
                <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto">
                    Pilates stüdyosu, halı saha, havuz, masaj salonu, kuaför veya klinik: Saloon ile müşterileriniz uygun saati görür, siz onaylarsınız.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                    <Button size="lg" onClick={() => setOpen(true)}>İşletmemi kaydet</Button>
                    <Button size="lg" variant="secondary" onClick={() => navigate('/app')}>Randevu al</Button>
                </div>
            </header>

            {sectors.length > 0 && (
                <section className="bg-slate-50 py-14">
                    <div className="max-w-6xl mx-auto px-6">
                        <h2 className="text-center text-2xl font-black">Hangi sektörlerdeyiz?</h2>
                        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {sectors.map(s => (
                                <button
                                    key={s.slug}
                                    type="button"
                                    onClick={() => navigate(`/app?sektor=${s.slug}`)}
                                    className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col items-center gap-2 hover:shadow-md transition"
                                >
                                    <SectorIcon icon={s.icon} color={s.color} />
                                    <span className="text-sm font-bold text-slate-700 text-center">{s.name_tr}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <section className="max-w-6xl mx-auto px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {FEATURES.map(f => (
                    <div key={f.title} className="rounded-3xl border border-slate-100 p-6">
                        <div className="text-3xl" aria-hidden>{f.icon}</div>
                        <h3 className="mt-3 font-black">{f.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{f.text}</p>
                    </div>
                ))}
            </section>

            <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
                <button type="button" onClick={() => navigate('/kvkk')} className="hover:text-slate-600">KVKK Aydınlatma Metni</button>
            </footer>

            <Sheet open={open} onClose={close} title={done ? 'Başvurunuz alındı' : 'İşletmenizi kaydedin'}>
                {done ? (
                    <div className="text-center py-6">
                        <div className="text-5xl" aria-hidden>✅</div>
                        <p className="mt-4 text-slate-600">
                            Açılan SMS ekranından <b>mesajı gönderin</b>. Mesajınız ulaştığında işletmeniz onaylanır ve giriş bilgileriniz SMS ile gelir.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-3">
                        <Field label="Sektör">
                            <select required value={form.sector_slug} onChange={e => set({ sector_slug: e.target.value })} className={INPUT}>
                                <option value="">Seçin</option>
                                {sectors.map(s => <option key={s.slug} value={s.slug}>{s.icon} {s.name_tr}</option>)}
                            </select>
                        </Field>
                        <Field label="İşletme adı">
                            <input required minLength={2} value={form.name} onChange={e => set({ name: e.target.value })} className={INPUT} placeholder="Örn: Mavi Pilates Stüdyosu" />
                        </Field>
                        <Field label="Telefon (doğrulama SMS'i)">
                            <input required type="tel" value={form.phone} onChange={e => set({ phone: e.target.value })} className={INPUT} placeholder="05XX XXX XX XX" />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="E-posta">
                                <input required type="email" value={form.email} onChange={e => set({ email: e.target.value })} className={INPUT} placeholder="ornek@isletme.com" />
                            </Field>
                            <Field label="Şifre">
                                <input required type="password" minLength={6} value={form.password} onChange={e => set({ password: e.target.value })} className={INPUT} placeholder="En az 6 karakter" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="İl">
                                <input value={form.city} onChange={e => set({ city: e.target.value })} className={INPUT} placeholder="İstanbul" />
                            </Field>
                            <Field label="İlçe">
                                <input value={form.district} onChange={e => set({ district: e.target.value })} className={INPUT} placeholder="Kadıköy" />
                            </Field>
                        </div>
                        <Field label="Açık adres">
                            <textarea rows={2} value={form.address_line} onChange={e => set({ address_line: e.target.value })} className={`${INPUT} resize-none`} placeholder="Cadde, sokak, no" />
                        </Field>
                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-bold text-slate-500">
                                {form.latitude ? '📍 Konum alındı' : 'Müşterilerin sizi yakında bulabilmesi için işletmenin konumu gerekli.'}
                            </p>
                            <Button size="sm" variant="secondary" loading={locating} disabled={!!form.latitude} onClick={locate} className="shrink-0 whitespace-nowrap">Konumu al</Button>
                        </div>
                        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
                        <Button type="submit" block size="lg" loading={submitting} disabled={!form.latitude}>Başvuruyu gönder</Button>
                        <p className="text-[11px] text-center text-slate-400">
                            Başvurarak <button type="button" onClick={() => navigate('/kvkk')} className="underline">KVKK Aydınlatma Metni</button>'ni okuduğunuzu kabul edersiniz.
                        </p>
                    </form>
                )}
            </Sheet>
        </div>
    );
}

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500';

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</span>
            {children}
        </label>
    );
}
