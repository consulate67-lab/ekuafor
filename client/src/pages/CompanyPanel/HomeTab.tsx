/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import type { Ctx } from './index';

export function HomeTab({ ctx }: { ctx: Ctx }) {
    const { company, isLicenseExpired, renewingLicense, handleRenewLicense, staffBoards, departments, switchTab } = ctx;
    return (
                        <div className="space-y-6">
                            {isLicenseExpired && (
                                <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-rose-200/20">
                                    <div className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-rose-500/20 flex-shrink-0 animate-bounce">
                                        💳
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-xl font-black text-rose-900 uppercase tracking-tighter">Lisans Süreniz Doldu</h3>
                                        <p className="text-sm text-rose-600 font-bold mt-1 uppercase tracking-widest opacity-70">İşlemlere devam etmek için ödeme yapmanız gerekmektedir.</p>
                                    </div>
                                    <button
                                        onClick={handleRenewLicense}
                                        disabled={renewingLicense}
                                        className="px-10 py-5 bg-rose-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/30 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {renewingLicense ? 'Bekleyiniz...' : 'ÖDEME YAP'}
                                    </button>
                                </div>
                            )}

                            {!isLicenseExpired && company.license_end_date && (() => {
                                const diff = new Date(company.license_end_date).getTime() - new Date().getTime();
                                const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                                if (days <= 15) {
                                    return (
                                        <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-amber-200/20">
                                            <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 flex-shrink-0">
                                                ⚠️
                                            </div>
                                            <div className="flex-1 text-center md:text-left">
                                                <h3 className="text-xl font-black text-amber-900 uppercase tracking-tighter">Lisans Süresi Yaklaşıyor</h3>
                                                <p className="text-sm text-amber-600 font-bold mt-1 uppercase tracking-widest opacity-70">Lisansınızın bitmesine {days} gün kaldı.</p>
                                            </div>
                                            <button
                                                onClick={handleRenewLicense}
                                                disabled={renewingLicense}
                                                className="px-10 py-5 bg-amber-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-500/30 active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                {renewingLicense ? 'Bekleyiniz...' : 'YENİLE'}
                                            </button>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Welcome Card */}
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-7 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 mb-2">Hoş Geldiniz</p>
                                <h2 className="text-2xl font-black tracking-tight">{company.name}</h2>
                                <p className="text-white/60 text-sm mt-1">{company.address_line || company.district || ''} {company.city || ''}</p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white rounded-2xl p-4 text-center shadow-lg shadow-slate-200/30 border border-slate-50">
                                    <p className="text-3xl font-black text-indigo-600">{staffBoards.length}</p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Personel</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 text-center shadow-lg shadow-slate-200/30 border border-slate-50">
                                    <p className="text-3xl font-black text-emerald-600">
                                        {company.work_start_time?.substring(0, 5) || '09:00'}
                                    </p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Açılış</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 text-center shadow-lg shadow-slate-200/30 border border-slate-50">
                                    <p className="text-3xl font-black text-purple-600">
                                        {company.work_end_time?.substring(0, 5) || '20:00'}
                                    </p>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Kapanış</p>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hızlı İşlemler</p>
                                {[
                                    { icon: '📅', label: 'Müşteri Randevu QR Kodu', desc: 'Müşterilerin randevu alması için', tab: 'booking' as TabKey },
                                    { icon: '📦', label: 'Envanter & Stok Yönetimi', desc: 'Malzeme ve sarfiyat takibi', tab: 'inventory' as TabKey },
                                    { icon: '✂️', label: (company.service_label || 'Hizmet') + ' ve Paket Yönetimi', desc: 'Fiyat ve süre tanımlamaları', tab: 'services' as TabKey },
                                    { icon: '👤', label: 'Yeni Personel Ekle', desc: 'Board kodu ile giriş yapacak', tab: 'staff' as TabKey },
                                    { icon: '🏢', label: 'Departman Yönet', desc: 'Birimlerinizi düzenleyin', tab: 'dept' as TabKey },
                                ].map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={() => switchTab(action.tab)}
                                        className="w-full bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/20 border border-slate-50 flex items-center gap-4 hover:shadow-xl active:scale-[0.98] transition-all text-left"
                                    >
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">{action.icon}</div>
                                        <div>
                                            <p className="font-black text-slate-900 text-sm">{action.label}</p>
                                            <p className="text-xs text-slate-400">{action.desc}</p>
                                        </div>
                                        <svg className="w-5 h-5 text-slate-300 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                ))}
                            </div>

                            {/* Info Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/20 border border-slate-50">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Departman</p>
                                    <p className="text-sm font-black text-slate-900">{departments.length} birim</p>
                                </div>
                                <div className="bg-white rounded-2xl p-4 shadow-lg shadow-slate-200/20 border border-slate-50 col-span-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hizmet Verilenler</p>
                                    <div className="flex gap-2 mt-1">
                                        {(company?.genders || []).map((g: string) => (
                                            <span key={g} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-black">{g}</span>
                                        ))}
                                        {(!company?.genders || company.genders.length === 0) && (
                                            <span className="text-[10px] text-slate-400 italic">Belirtilmemiş</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
    );
}

export function BookingQRTab({ ctx }: { ctx: Ctx }) {
    const { company, bookingUrl, copyText, copiedField, qrApiUrl } = ctx;
    return (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 text-center">
                                <div className="inline-flex px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-amber-100">
                                    Müşteri Randevu QR Kodu
                                </div>

                                <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
                                    Bu QR kodu müşterilerinize gösterin veya yazdırıp dükkanınıza asın. Taratarak doğrudan randevu alabilirler.
                                </p>

                                {/* Real QR Code */}
                                <div className="bg-white border-4 border-slate-900 rounded-3xl p-5 inline-block mb-6">
                                    <img
                                        src={qrApiUrl(bookingUrl, 250)}
                                        alt="Müşteri Randevu QR"
                                        className="w-52 h-52"
                                    />
                                </div>

                                <p className="text-xs text-slate-400 mb-2">Müşterileriniz bu QR'ı taratarak randevu alabilir</p>
                                <p className="text-[10px] text-slate-300 font-mono break-all px-4">{bookingUrl}</p>

                                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                                    <button
                                        onClick={() => copyText(bookingUrl, 'booking-url')}
                                        className={`px-5 py-3 rounded-2xl text-sm font-black active:scale-95 transition-all w-full sm:w-auto ${copiedField === 'booking-url'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        {copiedField === 'booking-url' ? '✅ Kopyalandı!' : '📋 Linki Kopyala'}
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="px-5 py-3 bg-amber-600 text-white rounded-2xl text-sm font-black hover:bg-amber-500 active:scale-95 transition-all w-full sm:w-auto"
                                    >
                                        🖨️ Yazdır
                                    </button>
                                </div>
                            </div>

                            {/* Print Stand Preview */}
                            <div className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/20 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">QR Standı Önizleme</p>
                                <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-2xl p-6 max-w-xs mx-auto text-white">
                                    <p className="text-lg font-black mb-1">{company.name}</p>
                                    <p className="text-[10px] text-white/50 uppercase tracking-widest mb-4">Online Randevu</p>
                                    <div className="bg-white rounded-xl p-3 inline-block mb-3">
                                        <img
                                            src={qrApiUrl(bookingUrl, 150)}
                                            alt="Stand QR"
                                            className="w-28 h-28"
                                        />
                                    </div>
                                    <p className="text-[9px] text-white/40">QR kodu taratarak randevu alabilirsiniz</p>
                                </div>
                                <a
                                    href={qrApiUrl(bookingUrl, 1000)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-4 text-xs text-indigo-500 font-bold hover:underline"
                                >
                                    Yüksek Çözünürlüklü QR İndir ↗
                                </a>
                            </div>
                        </div>
    );
}

export function AdminQRTab({ ctx }: { ctx: Ctx }) {
    const { company, copyText, copiedField, qrApiUrl, generateBoardKey } = ctx;
    return (
                        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 w-full max-w-md">

                                {/* Üst Badge */}
                                <div className="flex justify-center mb-8">
                                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Firma Yönetim Kodu
                                    </div>
                                </div>

                                {/* QR Code - Centered */}
                                <div className="flex justify-center mb-6">
                                    <div className="bg-white border-4 border-slate-900 rounded-3xl p-5">
                                        <img
                                            src={qrApiUrl(`${window.location.origin}${import.meta.env.BASE_URL}company-panel?key=${company.admin_key}`, 250)}
                                            alt="Admin Panel QR"
                                            className="w-44 h-44 mx-auto block"
                                        />
                                    </div>
                                </div>

                                {/* Barcode */}
                                <div className="flex justify-center mb-6">
                                    <img
                                        src={`https://barcodeapi.org/api/128/${encodeURIComponent(company.admin_key || 'N/A')}`}
                                        alt="Barcode"
                                        className="h-14 max-w-full"
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                </div>

                                {/* Admin Key Code */}
                                <div className="text-center mb-2">
                                    <p className="text-2xl font-black text-slate-900 tracking-[0.25em] font-mono">
                                        {company.admin_key || 'Anahtar yok'}
                                    </p>
                                </div>

                                <p className="text-center text-xs text-slate-400 mb-6">
                                    Bu kodu firmaya yönetici olarak giriş yapmak için kullanın
                                </p>

                                {/* Action Buttons */}
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={() => copyText(company.admin_key || '', 'admin-key')}
                                        className={`flex-1 max-w-[160px] py-3.5 rounded-2xl text-sm font-black active:scale-95 transition-all ${copiedField === 'admin-key'
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-900 text-white hover:bg-slate-800'
                                            }`}
                                    >
                                        {copiedField === 'admin-key' ? '✅ Kopyalandı!' : '📋 Kopyala'}
                                    </button>
                                    <button
                                        onClick={() => window.print()}
                                        className="flex-1 max-w-[160px] py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500 active:scale-95 transition-all"
                                    >
                                        🖨️ Yazdır
                                    </button>
                                </div>
                            </div>

                            {/* Board Key Card */}
                            <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/20 w-full max-w-md mt-5 flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Salon Board Anahtarı</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-base font-black text-slate-900 tracking-widest font-mono">{company.board_key || '—'}</p>
                                        <button
                                            onClick={generateBoardKey}
                                            className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                        >
                                            {company.board_key ? 'Anahtarı Değiştir' : 'Anahtar Oluştur'}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => copyText(company.board_key || '', 'board-key')}
                                    className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${copiedField === 'board-key' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white shadow-lg shadow-slate-200'}`}
                                >
                                    {copiedField === 'board-key' ? 'Kopyalandı' : 'Kodu Kopyala'}
                                </button>
                            </div>
                        </div>
    );
}
