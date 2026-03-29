import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface CallLog {
    id: number;
    transcription: string;
    extracted_info: {
        customerName?: string;
        serviceName?: string;
        date?: string;
        time?: string;
        confidence?: string;
        note?: string;
    };
    appointment_id: number | null;
    was_auto_created: boolean;
    confidence: string;
    feedback: 'pending' | 'correct' | 'incorrect';
    matched_service_name: string | null;
    source: string;
    created_at: string;
    customer_name?: string;
    appointment_date?: string;
    start_time?: string;
    appt_status?: string;
}

const CONFIDENCE_COLORS: Record<string, string> = {
    high: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    low: 'bg-red-500/20 text-red-300 border border-red-500/30',
};


export default function AIAdminPanel() {
    const [logs, setLogs] = useState<CallLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [aiEnabled, setAiEnabled] = useState(true);
    const [aiRules, setAiRules] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [tab, setTab] = useState<'logs' | 'settings'>('logs');
    const [stats, setStats] = useState({ auto_created: 0, correct: 0, incorrect: 0 });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const [logsRes, settingsRes] = await Promise.all([
                api.get('/ai/call-logs', { params: { limit: 100 } }),
                api.get('/ai/settings')
            ]);
            setLogs(logsRes.data.data || []);
            setTotal(logsRes.data.total || 0);
            setStats(logsRes.data.stats || { auto_created: 0, correct: 0, incorrect: 0 });
            setAiEnabled(settingsRes.data.data?.ai_enabled ?? true);
            setAiRules(settingsRes.data.data?.ai_rules || '');
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogs(); }, []);

    const updateFeedback = async (logId: number, feedback: 'correct' | 'incorrect' | 'pending') => {
        try {
            await api.patch(`/ai/call-logs/${logId}/feedback`, { feedback });
            setLogs(prev => prev.map(l => l.id === logId ? { ...l, feedback } : l));
        } catch (e) { console.error(e); }
    };

    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            await api.patch('/ai/settings', { ai_enabled: aiEnabled, ai_rules: aiRules });
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2000);
        } catch (e) { console.error(e); }
        setSavingSettings(false);
    };

    const formatDate = (d: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const successRate = logs.length > 0
        ? Math.round((logs.filter(l => l.was_auto_created).length / logs.length) * 100)
        : 0;

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
            {/* Header */}
            <div className="px-5 pt-14 pb-5">
                <Link to="/dashboard" className="flex items-center gap-1.5 text-purple-300 text-xs font-bold uppercase tracking-widest mb-6">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    Panel
                </Link>

                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-900/50">
                        <span className="text-2xl">🧠</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter">AI Asistan</h1>
                        <p className="text-purple-300 text-xs font-bold uppercase tracking-widest">Öğrenme Merkezi</p>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-2 mt-5">
                    {[
                        { label: 'Toplam', value: total, color: 'from-violet-600 to-purple-700', emoji: '📞' },
                        { label: 'Otomatik', value: stats.auto_created, color: 'from-emerald-600 to-green-700', emoji: '✅' },
                        { label: 'Doğru', value: stats.correct, color: 'from-blue-600 to-cyan-700', emoji: '👍' },
                        { label: 'Başarı %', value: `${successRate}%`, color: 'from-amber-500 to-orange-600', emoji: '🎯' },
                    ].map((s, i) => (
                        <div key={i} className={`bg-gradient-to-br ${s.color} rounded-2xl p-3 text-center shadow-lg`}>
                            <div className="text-lg mb-0.5">{s.emoji}</div>
                            <div className="text-white font-black text-base leading-none">{s.value}</div>
                            <div className="text-white/60 text-[9px] font-bold uppercase tracking-wider mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-5 gap-2 mb-4">
                <button
                    onClick={() => setTab('logs')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'logs' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                    📋 Arama Kayıtları
                </button>
                <button
                    onClick={() => setTab('settings')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === 'settings' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                    ⚙️ AI Ayarları
                </button>
            </div>

            {/* ─── LOGS TAB ─── */}
            {tab === 'logs' && (
                <div className="px-5 pb-24">
                    {loading ? (
                        <div className="text-center py-16">
                            <div className="w-12 h-12 border-4 border-t-violet-500 border-white/10 rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Yükleniyor...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📭</div>
                            <h3 className="text-white font-black text-lg mb-2">Henüz Kayıt Yok</h3>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Telefon görüşmeleri AI tarafından analiz edildikçe burada görüntülenecek ve sistem öğrenecek.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Learning hint */}
                            <div className="bg-violet-600/10 border border-violet-500/20 rounded-2xl p-3.5 flex items-start gap-3">
                                <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
                                <p className="text-violet-200 text-xs leading-relaxed font-medium">
                                    AI her kayıttan öğreniyor. "Doğru" işaretlediğiniz kayıtlar gelecek tahminlerde örnek olarak kullanılıyor.
                                </p>
                            </div>

                            {logs.map(log => {
                                const isExpanded = expandedId === log.id;
                                const info = log.extracted_info || {};
                                return (
                                    <div
                                        key={log.id}
                                        className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all"
                                    >
                                        {/* Log Header */}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                            className="w-full p-4 text-left"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                                        {/* Source badge */}
                                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${log.source === 'audio' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                            {log.source === 'audio' ? '🎙 Ses' : '💬 Metin'}
                                                        </span>
                                                        {/* Confidence */}
                                                        {log.confidence && (
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${CONFIDENCE_COLORS[log.confidence] || CONFIDENCE_COLORS.low}`}>
                                                                {log.confidence === 'high' ? 'Yüksek' : log.confidence === 'medium' ? 'Orta' : 'Düşük'}
                                                            </span>
                                                        )}
                                                        {/* Auto created */}
                                                        {log.was_auto_created && (
                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                ✅ Oluşturuldu
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Extracted summary */}
                                                    <p className="text-white/80 text-xs font-bold">
                                                        {info.customerName || '?'} · {info.serviceName || '?'} · {info.date || '?'} {info.time || ''}
                                                    </p>
                                                    {/* Transcript preview */}
                                                    <p className="text-white/30 text-[10px] italic mt-1 line-clamp-1">
                                                        "{(log.transcription || '').substring(0, 80)}..."
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0 text-white/30 text-[9px] text-right">
                                                    <div className="mb-1">{formatDate(log.created_at)}</div>
                                                    <div className={isExpanded ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }}>▾</div>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div className="border-t border-white/10 p-4 space-y-3">
                                                {/* Full transcript */}
                                                <div>
                                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1.5">Tam Transkript</p>
                                                    <div className="bg-black/30 rounded-xl p-3 text-white/60 text-xs leading-relaxed italic">
                                                        {log.transcription || '—'}
                                                    </div>
                                                </div>

                                                {/* Extracted Info Grid */}
                                                <div>
                                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1.5">AI Çıkarılan Bilgiler</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            ['👤 Müşteri', info.customerName],
                                                            ['✂️ Hizmet', info.serviceName || log.matched_service_name],
                                                            ['📅 Tarih', info.date],
                                                            ['🕐 Saat', info.time],
                                                        ].map(([label, value]) => (
                                                            <div key={label as string} className="bg-white/5 rounded-xl p-2">
                                                                <p className="text-white/30 text-[8px] font-black uppercase">{label}</p>
                                                                <p className="text-white font-bold text-xs mt-0.5">{value || '—'}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Feedback */}
                                                <div>
                                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mb-1.5">Bu tahmin doğru muydu?</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => updateFeedback(log.id, 'correct')}
                                                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${log.feedback === 'correct' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-white/40 hover:bg-emerald-500/20 hover:text-emerald-300'}`}
                                                        >
                                                            👍 Doğru
                                                        </button>
                                                        <button
                                                            onClick={() => updateFeedback(log.id, 'incorrect')}
                                                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${log.feedback === 'incorrect' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-300'}`}
                                                        >
                                                            👎 Yanlış
                                                        </button>
                                                        {log.feedback !== 'pending' && (
                                                            <button
                                                                onClick={() => updateFeedback(log.id, 'pending')}
                                                                className="px-3 py-2.5 rounded-xl text-xs font-black uppercase bg-white/5 text-white/30 hover:bg-white/10 transition-all"
                                                                title="Geri al"
                                                            >↩</button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── SETTINGS TAB ─── */}
            {tab === 'settings' && (
                <div className="px-5 pb-32 space-y-4">
                    {/* Enable/Disable */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-white font-black text-sm">AI Asistan</h3>
                                <p className="text-white/40 text-xs mt-0.5">Sesli arama analizi ve otomatik randevu</p>
                            </div>
                            <button
                                onClick={() => setAiEnabled(!aiEnabled)}
                                className={`relative w-12 h-6 rounded-full transition-all ${aiEnabled ? 'bg-violet-600' : 'bg-white/10'}`}
                            >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${aiEnabled ? 'left-6.5' : 'left-0.5'}`} style={{ left: aiEnabled ? '26px' : '2px' }} />
                            </button>
                        </div>
                    </div>

                    {/* AI Rules / Service names */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <h3 className="text-white font-black text-sm mb-1">Hizmet Listesi & AI Kuralları</h3>
                        <p className="text-white/40 text-xs mb-3 leading-relaxed">
                            Firmanıza özel hizmet adlarını, özel terimleri veya AI için yönlendirme kurallarını buraya yazın.
                            Bu bilgiler her aramada GPT'ye rehber olarak verilir.
                        </p>
                        <textarea
                            value={aiRules}
                            onChange={e => setAiRules(e.target.value)}
                            placeholder={`Örnek:\nHizmetler: Saç kesimi, Boya (balyaj dahil), Fön, Manikür, Pedikür\nSalon saatleri: 09:00 - 20:00\nÖzel not: "gelmek istiyorum" = randevu talebi`}
                            rows={8}
                            className="w-full bg-black/30 text-white/80 text-xs font-mono rounded-xl p-3 outline-none border border-white/10 focus:border-violet-500/50 resize-none leading-relaxed placeholder-white/20"
                        />
                        <p className="text-white/20 text-[10px] mt-2">
                            {aiRules.length} karakter · Her güncellemeden sonra AI bu bilgileri kullanmaya başlar.
                        </p>
                    </div>

                    {/* How it learns */}
                    <div className="bg-violet-600/10 border border-violet-500/20 rounded-2xl p-4">
                        <h3 className="text-violet-200 font-black text-sm mb-2">🧠 AI Nasıl Öğreniyor?</h3>
                        <div className="space-y-2 text-xs text-white/50 leading-relaxed">
                            {[
                                '1. Her telefon görüşmesi kaydedilir ve analiz edilir',
                                '2. AI, tarihi ve saati Türkçe konuşmadan çıkarır',
                                '3. "Doğru" işaretlediğiniz tahminler örnek olarak saklanır',
                                '4. Sonraki aramalarda bu örnekler referans alınır',
                                '5. Firmanıza özgü konuşma kalıpları zamanla tanınır',
                            ].map((s, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className="text-violet-400 font-black flex-shrink-0">→</span>
                                    <span>{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={saveSettings}
                        disabled={savingSettings}
                        className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${settingsSaved ? 'bg-emerald-600 text-white' : 'bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:scale-[1.02] active:scale-95 shadow-purple-900/50'}`}
                    >
                        {savingSettings ? '⏳ Kaydediliyor...' : settingsSaved ? '✅ Kaydedildi!' : '💾 Ayarları Kaydet'}
                    </button>
                </div>
            )}
        </div>
    );
}
