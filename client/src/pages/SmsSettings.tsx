import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface SmsSettings {
    provider: string;
    api_url: string;
    api_key: string;
    is_active: boolean;
    sender_id: string;
}

interface SmsLog {
    id: number;
    phone_number: string;
    message: string;
    status: string;
    error_message: string;
    created_at: string;
}

export default function SmsSettingsPage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [settings, setSettings] = useState<SmsSettings>({
        provider: 'local_gateway',
        api_url: '',
        api_key: '',
        is_active: true,
        sender_id: ''
    });
    const [logs, setLogs] = useState<SmsLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('Salon Cebimde Test Mesajıdır.');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (!user) return;
        fetchSettings();
        fetchLogs();
    }, [user]);

    const fetchSettings = async () => {
        try {
            const res = await api.get(`/sms/settings/${user?.company_id || 0}`);
            if (res.data.settings) {
                setSettings(res.data.settings);
            }
        } catch (e) {
            console.error('Settings fetch error:', e);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await api.get(`/sms/logs/${user?.company_id || 0}`);
            setLogs(res.data.logs || []);
        } catch (e) {
            console.error('Logs fetch error:', e);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/sms/settings', {
                ...settings,
                company_id: user?.company_id || null
            });
            setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi.' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e: any) {
            setMessage({ type: 'error', text: 'Hata: ' + (e.response?.data?.message || e.message) });
        } finally {
            setLoading(false);
        }
    };

    const handleSendTest = async () => {
        if (!testPhone) return alert('Lütfen bir telefon numarası girin.');
        setLoading(true);
        try {
            await api.post('/sms/send', {
                companyId: user?.company_id,
                phoneNumber: testPhone,
                message: testMessage
            });
            setMessage({ type: 'success', text: 'Test mesajı gönderildi.' });
            fetchLogs();
        } catch (e: any) {
            setMessage({ type: 'error', text: 'Gönderim hatası: ' + (e.response?.data?.message || e.message) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50">
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <h1 className="text-xl font-bold heading-serif">SMS Sunucu Ayarları</h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {message && (
                    <div className={`mb-6 p-4 rounded-xl font-bold text-sm ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Settings Form */}
                    <div className="card">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </span>
                            Bağlantı Ayarları
                        </h2>

                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">SMS Sağlayıcı</label>
                                <select
                                    className="input-field"
                                    value={settings.provider}
                                    onChange={e => setSettings({ ...settings, provider: e.target.value })}
                                >
                                    <option value="local_gateway">Yerel Gateway (Vodafone SIM/Android)</option>
                                    <option value="netgsm">Netgsm (XML POST / OTP)</option>
                                    <option value="vodafone_official">Vodafone Resmi API (Yakında)</option>
                                </select>
                            </div>

                            {settings.provider === 'netgsm' && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                                    <p className="text-[10px] text-blue-700 font-bold leading-relaxed mb-2">
                                        💡 Netgsm için API Anahtarı kısmına <span className="underline">kullaniciadi:sifre</span> formatında giriş yapın.
                                    </p>
                                    <p className="text-[9px] text-blue-600 font-medium">
                                        • <strong>Standart SMS (XML):</strong> Boş bırakın veya sonu <code className="bg-blue-100 px-1 rounded">/xml</code> biten URL girin.<br />
                                        • <strong>OTP SMS (Hızlı):</strong> URL kısmına <code className="bg-blue-100 px-1 rounded">https://api.netgsm.com.tr/otp/send/get</code> girin.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    {settings.provider === 'netgsm' ? 'API URL (Standart için boş bırakın)' : 'Gateway URL'}
                                </label>
                                <input
                                    type="url"
                                    placeholder={settings.provider === 'netgsm' ? 'https://api.netgsm.com.tr/sms/send/xml' : 'http://192.168.1.100:8080/send'}
                                    className="input-field"
                                    value={settings.api_url}
                                    onChange={e => setSettings({ ...settings, api_url: e.target.value })}
                                    required={settings.provider !== 'netgsm'}
                                />
                                <p className="mt-1 text-[10px] text-gray-400 font-medium">
                                    {settings.provider === 'netgsm'
                                        ? 'Boş bırakırsanız Netgsm Standart XML servisi kullanılır.'
                                        : 'Telefonunuzdaki Gateway uygulamasının verdiği adresi girin.'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">API Anahtarı / Şifre</label>
                                <input
                                    type="text"
                                    placeholder={settings.provider === 'netgsm' ? 'kullaniciadi:sifre' : 'API Key...'}
                                    className="input-field"
                                    value={settings.api_key}
                                    onChange={e => setSettings({ ...settings, api_key: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Mesaj Başlığı (Sender ID)</label>
                                <input
                                    type="text"
                                    placeholder="Örn: SALON"
                                    className="input-field"
                                    value={settings.sender_id}
                                    onChange={e => setSettings({ ...settings, sender_id: e.target.value })}
                                />
                                <p className="mt-1 text-[10px] text-gray-400 font-medium">Netgsm panelinizde onaylı olan SMS başlığını girin.</p>
                            </div>

                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    className="w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    checked={settings.is_active}
                                    onChange={e => setSettings({ ...settings, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 select-none cursor-pointer">Otomatik SMS Gönderimi Aktif</label>
                            </div>

                            <button
                                type="submit"
                                className="btn-primary w-full py-4 text-sm font-bold shadow-lg shadow-pink-500/20"
                                disabled={loading}
                            >
                                {loading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                            </button>
                        </form>

                        <div className="mt-10 pt-8 border-t border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Test SMS Gönder</h3>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="05..."
                                    className="input-field flex-1"
                                    value={testPhone}
                                    onChange={e => setTestPhone(e.target.value)}
                                />
                                <button
                                    onClick={handleSendTest}
                                    disabled={loading}
                                    className="btn-secondary py-3 px-6 text-sm font-bold border-gray-200"
                                >
                                    Test Et
                                </button>
                            </div>
                            <div className="mt-3">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Test Mesajı</label>
                                <textarea
                                    className="input-field min-h-[60px] text-xs resize-none"
                                    value={testMessage}
                                    onChange={e => setTestMessage(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </span>
                                Gönderim Geçmişi
                            </h2>
                            <button onClick={fetchLogs} className="text-[10px] font-bold text-pink-600 uppercase tracking-widest hover:text-pink-700">Yenile</button>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {logs.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Henüz kayıt yok</p>
                                </div>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className="p-4 rounded-2xl border border-gray-100 bg-white hover:border-violet-200 transition-colors duration-300">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-sm text-gray-900">{log.phone_number}</span>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${log.status === 'sent' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                {log.status === 'sent' ? 'BAŞARILI' : 'HATA'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2 leading-relaxed">{log.message}</p>
                                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                                            <span>{new Date(log.created_at).toLocaleString('tr-TR')}</span>
                                            {log.error_message && <span className="text-red-400 font-medium">{log.error_message}</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-10 card bg-gradient-to-br from-violet-600 to-pink-600 text-white border-none shadow-2xl shadow-violet-500/20">
                    <h3 className="text-xl font-bold mb-4">Kurulum Rehberi 📱</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-widest opacity-80">Netgsm Kullanımı</h4>
                            <ul className="space-y-3">
                                <li className="flex gap-3 text-xs font-semibold">
                                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">1</span>
                                    <span>Sağlayıcıyı "Netgsm OTP Servisi" olarak seçin.</span>
                                </li>
                                <li className="flex gap-3 text-xs font-semibold">
                                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">2</span>
                                    <span>API Anahtarı kısmına <code className="bg-black/20 px-1 rounded">kullaniciadi:sifre</code> yazın.</span>
                                </li>
                                <li className="flex gap-3 text-xs font-semibold">
                                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">3</span>
                                    <span>Mesaj Başlığı kısmına onaylı başlığınızı (örn: FIRMA_ADI) girin.</span>
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-sm font-black uppercase tracking-widest opacity-80">Yerel Gateway Kullanımı</h4>
                            <p className="text-[10px] font-medium opacity-90 leading-relaxed">
                                Android telefonunuza "SMS Gateway API" indirip Vodafone hattınız üzerinden ücretsiz SMS gönderebilirsiniz.
                                Gateway URL kısmına telefonun verdiği IP adresini yazmanız yeterlidir.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
