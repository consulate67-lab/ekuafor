/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import type { Ctx } from './index';

export function CRMTab({ ctx }: { ctx: Ctx }) {
    const { activeTab, customerSearch, setCustomerSearch, customers, loadingCustomers, setSelectedCustomer, automationRules, loadingRules, setEditingRule, setShowAutomationModal, api, company, fetchAutomationRules } = ctx;
    return (
                        <div className="space-y-6">
                            {activeTab === 'customers-list' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-50 shadow-sm">
                                        <div>
                                            <h3 className="font-black text-slate-900 uppercase text-xs tracking-[0.2em]">Müşteri Rehberi</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Hizmet alan müşterilerinizin geçmişi ve iletişim verileri</p>
                                        </div>
                                        <div className="relative group min-w-[300px]">
                                            <input
                                                type="text"
                                                placeholder="İsim veya telefon ile ara..."
                                                value={customerSearch}
                                                onChange={(e) => {
                                                    setCustomerSearch(e.target.value);
                                                    if (e.target.value.length === 0 || e.target.value.length > 2) fetchCustomersData(company.id);
                                                }}
                                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-12 py-4 text-sm font-bold focus:bg-white focus:border-indigo-100 outline-none transition-all placeholder:text-slate-300"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl opacity-30 group-focus-within:opacity-100 transition-opacity">🔍</span>
                                        </div>
                                    </div>

                                    {loadingCustomers ? (
                                        <div className="text-center py-20">
                                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Müşteriler Getiriliyor...</p>
                                        </div>
                                    ) : customers.length === 0 ? (
                                        <div className="bg-white rounded-3xl p-20 text-center shadow-lg border border-slate-50">
                                            <span className="text-5xl block mb-4">👥</span>
                                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Müşteri bulunamadı</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-4">
                                            {customers.map(cust => (
                                                <div 
                                                    key={cust.phone} 
                                                    className="bg-white rounded-[2rem] p-6 lg:p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-200 transition-all group cursor-pointer"
                                                    onClick={() => setSelectedCustomer(cust)}
                                                >
                                                    <div className="flex flex-col lg:flex-row gap-6 items-center">
                                                        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-indigo-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner flex-shrink-0 group-hover:from-indigo-500 group-hover:to-purple-600 group-hover:text-white transition-all duration-500">
                                                            {cust.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h4 className="font-black text-slate-900 text-xl leading-tight truncate">{cust.name}</h4>
                                                                {cust.is_iys_approved && (
                                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest">İYS ONAYLI</span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-bold text-slate-400 font-mono tracking-wider">{cust.phone}</p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-3 lg:gap-8 w-full lg:w-auto">
                                                            <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 text-center min-w-[120px]">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">SON GELİŞ</p>
                                                                <p className="text-xs font-black text-slate-900">{cust.last_visit ? new Date(cust.last_visit).toLocaleDateString('tr-TR') : '---'}</p>
                                                            </div>
                                                            <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 text-center min-w-[100px]">
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">RANDEVU</p>
                                                                <p className="text-xs font-black text-slate-900">{cust.appointment_count} Adet</p>
                                                            </div>
                                                            <div className="bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100 text-center min-w-[120px]">
                                                                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">TOPLAM CİRO</p>
                                                                <p className="text-xs font-black text-indigo-600">{(cust.total_spent || 0).toLocaleString('tr-TR')} ₺</p>
                                                            </div>
                                                        </div>
                                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'customers-marketing' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/20 border border-slate-100 text-center">
                                        <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">📱</div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase italic">Pazarlama & SMS Paneli</h3>
                                        <p className="text-slate-400 mt-2 max-w-lg mx-auto font-medium">Müşterilerinize toplu kampanya mesajları, bayram tebrikleri veya özel indirim kodları gönderin.</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all group">
                                                <span className="text-3xl mb-4 block group-hover:scale-125 transition-transform">📊</span>
                                                <h4 className="font-black text-slate-900 text-sm uppercase mb-2">Hedef Kitle Seçimi</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">Son 3 ay gelmeyenlere veya belirli tutar üzeri harcama yapanlara odaklanın.</p>
                                            </div>
                                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all group">
                                                <span className="text-3xl mb-4 block group-hover:scale-125 transition-transform">📝</span>
                                                <h4 className="font-black text-slate-900 text-sm uppercase mb-2">İYS Kontrolü</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">Mesajlarınız sadece ticari ileti izni olan (İYS onaylı) kişilere ulaşır.</p>
                                            </div>
                                            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all group">
                                                <span className="text-3xl mb-4 block group-hover:scale-125 transition-transform">🚀</span>
                                                <h4 className="font-black text-slate-900 text-sm uppercase mb-2">Hızlı Gönderim</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">Onayladığınız mesajlar operatör üzerinden anında kuyruğa alınır.</p>
                                            </div>
                                        </div>

                                        <button className="mt-12 px-12 py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                                            Yeni Kampanya Oluştur
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'customers-automations' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/20 border border-slate-100">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center text-3xl shadow-lg shadow-amber-200">🤖</div>
                                                <div>
                                                    <h3 className="text-2xl font-black text-slate-900 uppercase">Akıllı Otomasyonlar</h3>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Siz uyurken çalışan sadakat sisteminiz</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => { setEditingRule({ name: '', schedule_type: 'daily', action_type: 'sms', sql_script: '', message_template: '', is_active: true }); setShowAutomationModal(true); }}
                                                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                                            >
                                                <span>➕</span> Yeni Kural Oluştur
                                            </button>
                                        </div>

                                        {loadingRules ? (
                                            <div className="text-center py-20">
                                                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Kurallar Yükleniyor...</p>
                                            </div>
                                        ) : automationRules.length === 0 ? (
                                            <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed">
                                                <span className="text-5xl block mb-4">⚙️</span>
                                                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Henüz bir kural tanımlanmamış</p>
                                                <button 
                                                    onClick={() => { setEditingRule({ name: '', schedule_type: 'daily', action_type: 'sms', sql_script: '', message_template: '', is_active: true }); setShowAutomationModal(true); }}
                                                    className="mt-6 text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline"
                                                >
                                                    İlk Kuralınızı Şimdi Oluşturun
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {automationRules.map(rule => (
                                                    <div 
                                                        key={rule.id} 
                                                        className={`p-8 rounded-[2.5rem] border flex flex-col justify-between group hover:shadow-xl transition-all ${rule.is_active ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                                                    >
                                                        <div className="flex items-start justify-between mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-3xl">{rule.action_type === 'sms' ? '📱' : rule.action_type === 'push' ? '🔔' : '📧'}</span>
                                                                <div>
                                                                    <h4 className="font-black text-slate-900 uppercase text-sm">{rule.name}</h4>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                                        {rule.schedule_type === 'daily' ? 'Her Gün' : 'Haftalık Kontrol'} • {rule.action_type.toUpperCase()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-3 h-3 rounded-full ${rule.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => { setEditingRule(rule); setShowAutomationModal(true); }}
                                                                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
                                                            >
                                                                Düzenle
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    api.patch(`/appointments/automation-rules/${rule.id}`, { is_active: !rule.is_active })
                                                                       .then(() => fetchAutomationRules(company.id));
                                                                }}
                                                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${rule.is_active ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}
                                                            >
                                                                {rule.is_active ? 'Durdur' : 'Başlat'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
    );
}

export function CustomerDetailModal({ ctx }: { ctx: Ctx }) {
    const { selectedCustomer, setSelectedCustomer } = ctx;
    return (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 lg:p-10 animate-fade-in" onClick={() => setSelectedCustomer(null)}>
                            <div className="bg-white w-full max-w-5xl h-full lg:h-auto lg:max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
                                {/* Modal Header */}
                                <div className="p-8 bg-gradient-to-r from-slate-900 to-indigo-950 text-white relative flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-5xl flex-shrink-0 animate-bounce-subtle">
                                        {selectedCustomer.name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-2">
                                            <h2 className="text-4xl font-black italic">{selectedCustomer.name}</h2>
                                            <span className="px-3 py-1 bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest">{selectedCustomer.phone}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-6 text-white/50 text-[11px] font-black uppercase tracking-[0.2em]">
                                            <span className="flex items-center gap-2 text-indigo-300">📅 SON GELİŞ: {selectedCustomer.last_visit ? new Date(selectedCustomer.last_visit).toLocaleDateString('tr-TR') : 'YOK'}</span>
                                            <span className="flex items-center gap-2 text-indigo-300">📧 EMAIL: {selectedCustomer.email || 'BELİRTİLMEMİŞ'}</span>
                                            <span className="flex items-center gap-2 text-indigo-300">📊 RANDEVU: {selectedCustomer.appointment_count}</span>
                                            <span className="flex items-center gap-2 text-indigo-300">💰 HARCAMA: {(selectedCustomer.total_spent || 0).toLocaleString('tr-TR')} ₺</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                const msg = prompt('Müşteriye gönderilecek push bildirimi:', `Merhaba ${selectedCustomer.name}, müsaitseniz sizi bekleriz!`);
                                                if (msg) {
                                                    api.post(`/appointments/company/${company.id}/send-customer-message`, {
                                                        phone: selectedCustomer.phone,
                                                        message: msg,
                                                        type: 'push'
                                                    }).then(() => alert('🚀 Bildirim Gönderildi!\nMesaj müşterinizin telefon ekranına düştü.'))
                                                      .catch(e => {
                                                          const err = e.response?.data?.error || e.message;
                                                          if (err.includes('token')) {
                                                              alert('⚠️ Uygulama Bulunamadı\n\nBu müşteriniz henüz "Salon Cebinde" mobil uygulamasını indirip giriş yapmamış (veya bildirimlere izin vermemiş).\n\nPush Bildirimleri tamamen ücretsizdir ancak sadece uygulaması olan müşterilere ulaşır. Bu müşteriye isterseniz SMS atabilirsiniz!');
                                                          } else {
                                                              alert('Hata: ' + err);
                                                          }
                                                      });
                                                }
                                            }}
                                            className="h-12 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                                            title="Push Gönder"
                                        >
                                            <span>📱</span> Push Gönder
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const email = prompt('Müşteri E-posta Adresi:', selectedCustomer.email || '');
                                                if (email !== null) {
                                                    api.post(`/appointments/company/${company.id}/customers-sync`, {
                                                        phone: selectedCustomer.phone,
                                                        email: email
                                                    }).then(() => fetchCustomersData(company.id));
                                                }
                                            }}
                                            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all"
                                            title="E-posta Düzenle"
                                        >
                                            <span>📧</span>
                                        </button>
                                        <button onClick={() => setSelectedCustomer(null)} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all">
                                            <span className="text-2xl">✕</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Modal Body (History Table) */}
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> Randevu ve İşlem Geçmişi
                                    </h3>

                                    {!selectedCustomer.appointments || selectedCustomer.appointments.length === 0 ? (
                                        <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed">
                                            <span className="text-4xl mb-4 block">📜</span>
                                            <p className="text-slate-400 font-bold uppercase text-[10px]">İşlem geçmişi bulunamadı</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-slate-100">
                                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hizmet / İşlem</th>
                                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Personel</th>
                                                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ücret</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedCustomer.appointments.map((apt: any) => (
                                                        <tr key={apt.id} className="group hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-4 py-6">
                                                                <p className="text-sm font-black text-slate-900">{new Date(apt.date).toLocaleDateString('tr-TR')}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{apt.time}</p>
                                                            </td>
                                                            <td className="px-4 py-6">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {apt.services?.map((s: any, idx: number) => (
                                                                        <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[9px] font-black uppercase">{s.name}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-6">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                                                        {apt.staff_name?.charAt(0)}
                                                                    </div>
                                                                    <p className="text-xs font-bold text-slate-600">{apt.staff_name}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-6 text-right">
                                                                <p className="text-sm font-black text-slate-900">{(apt.total_price || 0).toLocaleString('tr-TR')} ₺</p>
                                                                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 uppercase tracking-widest">ÖDENDİ</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                    <button onClick={() => setSelectedCustomer(null)} className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">PENCEREYİ KAPAT</button>
                                </div>
                            </div>
                        </div>
    );
}

export function ReportsTab({ ctx }: { ctx: Ctx }) {
    const { reportData, reportPeriod, setReportPeriod, loadingReport, reportError, fetchReports } = ctx;
    return (
                        <div className="space-y-6">
                            {/* Period Selector */}
                            <div className="bg-white p-2 rounded-2xl shadow-sm inline-flex gap-1 border border-slate-100">
                                {(['today', 'week', 'month', 'year'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setReportPeriod(p)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportPeriod === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        {p === 'today' ? 'Bugün' : p === 'week' ? 'Bu Hafta' : p === 'month' ? 'Bu Ay' : 'Bu Yıl'}
                                    </button>
                                ))}
                            </div>

                            {loadingReport ? (
                                <div className="text-center py-20">
                                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Veriler Analiz Ediliyor...</p>
                                </div>
                            ) : reportError ? (
                                <div className="text-center py-10 bg-red-50 rounded-3xl border border-red-100 p-6">
                                    <p className="text-red-600 font-black text-sm mb-2">Rapor Hatası</p>
                                    <p className="text-red-400 text-xs mb-4">{reportError}</p>
                                    <button onClick={() => fetchReports(reportPeriod)} className="px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase">Tekrar Dene</button>
                                </div>
                            ) : reportData ? (
                                <>
                                    {/* Stats Cards - Stacked vertically for consistency */}
                                    <div className="space-y-4">
                                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Toplam Randevu</p>
                                            <p className="text-3xl font-black text-slate-900">{reportData.staffStats.reduce((sum: number, s: any) => sum + s.count, 0)}</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Potansiyel Kazanç</p>
                                            <p className="text-3xl font-black text-slate-900">{reportData.staffStats.reduce((sum: number, s: any) => sum + s.total_booked_value, 0).toLocaleString('tr-TR')} ₺</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Tahsil Edilen (Ciro)</p>
                                            <p className="text-3xl font-black text-slate-900">{reportData.staffStats.reduce((sum: number, s: any) => sum + s.actual_collected, 0).toLocaleString('tr-TR')} ₺</p>
                                        </div>
                                    </div>

                                    {/* Report Stack - All cards vertical for better readability */}
                                    <div className="space-y-6">
                                        {/* Staff Performance */}
                                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                                <span>👤</span> Personel Performansı
                                            </h3>
                                            <div className="space-y-4">
                                                {reportData.staffStats.map((s: any, i: number) => (
                                                    <div key={s.staff_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-indigo-50 transition-all">
                                                        <div className="flex items-center gap-4">
                                                            <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100 group-hover:border-indigo-200 group-hover:text-indigo-600">
                                                                #{i + 1}
                                                            </span>
                                                            <div>
                                                                <p className="font-black text-slate-900">{s.staff_name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.count} Randevu</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-slate-900">{s.actual_collected.toLocaleString('tr-TR')} ₺</p>
                                                            <p className="text-[10px] font-black text-emerald-600">Hak Ediş: {s.actual_commission.toLocaleString('tr-TR')} ₺</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pot: {s.total_booked_value.toLocaleString('tr-TR')} ₺</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Department Performance */}
                                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-indigo-50">
                                            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                                                <span>🏢</span> Departman Performansı
                                            </h3>
                                            <div className="space-y-4">
                                                {reportData.departmentStats?.length > 0 ? reportData.departmentStats.map((d: any, i: number) => (
                                                    <div key={d.department_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm">
                                                                {i + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900">{d.department_name}</p>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.count} Randevu</span>
                                                                    <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                                    <span className="text-[10px] font-black text-emerald-500">{((d.actual_collected / (reportData.staffStats.reduce((sum: number, s: any) => sum + s.actual_collected, 0) || 1)) * 100).toFixed(0)}% Pay</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-black text-slate-900">{d.actual_collected.toLocaleString('tr-TR')} ₺</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pot: {d.total_booked_value.toLocaleString('tr-TR')} ₺</p>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="text-center py-10">
                                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Henüz departman verisi yok</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Weekly Performance */}
                                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                                <span>📅</span> Haftanın Günleri (Ciro)
                                            </h3>
                                            <div className="space-y-4">
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                                    const dayNames: any = { 'Monday': 'Pazartesi', 'Tuesday': 'Salı', 'Wednesday': 'Çarşamba', 'Thursday': 'Perşembe', 'Friday': 'Cuma', 'Saturday': 'Cumartesi', 'Sunday': 'Pazar' };
                                                    const stat = reportData.weeklyStats.find((s: any) => s.day === day);
                                                    const maxRevenue = Math.max(...reportData.weeklyStats.map((s: any) => s.actual_collected || 0), 1);
                                                    const widthScale = stat ? (stat.actual_collected / maxRevenue) * 100 : 2;
                                                    return (
                                                        <div key={day} className="space-y-1.5">
                                                            <div className="flex justify-between items-center px-1">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase">{dayNames[day]}</span>
                                                                <span className="text-[10px] font-black text-slate-900">
                                                                    {stat ? stat.actual_collected.toLocaleString('tr-TR') : 0} ₺
                                                                </span>
                                                            </div>
                                                            <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${widthScale}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        {/* Hourly Chart - Redesigned for Mobile (Vertical List) */}
                                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 border border-slate-50">
                                            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span>⏰</span> Yoğun Saatler
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Randevu Sayısı</span>
                                            </h3>
                                            <div className="space-y-3">
                                                {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(h => {
                                                    const stat = reportData.hourlyStats.find((s: any) => s.hour === h);
                                                    const maxCount = Math.max(...reportData.hourlyStats.map((s: any) => s.count), 1);
                                                    const percentage = stat ? (stat.count / maxCount) * 100 : 0;

                                                    // Only show hours that have at least one appointment for a cleaner look
                                                    if (!stat || stat.count === 0) return null;

                                                    return (
                                                        <div key={h} className="group transition-all">
                                                            <div className="flex items-center justify-between mb-1.5 px-1">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase">{h}:00</span>
                                                                <span className="text-[10px] font-black text-indigo-600">{stat.count} Randevu</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700 ease-out"
                                                                    style={{ width: `${percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {/* Fallback if no hourly data */}
                                                {!reportData.hourlyStats.some((s: any) => s.count > 0) && (
                                                    <div className="text-center py-4">
                                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Henüz saatlik veri yok</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>


                                        {/* Monthly Distribution - Vertical for Mobile */}
                                        {reportPeriod === 'year' && (
                                            <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200">
                                                <h3 className="text-lg font-black mb-6">🗓️ Ay Bazında Ciro Dağılımı</h3>
                                                <div className="space-y-4">
                                                    {reportData.monthlyStats.map((m: any) => {
                                                        const maxMonthlyRevenue = Math.max(...reportData.monthlyStats.map((ms: any) => ms.actual_collected || 0), 1);
                                                        const monthWidth = (m.actual_collected / maxMonthlyRevenue) * 100;
                                                        return (
                                                            <div key={m.month} className="bg-white/10 p-5 rounded-[2rem] backdrop-blur-sm border border-white/10">
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{m.month}</p>
                                                                    <p className="text-lg font-black">{m.actual_collected.toLocaleString('tr-TR')} ₺</p>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${monthWidth}%` }}></div>
                                                                </div>
                                                                <p className="text-[9px] font-bold text-white/40 mt-1.5 uppercase tracking-widest">{m.count} Randevu</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center py-4">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Raporlar her gece 23:00'da e-posta adresinize gönderilir.</p>
                                    </div>
                                </>
                            ) : null}
                        </div>
    );
}

export function AutomationModal({ ctx }: { ctx: Ctx }) {
    const { showAutomationModal, setShowAutomationModal, editingRule, setEditingRule, api, company, fetchAutomationRules } = ctx;
    return (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowAutomationModal(false)}>
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase">Kural Paneli</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Otomatik kampanya ve hatırlatma kurallarınızı yönetin</p>
                            </div>
                            <button onClick={() => setShowAutomationModal(false)} className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all font-black">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Kural Adı (Örn: Boya Tazeleme)</label>
                                <input 
                                    type="text" 
                                    value={editingRule.name} 
                                    onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold shadow-inner focus:ring-2 focus:ring-amber-400 transition-all"
                                    placeholder="Kural başlığı giriniz..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Kontrol Periyodu</label>
                                    <select 
                                        value={editingRule.schedule_type} 
                                        onChange={e => setEditingRule({ ...editingRule, schedule_type: e.target.value })}
                                        className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold shadow-inner"
                                    >
                                        <option value="daily">Her Gün (Otomatik)</option>
                                        <option value="weekly">Haftalık</option>
                                        <option value="cron">Özel (Cron)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Aksiyon Türü</label>
                                    <select 
                                        value={editingRule.action_type} 
                                        onChange={e => setEditingRule({ ...editingRule, action_type: e.target.value })}
                                        className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold shadow-inner"
                                    >
                                        <option value="sms">📱 SMS Gönder</option>
                                        <option value="push">🔔 Bildirim Gönder</option>
                                        <option value="email">📧 E-Posta Gönder</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3 ml-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">SQL Filtre Sorgusu (Müşteri Bazlı)</label>
                                    <button 
                                        className="text-[9px] font-black text-indigo-500 uppercase hover:underline"
                                        onClick={() => {
                                            const example = `SELECT phone, name FROM customers \nWHERE company_id = $\{company_id\} \nAND last_visit < NOW() - INTERVAL '45 days'`;
                                            setEditingRule({ ...editingRule, sql_script: example });
                                        }}
                                    >Örnek Yükle</button>
                                </div>
                                <textarea 
                                    value={editingRule.sql_script} 
                                    onChange={e => setEditingRule({ ...editingRule, sql_script: e.target.value })}
                                    className="w-full p-6 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl h-48 shadow-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="SELECT phone FROM customers WHERE ..."
                                />
                                <p className="text-[9px] text-slate-400 mt-2 font-medium px-2 italic">Not: Sorgu 'phone' ve 'name' kolonlarını döndürmelidir.</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Mesaj Taslağı</label>
                                <textarea 
                                    value={editingRule.message_template} 
                                    onChange={e => setEditingRule({ ...editingRule, message_template: e.target.value })}
                                    className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold shadow-inner h-24 focus:ring-2 focus:ring-amber-400 transition-all"
                                    placeholder="Örn: Merhaba {name}, sizi özledik! Size özel %20 indirim..."
                                />
                                <p className="text-[9px] text-slate-400 mt-2 font-medium px-2 italic">Not: {`{name}`} değişkenini kullanabilirsiniz.</p>
                            </div>

                            <button 
                                onClick={() => {
                                    if (!editingRule.name || !editingRule.sql_script) return alert('Lütfen tüm alanları doldurun');
                                    const method = editingRule.id ? 'patch' : 'post';
                                    const url = editingRule.id ? `/appointments/automation-rules/${editingRule.id}` : `/appointments/company/${company?.id}/automation-rules`;
                                    
                                    api[method](url, editingRule).then(() => {
                                        fetchAutomationRules(company?.id);
                                        setShowAutomationModal(false);
                                    });
                                }}
                                className="w-full py-6 bg-slate-950 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-200 mt-4 active:scale-95 transition-all"
                            >
                                {editingRule.id ? 'Kuralı Güncelle' : 'Otomasyonu Başlat'}
                            </button>
                        </div>
                    </div>
                </div>
    );
}
