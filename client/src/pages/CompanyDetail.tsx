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

    const handlePrint = () => {
        if (!company) return;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}/ekuafor/book/${company.id}?ref=qr`)}`;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>${company.name} - QR Standı</title>
                    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>
                        body { margin: 0; padding: 0; font-family: 'Montserrat', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f8fafc; }
                        .stand { width: 148mm; height: 210mm; background: white; box-shadow: 0 20px 50px rgba(0,0,0,0.1); border-radius: 20px; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px solid #e2e8f0; }
                        .deco-top { position: absolute; top: -50px; left: -50px; width: 250px; height: 250px; background: linear-gradient(135deg, #db2777, #7c3aed); border-radius: 50%; opacity: 0.1; }
                        .deco-bottom { position: absolute; bottom: -100px; right: -100px; width: 400px; height: 400px; background: linear-gradient(135deg, #7c3aed, #db2777); border-radius: 50%; opacity: 0.1; }
                        .logo-area { margin-top: 50px; z-index: 10; }
                        .logo-name { font-size: 24px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 2px; }
                        .headline { margin-top: 60px; padding: 0 40px; z-index: 10; }
                        .headline h1 { font-size: 32px; font-weight: 900; color: #db2777; line-height: 1.2; margin: 0; }
                        .headline p { font-size: 18px; font-weight: 700; color: #475569; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; }
                        .qr-container { margin-top: 60px; padding: 25px; background: white; border-radius: 30px; border: 4px solid #f1f5f9; z-index: 10; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
                        .qr-container img { width: 100%; height: 100%; border-radius: 10px; }
                        .footer { position: absolute; bottom: 40px; z-index: 10; }
                        .footer span { font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 4px; }
                        @media print {
                            body { background: white; }
                            .stand { box-shadow: none; border: none; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="stand">
                        <div class="deco-top"></div>
                        <div class="deco-bottom"></div>
                        
                        <div class="logo-area">
                            <div class="logo-name">${company.name}</div>
                        </div>

                        <div class="headline">
                            <h1>BİR SONRAKİ RANDEVUN İÇİN</h1>
                            <p>Beni Kullan</p>
                        </div>

                        <div class="qr-container">
                            <img src="${qrUrl}" alt="QR">
                        </div>

                        <div class="footer">
                            <span>SALOON - RANDEVU SİSTEMİ</span>
                        </div>
                    </div>
                    <script>
                        window.onload = () => {
                            setTimeout(() => {
                                window.print();
                                // Optional: window.close();
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
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
                    <div className="card flex flex-col items-center justify-center p-8 bg-gradient-to-br from-white to-pink-50/30">
                        <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center text-pink-600 mb-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 8h16" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Yazdırılabilir QR Standı</h3>
                        <p className="text-xs text-gray-500 mb-8 text-center px-4">"Bir sonraki randevun için beni kullan" yazılı, salonunuza özel tasarımlı QR çıktısı alın.</p>

                        <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-pink-200 mb-8 shadow-xl shadow-pink-100/50 relative group">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${window.location.origin}/ekuafor/book/${company.id}?ref=qr`)}`}
                                alt="Firma QR Kodu"
                                className="w-48 h-48 transition-transform group-hover:scale-105 duration-500"
                            />
                            <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.9rem] flex items-center justify-center backdrop-blur-sm">
                                <span className="text-pink-600 font-black text-[10px] uppercase tracking-widest bg-white px-4 py-2 rounded-full shadow-lg">Geleceğini Planla</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={handlePrint}
                                className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest shadow-lg shadow-pink-200 flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Şık QR Standı Yazdır
                            </button>
                            <a
                                href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`${window.location.origin}/ekuafor/book/${company.id}?ref=qr`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors text-center border-2 border-gray-100 rounded-xl"
                            >
                                Ham QR Kodunu İndir
                            </a>
                        </div>
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
