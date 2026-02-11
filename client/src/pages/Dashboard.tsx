import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
    const { user, logout } = useAuthStore();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">Saloon Yönetim Paneli</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">
                                {user?.first_name} {user?.last_name} ({user?.role})
                            </span>
                            <button onClick={logout} className="btn-secondary text-sm">
                                Çıkış Yap
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Firma Yönetimi */}
                    <Link to="/companies" className="card hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary-100 p-3 rounded-lg">
                                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Firmalar</h3>
                                <p className="text-sm text-gray-600">Firma yönetimi ve tanımlamaları</p>
                            </div>
                        </div>
                    </Link>

                    {/* Randevular */}
                    <div className="card opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Randevular</h3>
                                <p className="text-sm text-gray-600">Yakında...</p>
                            </div>
                        </div>
                    </div>

                    {/* Ödemeler */}
                    <div className="card opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-3 rounded-lg">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Ödemeler</h3>
                                <p className="text-sm text-gray-600">Yakında...</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* İstatistikler */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card">
                        <p className="text-sm text-gray-600">Toplam Firma</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                    </div>
                    <div className="card">
                        <p className="text-sm text-gray-600">Aktif Randevu</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                    </div>
                    <div className="card">
                        <p className="text-sm text-gray-600">Bugünkü Gelir</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">₺0</p>
                    </div>
                    <div className="card">
                        <p className="text-sm text-gray-600">Toplam Müşteri</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
