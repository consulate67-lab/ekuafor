import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

/**
 * KVKK Aydınlatma Metni + Veri Sahibi Talep Sayfası
 *
 * KVKK md. 10 (aydınlatma yükümlülüğü) ve md. 11 (veri sahibi hakları) gereği:
 * - Hangi verileri topluyoruz, neden, ne kadar süre saklıyoruz
 * - Veri sahibi hakları: bilgi alma, düzeltme, silme
 * - Talep formu: 30 gün içinde dönüş sözü
 */
export default function KvkkPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        requestType: 'info' as 'info' | 'delete' | 'correct',
        requesterName: '',
        requesterEmail: '',
        requesterPhone: '',
        companyName: '',
        reason: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ ok: boolean; message: string; requestId?: number } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setResult(null);
        try {
            const res = await api.post('/kvkk/data-request', form);
            if (res.data?.success) {
                setResult({ ok: true, message: res.data.message, requestId: res.data.requestId });
                setForm({ ...form, reason: '', companyName: '' });
            } else {
                setResult({ ok: false, message: res.data?.error || 'Talep gönderilemedi' });
            }
        } catch (err: any) {
            setResult({ ok: false, message: err.response?.data?.error || 'Bağlantı hatası' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-gradient-to-br from-indigo-700 to-purple-800 text-white">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-white/80 hover:text-white text-sm mb-4 flex items-center gap-1"
                    >
                        ← Geri
                    </button>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2">KVKK Aydınlatma Metni</h1>
                    <p className="text-indigo-100 text-sm md:text-base">
                        6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sahibi haklarınız.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Aydınlatma Metni */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded" /> Veri Sorumlusu
                    </h2>
                    <p className="text-slate-700 leading-relaxed mb-4">
                        SalonCebinde (bundan böyle "Platform") olarak, güzellik salonu / kuaför / spa
                        işletmelerine yönelik dijital randevu ve yönetim hizmeti sunmaktayız.
                        Bu hizmet kapsamında kişisel verileriniz KVKK'ya uygun şekilde işlenmektedir.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-1">
                        <div><span className="font-semibold text-slate-900">İletişim:</span> iletisim@saloncebinde.com</div>
                        <div><span className="font-semibold text-slate-900">Web:</span> https://saloncebinde.com</div>
                    </div>
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded" /> İşlenen Veriler ve Amaç
                    </h2>
                    <ul className="space-y-2 text-slate-700 leading-relaxed">
                        <li className="flex gap-2">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <span>
                                <strong className="text-slate-900">İşletme bilgileri</strong> (ad, adres, telefon, web sitesi):
                                Açık veri kaynaklarından (<em>OpenStreetMap</em>) otomatik olarak toplanır, KVKK md. 5/2(d)
                                kapsamında alenileştirme amacıyla rehber hizmetinde gösterilir.
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <span>
                                <strong className="text-slate-900">Kullanıcı hesap bilgileri</strong> (e-posta, telefon, şifre):
                                Platform'a kayıt ve giriş için. BCrypt ile hash'lenmiş saklanır.
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <span className="text-indigo-500 mt-0.5">•</span>
                            <span>
                                <strong className="text-slate-900">Randevu ve işlem kayıtları</strong>: Hizmet sunumu için
                                yasal zorunluluk (VUK, TTK) kapsamında 5 yıl süreyle saklanır.
                            </span>
                        </li>
                    </ul>
                </section>

                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded" /> Veri Sahibi Haklarınız (KVKK md. 11)
                    </h2>
                    <p className="text-slate-700 leading-relaxed mb-3">
                        Aşağıdaki taleplerinizi bu sayfadaki formu doldurarak iletebilirsiniz.
                        Talepleriniz <strong>en geç 30 gün</strong> içinde sonuçlandırılacaktır.
                    </p>
                    <ul className="space-y-2 text-slate-700 text-sm">
                        <li>📋 <strong>Bilgi alma</strong> — Hangi verilerinizin işlendiğini öğrenme</li>
                        <li>✏️ <strong>Düzeltme</strong> — Yanlış/eksik verilerin düzeltilmesini talep etme</li>
                        <li>🗑️ <strong>Silme</strong> — Verilerinizin silinmesini talep etme (yasal saklama süresi bitmiş olanlar)</li>
                    </ul>
                </section>

                {/* Talep Formu */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded" /> Veri Sahibi Talep Formu
                    </h2>

                    {result && (
                        <div className={`mb-4 p-4 rounded-xl border ${result.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                            {result.ok ? '✅' : '⚠️'} {result.message}
                            {result.requestId && <div className="text-xs mt-1 opacity-75">Talep No: #{result.requestId}</div>}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Talep Türü *</label>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { v: 'info', l: '📋 Bilgi Alma' },
                                    { v: 'correct', l: '✏️ Düzeltme' },
                                    { v: 'delete', l: '🗑️ Silme' },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.v}
                                        type="button"
                                        onClick={() => setForm({ ...form, requestType: opt.v })}
                                        className={`py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all ${form.requestType === opt.v
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                                    >
                                        {opt.l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Ad Soyad *</label>
                                <input
                                    type="text"
                                    required
                                    minLength={2}
                                    maxLength={200}
                                    value={form.requesterName}
                                    onChange={e => setForm({ ...form, requesterName: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">E-posta *</label>
                                <input
                                    type="email"
                                    required
                                    value={form.requesterEmail}
                                    onChange={e => setForm({ ...form, requesterEmail: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Telefon</label>
                                <input
                                    type="tel"
                                    maxLength={20}
                                    value={form.requesterPhone}
                                    onChange={e => setForm({ ...form, requesterPhone: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">İlgili İşletme Adı (opsiyonel)</label>
                                <input
                                    type="text"
                                    maxLength={255}
                                    value={form.companyName}
                                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Talep Detayı</label>
                            <textarea
                                rows={4}
                                maxLength={2000}
                                value={form.reason}
                                onChange={e => setForm({ ...form, reason: e.target.value })}
                                placeholder="Talebinizle ilgili ek bilgi..."
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-700 text-white font-bold rounded-xl hover:opacity-95 disabled:opacity-50 transition-all"
                        >
                            {submitting ? 'Gönderiliyor...' : 'Talebi Gönder'}
                        </button>
                        <p className="text-xs text-slate-500 text-center">
                            Talepler KVKK md. 13 kapsamında en geç 30 gün içinde sonuçlandırılır.
                        </p>
                    </form>
                </section>

                <p className="text-center text-xs text-slate-500 py-4">
                    © {new Date().getFullYear()} SalonCebinde — KVKK uyumlu, ücretsiz, açık veri.
                </p>
            </div>
        </div>
    );
}
