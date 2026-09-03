/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import type { Ctx } from './index';

export function FinanceTab({ ctx }: { ctx: Ctx }) {
    const { activeTab, financeDateRange, setFinanceDateRange, financeSearch, setFinanceSearch, completedAppointments, loadingFinance, invoices, cashTransactions, openingBalance, purchaseInvoices, currentAccounts, contactsBalance, selectedAppointment, setSelectedAppointment, setInvoiceForm, setShowInvoiceModal, salesSubTab, setSalesSubTab, setShowPurchaseModal, setShowCurrentAccountModal, setShowCashModal, setSelectedPurchaseInvoice, setShowPurchaseDetailModal, openCurrentAccountModal, handleDeleteInvoice, handleDeletePurchaseInvoice, handleDeleteCashTransaction, handleViewPurchaseDetail, switchTab, handleDeleteCurrentAccount, purchaseSearch, setPurchaseSearch, inventoryProducts } = ctx;
    return (
                        <div className="space-y-6">
                            {/* Finance Header - Breadcrumb-like */}
                            <div className="flex items-center gap-3 mb-2 px-1">
                                <span className="text-2xl">💰</span>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 leading-none">Finans Yönetimi</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        {activeTab.includes('sales') ? 'Satış Faturaları' : 
                                         activeTab.includes('purchases') ? 'Alış Faturaları' : 
                                         activeTab.includes('cash') ? 'Kasa İşlemleri' : 'Cari Kartlar'} 
                                        {activeTab.endsWith('dashboard') ? ' • Dashboard' : 
                                         activeTab.endsWith('reports') ? ' • Raporlar' : 
                                         activeTab.endsWith('list') ? ' • Liste' : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Shared Finance Filters */}
                            {activeTab !== 'finance-contacts' && (
                                <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl shadow-slate-200/20 border border-slate-100">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                        {/* Left: Date Selection (Stacked) */}
                                        <div className="lg:col-span-4 space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xl">📅</span>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tarih Aralığı</label>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={financeDateRange.start}
                                                        onChange={e => setFinanceDateRange(p => ({ ...p, start: e.target.value }))}
                                                        className="w-full p-4 px-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold text-sm focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm text-slate-700"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        value={financeDateRange.end}
                                                        onChange={e => setFinanceDateRange(p => ({ ...p, end: e.target.value }))}
                                                        className="w-full p-4 px-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold text-sm focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm text-slate-700"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Search */}
                                        <div className="lg:col-span-8 space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xl">🔍</span>
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">İşlem / Cari / Fatura Ara</label>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="relative flex-1 group">
                                                    <input
                                                        type="text"
                                                        placeholder="Müşteri adı, fatura no veya açıklama yazın..."
                                                        value={financeSearch}
                                                        onChange={e => setFinanceSearch(e.target.value)}
                                                        className="w-full p-4 px-6 bg-slate-50 rounded-2xl border-2 border-slate-100 font-bold text-sm focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-sm text-slate-700"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {['Bugün', 'Bu Hafta', 'Bu Ay', 'Bu Yıl'].map(preset => (
                                                    <button
                                                        key={preset}
                                                        onClick={() => {
                                                            const d = new Date();
                                                            const end = d.toISOString().split('T')[0];
                                                            let start = end;
                                                            if (preset === 'Bu Hafta') { d.setDate(d.getDate() - 7); start = d.toISOString().split('T')[0]; }
                                                            else if (preset === 'Bu Ay') { d.setMonth(d.getMonth() - 1); start = d.toISOString().split('T')[0]; }
                                                            else if (preset === 'Bu Yıl') { d.setFullYear(d.getFullYear() - 1); start = d.toISOString().split('T')[0]; }
                                                            setFinanceDateRange({ start, end });
                                                        }}
                                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sub Sections Content */}

                            {/* SALES DASHBOARD */}
                            {activeTab === 'finance-sales-dashboard' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-[2rem] text-white shadow-xl">
                                            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">TOPLAM SATIŞ (CIRO)</p>
                                            <h2 className="text-3xl font-black italic mt-2">
                                                {(invoices.reduce((sum, inv) => sum + Number(inv.grand_total || inv.amount || 0), 0) + 
                                                  completedAppointments.reduce((sum, apt) => sum + Number(apt.price || 0), 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </h2>
                                            <p className="text-[8px] mt-2 font-black uppercase opacity-40">Seçili Tarih Aralığı</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/20 border border-slate-50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Faturalandırılan</p>
                                            <p className="text-3xl font-black text-emerald-600">
                                                {invoices.reduce((sum, inv) => sum + Number(inv.grand_total || inv.amount || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </p>
                                            <p className="text-[8px] mt-2 font-black text-slate-300 uppercase">{invoices.length} Fatura</p>
                                        </div>
                                        <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/20 border border-slate-50">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bekleyen (Faturasız)</p>
                                            <p className="text-3xl font-black text-amber-500">
                                                {completedAppointments.reduce((sum, apt) => sum + Number(apt.price || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </p>
                                            <p className="text-[8px] mt-2 font-black text-slate-300 uppercase">{completedAppointments.length} Randevu</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/20 border border-slate-100 flex items-center justify-between">
                                        <div>
                                            <h4 className="font-black text-slate-900 text-lg">Hızlı Rapor</h4>
                                            <p className="text-sm text-slate-400">Bu dönemde ortalama sepet tutarınız: <b>
                                                {((invoices.reduce((sum, inv) => sum + Number(inv.grand_total || inv.amount || 0), 0) + 
                                                  completedAppointments.reduce((sum, apt) => sum + Number(apt.price || 0), 0)) / 
                                                  Math.max(1, invoices.length + completedAppointments.length)).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                                            </b></p>
                                        </div>
                                        <button onClick={() => switchTab('finance-sales-reports')} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Detaylı Rapor Gör</button>
                                    </div>
                                </div>
                            )}

                            {/* SALES REPORTS */}
                            {activeTab === 'finance-sales-reports' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/20 border border-slate-100 min-h-[400px] flex items-center justify-center flex-col text-center">
                                        <div className="text-5xl mb-4">📊</div>
                                        <h3 className="text-xl font-black text-slate-900">Satış Analizi</h3>
                                        <p className="text-slate-400 mt-2 max-w-sm">Dönemsel satış grafikleri ve personel bazlı performans raporları burada hazırlanıyor.</p>
                                        <div className="mt-8 flex gap-3">
                                            <div className="px-6 py-4 bg-slate-50 rounded-2xl text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">En Çok Satan</p>
                                                <p className="font-bold text-slate-900">---</p>
                                            </div>
                                            <div className="px-6 py-4 bg-slate-50 rounded-2xl text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">En Yoğun Gün</p>
                                                <p className="font-bold text-slate-900">Cumartesi</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sales Content (LIST) */}
                            {(activeTab === 'finance-sales-list' || activeTab === 'finance') && (
                                <div className="space-y-6">
                                    {/* Sub Tabs: Bekleyen / Faturalar */}
                                    <div className="flex bg-slate-100/80 p-1.5 rounded-2xl gap-1.5 self-start shadow-inner">
                                        <button
                                            onClick={() => setSalesSubTab('pending')}
                                            className={`flex-1 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${salesSubTab === 'pending' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                                        >
                                            <span>⏳</span> Bekleyen ({completedAppointments.length})
                                        </button>
                                        <button
                                            onClick={() => setSalesSubTab('invoiced')}
                                            className={`flex-1 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${salesSubTab === 'invoiced' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:bg-white/50'}`}
                                        >
                                            <span>✅</span> Faturalar ({invoices.length})
                                        </button>
                                    </div>

                                    {/* Pending Appointments */}
                                    {salesSubTab === 'pending' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {loadingFinance ? (
                                                <div className="col-span-full py-20 text-center animate-pulse text-slate-400 font-black">Yükleniyor...</div>
                                            ) : completedAppointments.length === 0 ? (
                                                <div className="col-span-full bg-white rounded-3xl p-16 text-center shadow-lg border border-slate-50">
                                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🎉</div>
                                                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Tüm randevular faturalandırıldı!</p>
                                                </div>
                                            ) : (
                                                completedAppointments.map(apt => (
                                                    <div key={apt.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between gap-4 hover:shadow-xl hover:border-indigo-100 transition-all relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 transition-all group-hover:bg-indigo-50/50"></div>
                                                        <div className="relative z-10">
                                                            <div className="flex items-center gap-4 mb-4">
                                                                <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-600 rounded-2xl flex items-center justify-center font-black shadow-sm text-xl">
                                                                    {apt.customer_name?.charAt(0)?.toUpperCase() || 'M'}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-black text-slate-900 text-lg leading-tight">{apt.customer_name || 'Müşteri'}</h4>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                        📅 {new Date(apt.date).toLocaleDateString('tr-TR')} • 🕒 {apt.time}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 mb-4">
                                                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100/50">{apt.service_name}</span>
                                                                {apt.staff_name && <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100/50">👤 {apt.staff_name}</span>}
                                                            </div>

                                                            <div className="pt-6 border-t border-slate-50 flex flex-col items-center">
                                                                <p className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em] mb-1">ÖDEME BEKLİYOR</p>
                                                                <p className="text-xl font-black text-slate-900 mb-4">{apt.price} ₺</p>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedAppointment(apt);
                                                                        setInvoiceForm(prev => ({
                                                                            ...prev,
                                                                            customer_name: apt.customer_name || '',
                                                                            customer_phone: apt.customer_phone || '',
                                                                            customer_id: apt.customer_id || null,
                                                                            price: apt.price || 0
                                                                        }));
                                                                        setShowInvoiceModal(true);
                                                                    }}
                                                                    className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-900 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                                                        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z" />
                                                                        <path d="M16 8h-4M16 12h-4M8 12h.01M8 8h.01" />
                                                                    </svg>
                                                                    Faturaya Dönüştür
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Issued Invoices - CARD VIEW */}
                                    {salesSubTab === 'invoiced' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {loadingFinance ? (
                                                <div className="col-span-full py-20 text-center animate-pulse text-slate-400 font-black">Yükleniyor...</div>
                                            ) : invoices.length === 0 ? (
                                                <div className="col-span-full bg-white rounded-3xl p-16 text-center shadow-lg border border-slate-50">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">📄</div>
                                                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Henüz fatura bulunmuyor</p>
                                                </div>
                                            ) : (
                                                invoices.map(inv => {
                                                    const total = Number(inv.grand_total || inv.amount || 0);
                                                    const vat = Number(inv.vat_amount || 0);
                                                    const base = total - vat;

                                                    return (
                                                        <div key={inv.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between gap-4 hover:shadow-xl transition-all relative group overflow-hidden">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-14 h-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center font-black shadow-sm text-xl border border-slate-100">
                                                                        {inv.customer_name?.charAt(0).toUpperCase() || 'F'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h4 className="font-black text-slate-900 text-lg leading-tight truncate max-w-[150px]">{inv.customer_name}</h4>
                                                                            {inv.customer_id && (
                                                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded" title="Sistem Kayıtlı Müşteri">💎 SADAKAT</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                            📄 {inv.invoice_no || 'TASLAK'} • 📅 {new Date(inv.created_at).toLocaleDateString('tr-TR')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    {inv.gib_status === 'success' ? (
                                                                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest items-center gap-1">
                                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                                            Gönderildi
                                                                        </span>
                                                                    ) : inv.gib_status === 'pending' ? (
                                                                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-widest animate-pulse">İşleniyor</span>
                                                                    ) : inv.gib_status === 'failed' ? (
                                                                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[8px] font-black uppercase tracking-widest">Hata</span>
                                                                    ) : (
                                                                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest">Taslak</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50 my-2">
                                                                <div>
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Matrah</p>
                                                                    <p className="text-xs font-bold text-slate-700">{base.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">KDV (%{inv.vat_rate})</p>
                                                                    <p className="text-xs font-bold text-indigo-500">+{vat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-end justify-between">
                                                                <div>
                                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Genel Toplam</p>
                                                                    <p className="text-2xl font-black text-slate-900">{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                                                </div>
                                                                <div className="flex gap-1.5">
                                                                    {(!inv.gib_status || inv.gib_status === 'not_sent') && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    setLoading(true);
                                                                                    const res = await api.post(`/finance/invoices/${inv.id}/prepare`);
                                                                                    if (res.data.success) { fetchFinanceData(); }
                                                                                } catch (err: any) { alert(err.response?.data?.error || 'Hazırlama hatası'); }
                                                                                finally { setLoading(false); }
                                                                            }}
                                                                            className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all shadow-lg shadow-slate-100"
                                                                            title="Hazırla"
                                                                        >
                                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                                        </button>
                                                                    )}
                                                                    {(inv.gib_status === 'ready' || inv.gib_status === 'success' || inv.gib_status === 'failed') && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    setLoading(true);
                                                                                    const res = await api.get(`/finance/invoices/${inv.id}/preview`);
                                                                                    const popup = window.open('', '_blank');
                                                                                    if (popup) { popup.document.write(res.data); popup.document.close(); }
                                                                                } catch (err) { alert('Önizleme yüklenemedi'); }
                                                                                finally { setLoading(false); }
                                                                            }}
                                                                            className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all border border-slate-200"
                                                                            title="Görüntüle"
                                                                        >
                                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                        </button>
                                                                    )}
                                                                    {(inv.gib_status === 'ready' || inv.gib_status === 'failed') && (
                                                                        <button
                                                                            onClick={async () => {
                                                                                try {
                                                                                    setLoading(true);
                                                                                    const res = await api.post(`/finance/invoices/${inv.id}/gib-send`);
                                                                                    if (res.data.success) { alert('Entegratöre gönderildi!'); fetchFinanceData(); }
                                                                                } catch (err: any) { alert(err.response?.data?.error || 'Gönderim hatası'); }
                                                                                finally { setLoading(false); }
                                                                            }}
                                                                            className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                                                                            title="Entegratöre Gönder"
                                                                        >
                                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                                        </button>
                                                                    )}
                                                                    {(!inv.gib_status || inv.gib_status === 'not_sent' || inv.gib_status === 'failed' || inv.gib_status === 'ready') && (
                                                                        <button
                                                                            onClick={() => handleDeleteInvoice(inv.id)}
                                                                            className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-200 transition-all border border-red-200"
                                                                            title="Faturayı Sil"
                                                                        >
                                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Purchases Content */}
                            {/* PURCHASES DASHBOARD */}
                            {activeTab === 'finance-purchases-dashboard' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl">
                                            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">TOPLAM ALIŞ</p>
                                            <h2 className="text-4xl font-black italic mt-2">
                                                {purchaseInvoices.reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </h2>
                                            <p className="text-[8px] mt-2 font-black uppercase opacity-40">Seçili Tarih Aralığı</p>
                                        </div>
                                        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/20 border border-slate-100 flex flex-col justify-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Girdi Sayısı</p>
                                            <p className="text-3xl font-black text-slate-900">{purchaseInvoices.length} Fatura / İşlem</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PURCHASES REPORTS */}
                            {activeTab === 'finance-purchases-reports' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/20 border border-slate-100 min-h-[400px] flex items-center justify-center flex-col text-center">
                                        <div className="text-5xl mb-4">📊</div>
                                        <h3 className="text-xl font-black text-slate-900">Alış ve Gider Raporları</h3>
                                        <p className="text-slate-400 mt-2 max-w-sm">Tedarikçi bazlı harcamalar ve kategori dağılımları burada analiz edilir.</p>
                                    </div>
                                </div>
                            )}

                            {/* Purchases Content (LIST) */}
                            {activeTab === 'finance-purchases-list' && (
                                <div className="space-y-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-50 shadow-sm">
                                        <div className="relative group flex-1">
                                            <input
                                                type="text"
                                                placeholder="Tedarikçi veya fatura no ile ara..."
                                                value={purchaseSearch}
                                                onChange={(e) => setPurchaseSearch(e.target.value)}
                                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-12 py-4 text-sm font-bold focus:bg-white focus:border-indigo-100 outline-none transition-all"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-xl">🔍</span>
                                        </div>
                                        <button
                                            onClick={() => setShowPurchaseModal(true)}
                                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                        >
                                            + Yeni Alış Girişi
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {purchaseInvoices.filter(p => 
                                            p.supplier_name?.toLowerCase().includes(purchaseSearch.toLowerCase()) || 
                                            p.invoice_no?.toLowerCase().includes(purchaseSearch.toLowerCase())
                                        ).length === 0 ? (
                                            <div className="bg-white rounded-3xl p-20 text-center shadow-lg border border-slate-50">
                                                <span className="text-4xl block mb-2">🛒</span>
                                                <p className="text-slate-300 font-bold uppercase text-[10px]">
                                                    {purchaseSearch ? 'Aradığınız kriterde fatura bulunamadı' : 'Henüz alış faturası bulunmuyor'}
                                                </p>
                                            </div>
                                        ) : (
                                            purchaseInvoices.filter(p => 
                                                p.supplier_name?.toLowerCase().includes(purchaseSearch.toLowerCase()) || 
                                                p.invoice_no?.toLowerCase().includes(purchaseSearch.toLowerCase())
                                            ).map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => handleViewPurchaseDetail(p.id)}
                                                    className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:border-indigo-400 cursor-pointer transition-all"
                                                >
                                                    <div>
                                                        <h4 className="font-black text-slate-900">{p.supplier_name || 'Tedarikçi'}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Fatura No: {p.invoice_no || '---'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-base font-black text-red-600">-{parseFloat(p.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(p.created_at).toLocaleDateString('tr-TR')}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Cash Content */}
                            {/* CASH DASHBOARD */}
                            {activeTab === 'finance-cash-dashboard' && (
                                <div className="space-y-6">
                                    {/* Devir Alanı */}
                                    <div className="bg-white/60 backdrop-blur-md p-5 rounded-3xl border border-white/50 flex items-center justify-between mb-2 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-sm">📊</div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Dönem Öncesinden Devir</p>
                                                <p className="text-[11px] font-bold text-slate-500 mt-1">{new Date(financeDateRange.start).toLocaleDateString('tr-TR')} öncesi bakiye</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-base font-black ${openingBalance >= 0 ? 'text-emerald-600' : 'text-red-400'}`}>
                                                {openingBalance >= 0 ? '+' : ''}{openingBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-xl">
                                            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">TOPLAM Tahsilat (BORÇ)</p>
                                            <h2 className="text-3xl font-black italic mt-2">
                                                {(cashTransactions.reduce((sum, t) => sum + (t.type === 'income' ? (Number(t.debit) || Number(t.amount)) : 0), 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </h2>
                                            <p className="text-[8px] mt-2 font-black uppercase opacity-40">Seçili Tarih Aralığı</p>
                                        </div>
                                        <div className="bg-red-600 p-6 rounded-[2rem] text-white shadow-xl">
                                            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">TOPLAM Ödeme (ALACAK)</p>
                                            <h2 className="text-3xl font-black italic mt-2">
                                                {(cashTransactions.reduce((sum, t) => sum + (t.type === 'expense' ? (Number(t.credit) || Number(t.amount)) : 0), 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </h2>
                                            <p className="text-[8px] mt-2 font-black uppercase opacity-40">Seçili Tarih Aralığı</p>
                                        </div>
                                        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200">
                                            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">GÜNCEL Bakiye</p>
                                            <h2 className="text-3xl font-black italic mt-2">
                                                {(openingBalance + cashTransactions.reduce((sum, t) =>
                                                    sum + (t.type === 'income' ? (Number(t.debit) || Number(t.amount)) : -(Number(t.credit) || Number(t.amount))),
                                                    0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                            </h2>
                                            <p className="text-[8px] mt-2 font-black uppercase tracking-widest text-indigo-400">Devir + Dönem İçi Net</p>
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/20 border border-slate-100 text-center">
                                         <p className="text-slate-400 text-sm">Finansal durumunuz seçili tarih aralığına göre <b>{openingBalance + cashTransactions.reduce((sum, t) => sum + (t.type === 'income' ? (Number(t.debit) || Number(t.amount)) : -(Number(t.credit) || Number(t.amount))), 0) >= 0 ? 'POZİTİF' : 'NEGATİF'}</b> seyrediyor.</p>
                                    </div>
                                </div>
                            )}

                            {/* CASH REPORTS */}
                            {activeTab === 'finance-cash-reports' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/20 border border-slate-100 min-h-[400px] flex items-center justify-center flex-col text-center">
                                        <div className="text-5xl mb-4">📊</div>
                                        <h3 className="text-xl font-black text-slate-900">Nakit Akış Raporu</h3>
                                        <p className="text-slate-400 mt-2 max-w-sm">Günlük, haftalık ve aylık nakit giriş-çıkış trendleri burada görselleştirilir.</p>
                                    </div>
                                </div>
                            )}

                            {/* Cash Content (LIST) */}
                            {activeTab === 'finance-cash-list' && (
                                <div className="space-y-6">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowCashModal(true)}
                                            className="w-full py-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-slate-800 flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                                        >
                                            <span className="text-xl">📊</span> Kasa İşlemi Oluştur
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {cashTransactions.length === 0 ? (
                                            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
                                                <p className="text-slate-400 font-bold uppercase text-[10px]">Henüz kasa hareketi yok</p>
                                            </div>
                                        ) : (
                                            cashTransactions.map(t => (
                                                <div key={t.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:border-indigo-100 transition-all group">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                            {t.category === 'devir' ? '🔄' : t.type === 'income' ? '📥' : '📤'}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-black text-slate-900 leading-tight">{t.description || (t.type === 'income' ? 'Gelir İşlemi' : 'Gider İşlemi')}</h4>
                                                                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-widest">{t.category}</span>
                                                            </div>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                                {new Date(t.transaction_date || t.created_at).toLocaleDateString('tr-TR')} • {t.payment_method}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex items-center gap-4">
                                                        {t.type === 'income' ? (
                                                            <div className="space-y-0.5">
                                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">BORÇ (TAHSİLAT)</p>
                                                                <p className="text-lg font-black text-emerald-600">+{Number(Number(t.debit) || Number(t.amount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">ALACAK (ÖDEME)</p>
                                                                <p className="text-lg font-black text-red-600">-{Number(Number(t.credit) || Number(t.amount)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={e => { e.stopPropagation(); handleDeleteCashTransaction(t.id); }}
                                                            className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Current Accounts Content */}
                            {/* CURRENT ACCOUNTS (CONTACTS) */}
                            {activeTab === 'finance-contacts' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-50 shadow-sm">
                                        <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Cari Kartlar (Müşteri/Tedarikçi)</h3>
                                        <button
                                            onClick={() => openCurrentAccountModal()}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100">+ Yeni Cari Kart</button>
                                    </div>

                                    <div className="space-y-4">
                                        {currentAccounts.length === 0 ? (
                                            <div className="bg-white rounded-3xl p-20 text-center shadow-lg border border-slate-50">
                                                <span className="text-4xl block mb-2">👥</span>
                                                <p className="text-slate-300 font-bold uppercase text-[10px]">Henüz cari kart tanımlanmadı</p>
                                            </div>
                                        ) : (
                                            currentAccounts.map(c => (
                                                <div key={c.id} className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-200 transition-all group relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-50/50 transition-all"></div>

                                                    <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                                                        {/* Avatar & Basic Info */}
                                                        <div className="flex items-center gap-6 min-w-[280px]">
                                                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl shadow-indigo-100 flex-shrink-0">
                                                                {c.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <h4 className="font-black text-slate-900 text-2xl leading-tight">{c.name}</h4>
                                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${c.type === 'SUPPLIER' ? 'bg-amber-100 text-amber-600' : c.type === 'CUSTOMER' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                                                        {c.type === 'SUPPLIER' ? 'Tedarikçi' : c.type === 'CUSTOMER' ? 'Müşteri' : 'Genel'}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] font-mono">{c.code}</p>
                                                            </div>
                                                        </div>

                                                        {/* Balance Section */}
                                                        <div className="bg-slate-50 px-8 py-4 rounded-3xl border border-slate-100 flex-shrink-0 min-w-[200px]">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">GÜNCEL BAKİYE</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className={`text-2xl font-black ${Number(c.balance || 0) > 0 ? 'text-emerald-600' : Number(c.balance || 0) < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                                    {Math.abs(Number(c.balance || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                                <span className="text-xs font-black text-slate-400">₺</span>
                                                            </div>
                                                            <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${Number(c.balance || 0) > 0 ? 'text-emerald-500' : Number(c.balance || 0) < 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                                                                {Number(c.balance || 0) > 0 ? 'Borçlu (Alacağımız)' : Number(c.balance || 0) < 0 ? 'Alacaklı (Borcumuz)' : 'Bakiye Yok'}
                                                            </p>
                                                        </div>

                                                        {/* Content Grid */}
                                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                                                            {/* Contact */}
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> İletişim Bilgileri
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {c.phone && <p className="text-sm font-bold text-slate-600 flex items-center gap-2"><span>📞</span> {c.phone}</p>}
                                                                    {c.email && <p className="text-sm font-bold text-slate-600 flex items-center gap-2 truncate" title={c.email}><span>✉️</span> {c.email}</p>}
                                                                </div>
                                                            </div>

                                                            {/* Tax & Business */}
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Vergi & Ticari
                                                                </p>
                                                                <div className="space-y-2">
                                                                    <p className="text-sm font-bold text-slate-600 flex items-center gap-2"><span>📄</span> {c.tax_number || 'Belirtilmedi'}</p>
                                                                    {c.tax_office && <p className="text-[11px] font-bold text-slate-400 ml-6 uppercase">{c.tax_office} V.D.</p>}
                                                                </div>
                                                            </div>

                                                            {/* Address */}
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Konum
                                                                </p>
                                                                <div className="space-y-1">
                                                                    <p className="text-sm font-bold text-slate-600 line-clamp-2 italic leading-tight">
                                                                        {c.address_line || 'Adres belirtilmedi'}
                                                                    </p>
                                                                    <p className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">
                                                                        {c.district ? `${c.district} / ` : ''}{c.city}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex lg:flex-col gap-3 w-full lg:w-32 border-t lg:border-t-0 lg:border-l border-slate-50 pt-6 lg:pt-0 lg:pl-8">
                                                            <button
                                                                onClick={() => openCurrentAccountModal(c)}
                                                                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-100"
                                                            >
                                                                <span>✏️</span> Düzenle
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCurrentAccount(c.id!)}
                                                                className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-100 transition-all group/del"
                                                            >
                                                                <svg className="w-5 h-5 group-hover/del:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* CURRENT ACCOUNTS BALANCE REPORT */}
                            {activeTab === 'finance-contacts-balance' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/20 border border-slate-100 overflow-hidden">
                                        <div className="flex justify-between items-center mb-10 pb-6 border-b border-indigo-50/50">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Toplu Cari Bakiye Raporu</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cari kartlarınızın borç, alacak ve güncel bakiye durumları</p>
                                            </div>
                                            <button 
                                                onClick={() => window.print()}
                                                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200"
                                            >
                                                🖨️ RAPORU YAZDIR
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50">
                                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest rounded-tl-3xl">Cari Kod</th>
                                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Ünvan / Tanım</th>
                                                        {financeDateRange.start && (
                                                            <th className="px-6 py-5 text-[11px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50/30">Devreden Bakiye</th>
                                                        )}
                                                        <th className="px-6 py-5 text-[11px] font-black text-emerald-600 uppercase tracking-widest">Borç (Hizmet/Satış)</th>
                                                        <th className="px-6 py-5 text-[11px] font-black text-red-600 uppercase tracking-widest">Alacak (Ödeme/Alış)</th>
                                                        <th className="px-6 py-5 text-[11px] font-black text-slate-900 uppercase tracking-widest rounded-tr-3xl text-right">Güncel Bakiye</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {(contactsBalance.length > 0 ? contactsBalance : currentAccounts).map(c => {
                                                        const carried = Number(c.carried_balance) || 0;
                                                        const debit = Number(c.period_debit) || (Number(c.balance) > 0 ? Number(c.balance) : 0);
                                                        const credit = Number(c.period_credit) || (Number(c.balance) < 0 ? Math.abs(Number(c.balance)) : 0);
                                                        const net = Number(c.balance) ?? (carried + debit - credit);

                                                        return (
                                                            <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                                                                <td className="px-6 py-5 text-xs font-bold text-slate-400 group-hover:text-slate-900 transition-colors font-mono">{c.code || `C-${c.id}`}</td>
                                                                <td className="px-6 py-5">
                                                                    <p className="text-sm font-black text-slate-900 leading-tight">{c.name}</p>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{c.type === 'CUSTOMER' ? '👤 Müşteri' : '🏬 Tedarikçi'}</p>
                                                                </td>
                                                                {financeDateRange.start && (
                                                                    <td className="px-6 py-5 bg-indigo-50/10">
                                                                        <span className={`text-sm font-black ${carried > 0 ? 'text-emerald-600' : carried < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                                            {carried.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                                        </span>
                                                                    </td>
                                                                )}
                                                                <td className="px-6 py-5 text-sm font-black text-emerald-600">{debit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                                                <td className="px-6 py-5 text-sm font-black text-red-600">{credit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                                                <td className="px-6 py-5 text-right">
                                                                    <span className={`px-4 py-2 rounded-xl text-xs font-black inline-block min-w-[100px] ${net > 0 ? 'bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-100' : net < 0 ? 'bg-red-50 text-red-600 shadow-sm shadow-red-100' : 'bg-slate-50 text-slate-400'}`}>
                                                                        {net.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-900 text-white font-black text-sm uppercase">
                                                        <td colSpan={2} className="px-6 py-6 rounded-bl-3xl">TOPLAM</td>
                                                        {financeDateRange.start && (
                                                            <td className="px-6 py-6 text-indigo-300">
                                                                {contactsBalance.reduce((sum, c) => sum + (Number(c.carried_balance) || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-6 text-emerald-400">
                                                            {contactsBalance.reduce((sum, c) => sum + (Number(c.period_debit) || (Number(c.balance) > 0 ? Number(c.balance) : 0)), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                        </td>
                                                        <td className="px-6 py-6 text-red-400">
                                                            {contactsBalance.reduce((sum, c) => sum + (Number(c.period_credit) || (Number(c.balance) < 0 ? Math.abs(Number(c.balance)) : 0)), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                        </td>
                                                        <td className="px-6 py-6 text-right rounded-br-3xl">
                                                            {contactsBalance.reduce((sum, c) => sum + (Number(c.balance) || 0), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
    );
}

export function InvoiceModal({ ctx }: { ctx: Ctx }) {
    const { showInvoiceModal, setShowInvoiceModal, selectedAppointment, invoiceForm, setInvoiceForm, currentAccounts, checkingVkn, setCheckingVkn, vknCheckResult, setVknCheckResult, handleCreateInvoice, formatPhoneWithSpaces } = ctx;
    return (
                <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)}>
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Faturaya Dönüştür</h2>
                        <p className="text-sm text-slate-400 mb-8 font-bold uppercase tracking-widest">{selectedAppointment.customer_name} • {selectedAppointment.price} ₺</p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cari Kart Seçin (İsteğe Bağlı)</label>
                                <select
                                    value={invoiceForm.current_account_id || ''}
                                    onChange={e => {
                                        const val = e.target.value;
                                        const selectedCari = currentAccounts.find(c => c.id === parseInt(val));
                                        setInvoiceForm(prev => ({
                                            ...prev,
                                            current_account_id: val ? parseInt(val) : null,
                                            customer_name: selectedCari ? selectedCari.name : prev.customer_name,
                                            vkn: selectedCari ? (selectedCari.tax_number || '') : prev.vkn,
                                            tax_office: selectedCari ? (selectedCari.tax_office || '') : prev.tax_office
                                        }));
                                    }}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all appearance-none"
                                >
                                    <option value="">Cari Seçilmedi (Manuel Giriş)</option>
                                    {currentAccounts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                </select>
                            </div>

                            {/* VKN / TCKN Check */}
                            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Müşteri VKN / TCKN</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        maxLength={11}
                                        value={invoiceForm.vkn}
                                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, vkn: e.target.value }))}
                                        className="flex-1 bg-white border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                        placeholder="11122233344"
                                    />
                                    <button
                                        onClick={async () => {
                                            if (invoiceForm.vkn.length < 10) return alert('Geçerli bir VKN/TCKN girin');
                                            setCheckingVkn(true);
                                            try {
                                                const res = await api.get(`/finance/check-einvoice-user?vkn=${invoiceForm.vkn}`);
                                                setVknCheckResult({ vkn: invoiceForm.vkn, isEInvoice: res.data.data.isEInvoice });
                                                setInvoiceForm(prev => ({ ...prev, type: res.data.data.isEInvoice ? 'e-fatura' : 'e-arsiv' }));
                                            } catch (err) {
                                                alert('Sorgulama başarısız');
                                            } finally {
                                                setCheckingVkn(false);
                                            }
                                        }}
                                        disabled={checkingVkn}
                                        className="px-6 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {checkingVkn ? '...' : 'Sorgula'}
                                    </button>
                                </div>
                                {vknCheckResult && (
                                    <p className={`mt-3 text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-lg inline-block ${vknCheckResult.isEInvoice ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {vknCheckResult.isEInvoice ? '✨ E-Fatura Mükellefi' : '📄 E-Arşiv Kullanıcısı'}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Müşteri Adı Soyadı</label>
                                    <input
                                        type="text"
                                        value={invoiceForm.customer_name}
                                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, customer_name: e.target.value }))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                        placeholder="Müşteri Adı"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefon Numarası</label>
                                    <input
                                        type="text"
                                        value={invoiceForm.customer_phone}
                                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, customer_phone: e.target.value }))}
                                        onBlur={(e) => setInvoiceForm(prev => ({ ...prev, customer_phone: formatPhoneWithSpaces(e.target.value) }))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                        placeholder="05..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Vergi Dairesi</label>
                                    <input
                                        type="text"
                                        value={invoiceForm.tax_office}
                                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, tax_office: e.target.value }))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                        placeholder="Örn: Beyoğlu"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Fatura Tipi</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setInvoiceForm(prev => ({ ...prev, type: 'e-arsiv' }))}
                                            disabled={!!(vknCheckResult && vknCheckResult.isEInvoice)}
                                            className={`flex-1 py-3.5 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${invoiceForm.type === 'e-arsiv' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-100 text-slate-400'} ${vknCheckResult && vknCheckResult.isEInvoice ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            E-Arşiv
                                        </button>
                                        <button
                                            onClick={() => setInvoiceForm(prev => ({ ...prev, type: 'e-fatura' }))}
                                            disabled={!!(vknCheckResult && !vknCheckResult.isEInvoice)}
                                            className={`flex-1 py-3.5 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${invoiceForm.type === 'e-fatura' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-slate-100 text-slate-400'} ${vknCheckResult && !vknCheckResult.isEInvoice ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            E-Fatura
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Hizmet Tutarı (₺)</label>
                                    <input
                                        type="number"
                                        value={invoiceForm.price}
                                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all font-mono text-lg"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">İskonto Oranı (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={invoiceForm.discount_rate}
                                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, discount_rate: Number(e.target.value) }))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">KDV Oranı (%)</label>
                                    <select
                                        value={invoiceForm.vat_rate}
                                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, vat_rate: Number(e.target.value) }))}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none"
                                    >
                                        <option value={20}>%20 (Genel)</option>
                                        <option value={10}>%10 (İndirimli)</option>
                                        <option value={1}>%1 (Gıda vb.)</option>
                                        <option value={0}>%0 (İstisna)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Ödeme Şekli Seçin</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => handleCreateInvoice('nakit')}
                                        className="p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 flex flex-col items-center gap-3 hover:bg-emerald-100 transition-all font-black text-emerald-600 group"
                                    >
                                        <span className="text-4xl italic group-active:scale-90 transition-transform">Nakit</span>
                                        <span className="text-[10px] uppercase tracking-widest">💰 Kasaya Giriş</span>
                                    </button>
                                    <button
                                        onClick={() => handleCreateInvoice('kart')}
                                        className="p-8 bg-indigo-50 rounded-[2.5rem] border-2 border-indigo-100 flex flex-col items-center gap-3 hover:bg-indigo-100 transition-all font-black text-indigo-600 group"
                                    >
                                        <span className="text-4xl italic group-active:scale-90 transition-transform">Kart</span>
                                        <span className="text-[10px] uppercase tracking-widest">💳 POS Tahsilat</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setShowInvoiceModal(false);
                                    setVknCheckResult(null);
                                    setInvoiceForm({
                                        vkn: '',
                                        tax_office: '',
                                        vat_rate: 20,
                                        discount_rate: 0,
                                        price: 0,
                                        type: 'e-arsiv',
                                        customer_name: '',
                                        customer_phone: '',
                                        customer_id: null,
                                        current_account_id: null
                                    });
                                }}
                                className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-base uppercase tracking-widest"
                            >
                                Vazgeç
                            </button>
                        </div>
                    </div>
                </div>
    );
}

export function PurchaseModal({ ctx }: { ctx: Ctx }) {
    const { showPurchaseModal, setShowPurchaseModal, purchaseForm, setPurchaseForm, currentAccounts, inventoryProducts, handleCreatePurchase } = ctx;
    return (
                <div className="fixed inset-0 z-[300] flex items-end lg:items-center justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)}>
                    <div className="bg-white w-full max-w-2xl rounded-t-[3rem] lg:rounded-[3rem] p-8 lg:p-10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-6">Alış Faturası Girişi</h2>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cari Kart Seçin (İsteğe Bağlı)</label>
                                    <select
                                        value={purchaseForm.current_account_id}
                                        onChange={e => {
                                            const selectedCari = currentAccounts.find(c => c.id === parseInt(e.target.value));
                                            setPurchaseForm({
                                                ...purchaseForm,
                                                current_account_id: e.target.value,
                                                supplier_name: selectedCari ? selectedCari.name : purchaseForm.supplier_name
                                            });
                                        }}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <option value="">Cari Seçilmedi (Manuel Giriş)</option>
                                        {currentAccounts.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tedarikçi Adı</label>
                                    <input
                                        type="text"
                                        value={purchaseForm.supplier_name}
                                        onChange={e => setPurchaseForm({ ...purchaseForm, supplier_name: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                        placeholder="Örn: X Kozmetik Ltd."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fatura No</label>
                                    <input
                                        type="text"
                                        value={purchaseForm.invoice_no}
                                        onChange={e => setPurchaseForm({ ...purchaseForm, invoice_no: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                        placeholder="ALI20240001"
                                    />
                                </div>
                            </div>

                            {/* Item Section */}
                            <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Fatura Satırları</h3>
                                    <button
                                        onClick={() => setPurchaseForm({
                                            ...purchaseForm,
                                            items: [...purchaseForm.items, { product_name: '', quantity: 1, unit_price: 0, vat_rate: 20, discount_rate: 0 }]
                                        })}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
                                    >
                                        + Satır Ekle
                                    </button>
                                </div>

                                {purchaseForm.items.map((item, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3 relative">
                                        <button
                                            onClick={() => {
                                                const newItems = [...purchaseForm.items];
                                                newItems.splice(idx, 1);
                                                setPurchaseForm({ ...purchaseForm, items: newItems });
                                            }}
                                            className="absolute top-2 right-2 text-red-300 hover:text-red-500 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="md:col-span-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Ürün / Hizmet Seçin (Envanter)</label>
                                                <select
                                                    value={item.product_id || ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const prod = inventoryProducts.find(p => p.id === parseInt(val));
                                                        const newItems = [...purchaseForm.items];
                                                        newItems[idx] = {
                                                            ...newItems[idx],
                                                            product_id: val ? parseInt(val) : null,
                                                            product_name: prod ? `${prod.brand} ${prod.name}` : '',
                                                            unit: prod ? prod.unit : 'Adet'
                                                        };
                                                        setPurchaseForm({ ...purchaseForm, items: newItems });
                                                    }}
                                                    className="w-full p-3 bg-slate-50 border-2 border-indigo-50 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all appearance-none"
                                                >
                                                    <option value="">Envanter Dışı / Manuel Yaz...</option>
                                                    {inventoryProducts.map(p => (
                                                        <option key={p.id} value={p.id}>{p.brand} - {p.name} ({p.current_stock} {p.unit} Mevcut)</option>
                                                    ))}
                                                </select>
                                                {!item.product_id && (
                                                    <input
                                                        type="text"
                                                        value={item.product_name}
                                                        onChange={e => {
                                                            const newItems = [...purchaseForm.items];
                                                            newItems[idx].product_name = e.target.value;
                                                            setPurchaseForm({ ...purchaseForm, items: newItems });
                                                        }}
                                                        className="w-full mt-2 p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                                                        placeholder="Veya manuel bir isim yazın..."
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Miktar</label>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => {
                                                        const newItems = [...purchaseForm.items];
                                                        newItems[idx].quantity = Number(e.target.value);
                                                        setPurchaseForm({ ...purchaseForm, items: newItems });
                                                    }}
                                                    className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Birim Fiyat (₺)</label>
                                                <input
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={e => {
                                                        const newItems = [...purchaseForm.items];
                                                        newItems[idx].unit_price = Number(e.target.value);
                                                        setPurchaseForm({ ...purchaseForm, items: newItems });
                                                    }}
                                                    className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">KDV %</label>
                                                    <select
                                                        value={item.vat_rate}
                                                        onChange={e => {
                                                            const newItems = [...purchaseForm.items];
                                                            newItems[idx].vat_rate = Number(e.target.value);
                                                            setPurchaseForm({ ...purchaseForm, items: newItems });
                                                        }}
                                                        className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-xs"
                                                    >
                                                        <option value={0}>0</option>
                                                        <option value={1}>1</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">İskonto %</label>
                                                    <input
                                                        type="number"
                                                        value={item.discount_rate}
                                                        onChange={e => {
                                                            const newItems = [...purchaseForm.items];
                                                            newItems[idx].discount_rate = Number(e.target.value);
                                                            setPurchaseForm({ ...purchaseForm, items: newItems });
                                                        }}
                                                        className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-end justify-end">
                                                <p className="text-xs font-black text-indigo-600">
                                                    Satır Toplam: {((item.unit_price * item.quantity) * (1 - item.discount_rate / 100) * (1 + item.vat_rate / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {purchaseForm.items.length === 0 && (
                                    <div className="bg-white/50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Henüz satır eklenmedi</p>
                                    </div>
                                )}
                            </div>

                            {/* Summary Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Açıklama</label>
                                    <textarea
                                        value={purchaseForm.description}
                                        onChange={e => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                        rows={2}
                                        placeholder="İşlem detayı..."
                                    />
                                </div>
                                <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col justify-center relative overflow-hidden group">
                                    <div className="absolute top-4 right-4 z-10">
                                        <button
                                            onClick={() => setPurchaseForm({ ...purchaseForm, is_closed: !purchaseForm.is_closed })}
                                            className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${purchaseForm.is_closed
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                                }`}
                                        >
                                            {purchaseForm.is_closed ? '🔐 Kapalı Fatura' : '🔓 Açık Fatura'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Genel Toplam</p>
                                    <h2 className="text-3xl font-black italic mt-1">
                                        {purchaseForm.items.reduce((sum, item) =>
                                            sum + ((item.unit_price * item.quantity) * (1 - item.discount_rate / 100) * (1 + item.vat_rate / 100)),
                                            0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                    </h2>
                                    <p className="text-[8px] mt-2 font-black text-white/30 uppercase tracking-widest group-hover:text-white/50 transition-colors">
                                        {purchaseForm.is_closed ? '* Kasadan Nakit Çıkışı Yapılacak' : '* Cari Borç Olarak Kaydedilecek'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowPurchaseModal(false)}
                                    className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-sm"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={() => {
                                        if (!purchaseForm.supplier_name) return alert('Tedarikçi adı gereklidir');
                                        if (purchaseForm.items.length === 0) return alert('En az bir ürün eklemelisiniz');

                                        const processedItems = purchaseForm.items.map(item => {
                                            const lineSubtotal = item.unit_price * item.quantity;
                                            const discount_amount = lineSubtotal * (item.discount_rate / 100);
                                            const afterDiscount = lineSubtotal - discount_amount;
                                            const vat_amount = afterDiscount * (item.vat_rate / 100);
                                            return {
                                                ...item,
                                                vat_amount,
                                                discount_amount,
                                                total_amount: afterDiscount + vat_amount
                                            };
                                        });

                                        const totalAmount = processedItems.reduce((sum, i) => sum + i.total_amount, 0);

                                        handleCreatePurchase({
                                            supplier_name: purchaseForm.supplier_name,
                                            current_account_id: purchaseForm.current_account_id || null,
                                            invoice_no: purchaseForm.invoice_no,
                                            description: purchaseForm.description,
                                            invoice_date: purchaseForm.invoice_date,
                                            is_closed: purchaseForm.is_closed,
                                            amount: totalAmount,
                                            items: processedItems
                                        });

                                        // Reset form
                                        setPurchaseForm({
                                            supplier_name: '',
                                            current_account_id: '',
                                            invoice_no: '',
                                            invoice_date: new Date().toISOString().split('T')[0],
                                            description: '',
                                            is_closed: true,
                                            items: []
                                        });
                                    }}
                                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl shadow-indigo-100"
                                >
                                    Faturayı Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
    );
}

export function PurchaseDetailModal({ ctx }: { ctx: Ctx }) {
    const { showPurchaseDetailModal, setShowPurchaseDetailModal, selectedPurchaseInvoice, setSelectedPurchaseInvoice, handleDeletePurchaseInvoice } = ctx;
    return (
                <div className="fixed inset-0 z-[400] flex items-end lg:items-center justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => { setShowPurchaseDetailModal(false); setSelectedPurchaseInvoice(null); }}>
                    <div className="bg-white w-full max-w-2xl rounded-t-[3rem] lg:rounded-[3rem] p-8 lg:p-10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />

                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedPurchaseInvoice.supplier_name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alış Faturası Detayı</p>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${selectedPurchaseInvoice.is_closed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {selectedPurchaseInvoice.is_closed ? 'Kapalı' : 'Açık'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-black text-slate-900">{selectedPurchaseInvoice.invoice_no || '---'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(selectedPurchaseInvoice.invoice_date).toLocaleDateString('tr-TR')}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4 mb-8">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fatura Satırları</h3>
                            <div className="space-y-2">
                                {selectedPurchaseInvoice.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-black text-slate-900 text-sm">{item.product_name}</h4>
                                            <p className="text-sm font-black text-slate-900">{parseFloat(item.total_amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                            <span>Miktar: {parseFloat(item.quantity).toLocaleString('tr-TR')}</span>
                                            <span>•</span>
                                            <span>Birim: {parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                            {parseFloat(item.discount_rate) > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-red-400">İsk: %{item.discount_rate}</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <span className="text-indigo-400">KDV: %{item.vat_rate}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 px-2">
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ara Toplam</p>
                                <p className="text-sm font-bold text-slate-700">{parseFloat(selectedPurchaseInvoice.subtotal).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">İskonto</p>
                                <p className="text-sm font-bold text-red-400">-{parseFloat(selectedPurchaseInvoice.discount_total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">KDV Toplam</p>
                                <p className="text-sm font-bold text-indigo-500">+{parseFloat(selectedPurchaseInvoice.vat_total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Genel Toplam</p>
                                <p className="text-lg font-black text-slate-900">{parseFloat(selectedPurchaseInvoice.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                            </div>
                        </div>

                        {selectedPurchaseInvoice.description && (
                            <div className="mb-8 px-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Açıklama</p>
                                <p className="text-xs text-slate-600 font-medium bg-slate-50 p-4 rounded-xl">{selectedPurchaseInvoice.description}</p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => { setShowPurchaseDetailModal(false); setSelectedPurchaseInvoice(null); }}
                                className="flex-[3] py-5 bg-slate-900 text-white rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl shadow-slate-200"
                            >
                                Kapat
                            </button>
                            <button
                                onClick={() => handleDeletePurchaseInvoice(selectedPurchaseInvoice.id)}
                                className="flex-1 py-5 bg-red-50 text-red-600 rounded-[2rem] font-black text-base uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center border border-red-100"
                                title="Faturayı Sil"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
    );
}

export function CashModal({ ctx }: { ctx: Ctx }) {
    const { showCashModal, setShowCashModal, currentAccounts, handleCreateCashTransaction } = ctx;
    return (
                <div className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowCashModal(false)}>
                    <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-6">Kasa İşlemi Oluştur</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Kategori</label>
                                    <select id="c_cat" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold">
                                        <option value="income">Tahsilat / Gelir</option>
                                        <option value="expense">Ödeme / Gider</option>
                                        <option value="salary">Maaş / Prim</option>
                                        <option value="devir">Kasa Devir İşlemi</option>
                                        <option value="other">Diğer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 ml-1">Borç (Tahsilat)</label>
                                    <input type="number" id="c_debit" className="w-full p-4 bg-emerald-50 border-none rounded-2xl font-bold text-emerald-700" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 ml-1">Alacak (Ödeme)</label>
                                    <input type="number" id="c_credit" className="w-full p-4 bg-red-50 border-none rounded-2xl font-bold text-red-700" placeholder="0.00" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">İşlem Tarihi</label>
                                    <input type="date" id="c_date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cari Kart Seçin (İsteğe Bağlı)</label>
                                <select id="c_cari" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                                    <option value="">Cari Seçilmedi</option>
                                    {currentAccounts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Açıklama</label>
                                <textarea id="c_desc" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" rows={2} placeholder="İşlem detayı..." />
                            </div>
                            <button
                                onClick={() => {
                                    const cat = (document.getElementById('c_cat') as HTMLSelectElement).value;
                                    const debit = Number((document.getElementById('c_debit') as HTMLInputElement).value || 0);
                                    const credit = Number((document.getElementById('c_credit') as HTMLInputElement).value || 0);
                                    const date = (document.getElementById('c_date') as HTMLInputElement).value;
                                    const desc = (document.getElementById('c_desc') as HTMLTextAreaElement).value;
                                    const cariId = (document.getElementById('c_cari') as HTMLSelectElement).value;

                                    if (debit === 0 && credit === 0) {
                                        alert('Lütfen bir tutar girin');
                                        return;
                                    }

                                    const type = debit > 0 ? 'income' : 'expense';
                                    const amount = debit > 0 ? debit : credit;

                                    handleCreateCashTransaction({
                                        type,
                                        category: cat,
                                        amount,
                                        debit,
                                        credit,
                                        description: desc,
                                        transaction_date: date,
                                        payment_method: 'nakit',
                                        current_account_id: cariId ? parseInt(cariId) : null
                                    });
                                }}
                                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl shadow-slate-200 mt-4"
                            >
                                İşlemi Kaydet
                            </button>
                        </div>
                    </div>
                </div>
    );
}

export function CurrentAccountModal({ ctx }: { ctx: Ctx }) {
    const { showCurrentAccountModal, setShowCurrentAccountModal, currentAccountForm, setCurrentAccountForm, handleCreateCurrentAccount, handleUpdateCurrentAccount, geoProvinces, geoDistricts, geoNeighborhoods, fetchDistricts, fetchNeighborhoods, loadingGeo, formatPhoneWithSpaces } = ctx;
    return (
                <div className="fixed inset-0 z-[500] flex items-end lg:items-center justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowCurrentAccountModal(false)}>
                    <div className="bg-white w-full max-w-2xl rounded-t-[3rem] lg:rounded-[3rem] p-8 lg:p-10 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}
                        style={{ animation: 'slideUp 0.3s ease-out' }}>
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                        <h2 className="text-2xl font-black text-slate-900 mb-6">{currentAccountForm.id ? 'Cari Kart Düzenle' : 'Yeni Cari Kart Oluştur'}</h2>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cari Kodu</label>
                                    <input
                                        type="text"
                                        value={currentAccountForm.code}
                                        onChange={e => setCurrentAccountForm({ ...currentAccountForm, code: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                        placeholder="CARI-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cari Grubu</label>
                                    <select
                                        value={currentAccountForm.type}
                                        onChange={e => setCurrentAccountForm({ ...currentAccountForm, type: e.target.value as any })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                    >
                                        <option value="ALL">Hepsi</option>
                                        <option value="CUSTOMER">Müşteri</option>
                                        <option value="SUPPLIER">Tedarikçi</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cari Adı / Soyadı (Zorunlu)</label>
                                <input
                                    type="text"
                                    value={currentAccountForm.name}
                                    onChange={e => setCurrentAccountForm({ ...currentAccountForm, name: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                    placeholder="Selim Yılmaz"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ticari Ünvan</label>
                                <input
                                    type="text"
                                    value={currentAccountForm.title}
                                    onChange={e => setCurrentAccountForm({ ...currentAccountForm, title: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                    placeholder="Salon Cebinde Bilişim Ltd. Şti."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Vergi Dairesi</label>
                                    <input
                                        type="text"
                                        value={currentAccountForm.tax_office}
                                        onChange={e => setCurrentAccountForm({ ...currentAccountForm, tax_office: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                        placeholder="Beyoğlu"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Vergi No / T.C. No</label>
                                    <input
                                        type="text"
                                        value={currentAccountForm.tax_number}
                                        onChange={e => setCurrentAccountForm({ ...currentAccountForm, tax_number: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                        placeholder="1234567890"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Telefon</label>
                                    <input
                                        type="text"
                                        value={currentAccountForm.phone}
                                        onChange={e => setCurrentAccountForm({ ...currentAccountForm, phone: e.target.value })}
                                        onBlur={e => setCurrentAccountForm({ ...currentAccountForm, phone: formatPhoneWithSpaces(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                        placeholder="05..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">E-Posta</label>
                                    <input
                                        type="email"
                                        value={currentAccountForm.email}
                                        onChange={e => setCurrentAccountForm({ ...currentAccountForm, email: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
                                        placeholder="info@saloon.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                        Şehir {loadingGeo.provinces && <span className="inline-block animate-spin ml-1">⏳</span>}
                                    </label>
                                    <select
                                        value={currentAccountForm.city}
                                        onChange={e => {
                                            const cityName = e.target.value;
                                            setCurrentAccountForm({ ...currentAccountForm, city: cityName, district: '', address_line: '' });
                                            if (cityName) fetchDistricts(cityName);
                                        }}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <option value="">{loadingGeo.provinces ? 'Yükleniyor...' : 'Şehir Seçin'}</option>
                                        {geoProvinces.map(p => (
                                            <option key={p.id} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                        İlçe {loadingGeo.districts && <span className="inline-block animate-spin ml-1">⏳</span>}
                                    </label>
                                    <select
                                        value={currentAccountForm.district}
                                        onChange={e => {
                                            const districtName = e.target.value;
                                            const dist = geoDistricts.find(d => d.name === districtName);
                                            setCurrentAccountForm({ ...currentAccountForm, district: districtName });
                                            if (dist) fetchNeighborhoods(currentAccountForm.city || '', dist.id);
                                        }}
                                        disabled={!currentAccountForm.city || loadingGeo.districts}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <option value="">{loadingGeo.districts ? 'Yükleniyor...' : 'İlçe Seçin'}</option>
                                        {geoDistricts.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                        Mahalle {loadingGeo.neighborhoods && <span className="inline-block animate-spin ml-1">⏳</span>}
                                    </label>
                                    <select
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val) {
                                                const currentAddress = currentAccountForm.address_line || '';
                                                // Prepend neighborhood to address if not already there or replace existing Mah. part
                                                const cleanAddress = currentAddress.includes('Mah.') ? currentAddress.split('Mah.')[1].trim() : currentAddress;
                                                setCurrentAccountForm({ ...currentAccountForm, address_line: val + ' Mah. ' + cleanAddress });
                                            }
                                        }}
                                        disabled={!currentAccountForm.district || loadingGeo.neighborhoods}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <option value="">{loadingGeo.neighborhoods ? 'Yükleniyor...' : 'Mahalle Seçin'}</option>
                                        {geoNeighborhoods.map(n => (
                                            <option key={n.id} value={n.name}>{n.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Ülke</label>
                                    <input
                                        type="text"
                                        value={currentAccountForm.country || 'Türkiye'}
                                        onChange={e => setCurrentAccountForm({ ...currentAccountForm, country: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="Türkiye"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Adres Detayı</label>
                                <textarea
                                    value={currentAccountForm.address_line}
                                    onChange={e => setCurrentAccountForm({ ...currentAccountForm, address_line: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold h-24 resize-none"
                                    placeholder="Cadde, sokak, no..."
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowCurrentAccountModal(false)}
                                    className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-base uppercase tracking-widest"
                                >Vazgeç</button>
                                <button
                                    onClick={() => {
                                        if (!currentAccountForm.name) return alert('İsim zorunludur');
                                        if (currentAccountForm.id) {
                                            handleUpdateCurrentAccount(currentAccountForm.id, currentAccountForm);
                                        } else {
                                            handleCreateCurrentAccount(currentAccountForm);
                                        }
                                    }}
                                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl shadow-indigo-100"
                                >{currentAccountForm.id ? 'Güncelle' : 'Cari Kartı Oluştur'}</button>
                            </div>
                        </div>
                    </div>
                </div>
    );
}
