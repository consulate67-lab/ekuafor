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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <Link to="/" className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block">
                                ← Dashboard'a Dön
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900">Firmalar</h1>
                        </div>
                        <Link to="/companies/new" className="btn-primary">
                            + Yeni Firma Ekle
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {companies.length === 0 ? (
                    <div className="card text-center py-12">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz firma eklenmemiş</h3>
                        <p className="text-gray-600 mb-4">Başlamak için ilk firmayı ekleyin</p>
                        <Link to="/companies/new" className="btn-primary inline-block">
                            Firma Ekle
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {companies.map((company) => (
                            <div key={company.id} className="card">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Link to={`/companies/${company.id}`} className="hover:text-primary-600 transition-colors">
                                                <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
                                            </Link>
                                            {company.is_verified ? (
                                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                                    Onaylı
                                                </span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                                    Onay Bekliyor
                                                </span>
                                            )}
                                            {!company.is_active && (
                                                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                                    Pasif
                                                </span>
                                            )}
                                        </div>

                                        {company.description && (
                                            <p className="text-gray-600 mb-3">{company.description}</p>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            {company.email && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    {company.email}
                                                </div>
                                            )}

                                            {company.phone && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                    {company.phone}
                                                </div>
                                            )}

                                            {company.province_name && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {company.province_name} / {company.district_name}
                                                </div>
                                            )}

                                            {company.iban && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                                    </svg>
                                                    {company.iban}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 ml-4">
                                        {!company.is_verified && (
                                            <button
                                                onClick={() => handleVerify(company.id!)}
                                                className="text-green-600 hover:text-green-700 p-2"
                                                title="Onayla"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        )}

                                        <Link
                                            to={`/companies/${company.id}/edit`}
                                            className="text-blue-600 hover:text-blue-700 p-2"
                                            title="Düzenle"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </Link>

                                        <button
                                            onClick={() => handleDelete(company.id!)}
                                            className="text-red-600 hover:text-red-700 p-2"
                                            title="Sil"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
