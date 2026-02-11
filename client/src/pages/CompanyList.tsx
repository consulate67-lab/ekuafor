import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Company } from '../types';

export default function CompanyList() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/companies');
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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
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
                    <div className="flex justify-between items-center text-center sm:text-left">
                        <div>
                            <Link to="/" className="text-primary-600 hover:text-primary-700 text-xs font-bold uppercase tracking-widest mb-1 inline-block">
                                ← Dashboard
                            </Link>
                            <h1 className="text-2xl font-bold heading-serif">Firmalar</h1>
                        </div>
                        <Link to="/companies/new" className="btn-primary py-2 px-5 text-sm flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                            Yeni Firma
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl mb-8 animate-shake">
                        <p className="font-bold flex items-center gap-2">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            Hata: {error}
                        </p>
                    </div>
                )}

                {companies.length === 0 ? (
                    <div className="card text-center py-20 bg-gradient-to-br from-white to-gray-50 border-none shadow-sm">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Henüz firma eklenmemiş</h3>
                        <p className="text-gray-500 font-medium mb-8">İşletmenizi büyütmek için ilk adımınızı atın.</p>
                        <Link to="/companies/new" className="btn-primary inline-flex items-center gap-2">
                            İlk Firmayı Ekle
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {companies.map((company) => (
                            <div key={company.id} className="card group hover:shadow-2xl hover:shadow-primary-600/5 transition-all duration-500 border-none">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Link to={`/companies/${company.id}`} className="hover:text-primary-600 transition-colors">
                                                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{company.name}</h3>
                                            </Link>
                                            <div className="flex gap-2">
                                                {company.is_verified ? (
                                                    <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-tighter">
                                                        ONAYLI
                                                    </span>
                                                ) : (
                                                    <span className="bg-amber-100 text-amber-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-tighter">
                                                        BEKLEMEDE
                                                    </span>
                                                )}
                                                {!company.is_active && (
                                                    <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-tighter">
                                                        PASİF
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {company.description && (
                                            <p className="text-gray-500 text-sm font-medium mb-6 line-clamp-2 leading-relaxed">{company.description}</p>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs font-semibold">
                                            {company.email && (
                                                <div className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
                                                    <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    {company.email}
                                                </div>
                                            )}

                                            {company.phone && (
                                                <div className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
                                                    <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                    </div>
                                                    {company.phone}
                                                </div>
                                            )}

                                            {company.province_name && (
                                                <div className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
                                                    <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </div>
                                                    {company.province_name}, {company.district_name}
                                                </div>
                                            )}

                                            {company.iban && (
                                                <div className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
                                                    <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                        </svg>
                                                    </div>
                                                    {company.iban.slice(0, 10)}...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                        {!company.is_verified && (
                                            <button
                                                onClick={() => handleVerify(company.id!)}
                                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all duration-300"
                                                title="Onayla"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                        )}

                                        <Link
                                            to={`/companies/${company.id}/edit`}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300"
                                            title="Düzenle"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </Link>

                                        <button
                                            onClick={() => handleDelete(company.id!)}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300"
                                            title="Sil"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center">
                                    <Link to={`/companies/${company.id}`} className="text-secondary-600 hover:text-secondary-700 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        Detayları Görüntüle
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                    </Link>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">ID: #{company.id}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
