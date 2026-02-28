import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Company } from '../types';
import { useSearchParams } from 'react-router-dom';

export default function CompanyList() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [searchParams] = useSearchParams();
    const mainId = searchParams.get('main_id');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const params: any = {};
            if (mainId) params.main_company_id = mainId;
            const response = await api.get('/companies', { params });
            setCompanies(response.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Firmalar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Bu firmayı silmek istediğinizden emin misiniz?')) return;
        try {
            await api.delete(`/companies/${id}`);
            fetchCompanies();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Firma silinirken hata oluştu');
        }
    };

    const handleVerify = async (id: number) => {
        try {
            await api.post(`/companies/${id}/verify`);
            fetchCompanies();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Firma onaylanırken hata oluştu');
        }
    };

    const filtered = companies.filter(c =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.province_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-6 text-gray-500 font-bold tracking-widest uppercase text-xs">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <Link to="/" className="text-pink-600 hover:text-pink-700 text-xs font-bold uppercase tracking-widest mb-1 inline-block">
                                ← Dashboard
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {mainId ? 'Üst Firma Şubeleri' : 'Firmalar'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                to="/salon-generator"
                                className="bg-slate-900 text-white py-2 px-5 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                <span className="text-lg">🛰️</span>
                                Salon Yakala
                            </Link>
                            <Link to="/companies/new" className="btn-primary py-2 px-5 text-sm flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                                Yeni Firma
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl mb-6 font-bold text-sm flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Arama */}
                <div className="mb-6 relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Firma adı, e-posta, telefon veya şehir ile ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl font-medium text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-300 transition-all"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Liste */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Tablo Başlığı */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-gray-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="col-span-4">Firma</div>
                        <div className="col-span-2">Telefon</div>
                        <div className="col-span-2">Şehir</div>
                        <div className="col-span-2">Durum</div>
                        <div className="col-span-2 text-right">İşlemler</div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <p className="text-gray-500 font-bold text-sm">
                                {search ? `"${search}" için sonuç bulunamadı.` : 'Henüz firma eklenmemiş.'}
                            </p>
                            {!search && (
                                <Link to="/companies/new" className="btn-primary inline-flex items-center gap-2 mt-6 text-sm">
                                    İlk Firmayı Ekle
                                </Link>
                            )}
                        </div>
                    ) : (
                        filtered.map((company, idx) => (
                            <div
                                key={company.id}
                                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-pink-50/20 transition-colors group ${idx !== filtered.length - 1 ? 'border-b border-gray-50' : ''}`}
                            >
                                {/* Firma Adı */}
                                <div className="col-span-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-pink-100 rounded-xl flex items-center justify-center text-pink-600 font-black text-sm flex-shrink-0">
                                            {company.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <Link to={`/companies/${company.id}`} className="font-bold text-gray-900 text-sm leading-tight hover:text-pink-600 transition-colors block truncate">
                                                {company.name}
                                            </Link>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                                                    #{company.id}
                                                </span>
                                                {company.company_type && (
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{company.company_type}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Telefon */}
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 font-medium">{company.phone || '—'}</p>
                                </div>

                                {/* Şehir */}
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 font-medium">
                                        {company.province_name ? `${company.province_name}${company.district_name ? `, ${company.district_name}` : ''}` : '—'}
                                    </p>
                                </div>

                                {/* Durum */}
                                <div className="col-span-2">
                                    <div className="flex flex-wrap gap-1">
                                        {company.is_verified ? (
                                            <span className="bg-green-100 text-green-700 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full">Onaylı</span>
                                        ) : (
                                            <span className="bg-amber-100 text-amber-700 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full">Beklemede</span>
                                        )}
                                        {!company.is_active && (
                                            <span className="bg-red-100 text-red-700 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full">Pasif</span>
                                        )}
                                    </div>
                                </div>

                                {/* İşlemler */}
                                <div className="col-span-2 flex items-center justify-end gap-1.5">
                                    {!company.is_verified && (
                                        <button
                                            onClick={() => handleVerify(company.id!)}
                                            title="Onayla"
                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all duration-200"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </button>
                                    )}
                                    <Link
                                        to={`/companies/${company.id}/edit`}
                                        title="Düzenle"
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(company.id!)}
                                        title="Sil"
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {filtered.length > 0 && (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-4 text-right">
                        {filtered.length} firma
                    </p>
                )}
            </main>
        </div>
    );
}
