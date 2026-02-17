import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { Company } from '../types';

export default function CompanyDetail() {
    const { id } = useParams();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCompanyData();
    }, [id]);

    const fetchCompanyData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/companies/${id}`);
            setCompany(response.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Veriler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };



    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
    if (!company) return <div className="p-8 text-center">Firma bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <Link to="/companies" className="text-pink-600 hover:text-pink-700 text-sm mb-1 inline-block">
                            ← Firmalar
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                    </div>
                    <Link to={`/companies/${id}/edit`} className="btn-secondary">
                        Firmayı Düzenle
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {error && (
                    <div className="lg:col-span-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}
                {/* Sol Kolon: Firma Bilgileri */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Firma Bilgileri</h2>
                        <div className="space-y-3 text-sm">
                            <p><span className="font-medium">Telefon:</span> {company.phone || '-'}</p>
                            <p><span className="font-medium">E-posta:</span> {company.email || '-'}</p>
                            <p><span className="font-medium">Adres:</span> {company.address_line} {company.neighborhood_name} {company.district_name}/{company.province_name}</p>
                            <p><span className="font-medium">Banka:</span> {company.bank_name}</p>
                            <p><span className="font-medium">IBAN:</span> {company.iban}</p>
                        </div>
                    </div>

                    {/* QR Kod Bölümü */}
                    <div className="card flex flex-col items-center justify-center p-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Firma Karekodu</h3>
                        <p className="text-xs text-gray-500 mb-6 text-center">Bu kodu müşterilerinizle paylaşarak hızlı randevu almalarını sağlayabilirsiniz.</p>

                        <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-pink-100 mb-6">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/ekuafor/book/${company.id}`)}`}
                                alt="Firma QR Kodu"
                                className="w-40 h-40"
                            />
                        </div>

                        <a
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`${window.location.origin}/ekuafor/book/${company.id}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary w-full py-2 text-xs font-bold text-center"
                        >
                            QR Kodu İndir
                        </a>
                    </div>
                </div>

                {/* Sağ Kolon: Mesai Bilgileri (Çalışan Yönetimi yerine) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4 border-b pb-2">Mesai Saatleri</h2>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-pink-50 p-6 rounded-xl text-center">
                                <p className="text-xs text-pink-600 font-bold uppercase tracking-widest mb-2">AÇILIŞ SAATİ</p>
                                <p className="text-4xl font-black text-gray-900">{company.work_start_time || '09:00'}</p>
                            </div>
                            <div className="bg-purple-50 p-6 rounded-xl text-center">
                                <p className="text-xs text-purple-600 font-bold uppercase tracking-widest mb-2">KAPANIŞ SAATİ</p>
                                <p className="text-4xl font-black text-gray-900">{company.work_end_time || '20:00'}</p>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-500 text-center">
                            Randevu sistemi bu saatlere göre çalışacaktır.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
