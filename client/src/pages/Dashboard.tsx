import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
    const { user, logout } = useAuthStore();

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-secondary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                                <span className="text-white font-serif text-xl">S</span>
                            </div>
                            <h1 className="text-xl font-bold heading-serif hidden md:block">Saloon Yönetim Paneli</h1>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-900 leading-none">{user?.first_name} {user?.last_name}</p>
                                <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider mt-1">{user?.role?.replace('_', ' ')}</p>
                            </div>
                            <button onClick={logout} className="btn-secondary py-2 px-4 text-xs font-bold border-gray-100">
                                Çıkış Yap
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-10 text-center sm:text-left">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Merhaba, {user?.first_name}! 👋</h2>
                    <p className="text-gray-500 font-medium">İşletmenizi yönetmek için ihtiyacınız olan her şey burada.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Firma Yönetimi */}
                    <Link to="/companies" className="card group hover:scale-[1.02] transition-all duration-300">
                        <div className="flex items-center gap-5">
                            <div className="bg-primary-50 p-4 rounded-2xl group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                                <svg className="w-8 h-8 text-primary-600 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">Firmalar</h3>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">Firma ekle, düzenle ve şubeleri yönet.</p>
                            </div>
                        </div>
                    </Link>

                    {/* Randevular */}
                    <div className="card group opacity-80 border-dashed border-2 bg-gray-50/50">
                        <div className="flex items-center gap-5">
                            <div className="bg-white p-4 rounded-2xl shadow-sm">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-400 mb-1">Randevular</h3>
                                <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600 uppercase tracking-tighter">Yakında</div>
                            </div>
                        </div>
                    </div>

                    {/* Ödemeler */}
                    <div className="card group opacity-80 border-dashed border-2 bg-gray-50/50">
                        <div className="flex items-center gap-5">
                            <div className="bg-white p-4 rounded-2xl shadow-sm">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-400 mb-1">Ödemeler</h3>
                                <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600 uppercase tracking-tighter">Yakında</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* İstatistikler */}
                <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="card py-8 flex flex-col items-center justify-center border-none bg-gradient-to-br from-white to-gray-50 hover:to-primary-50/20 transition-colors duration-500">
                        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Toplam Firma</p>
                        <p className="text-5xl font-bold text-gray-900 tracking-tight">0</p>
                    </div>
                    <div className="card py-8 flex flex-col items-center justify-center border-none bg-gradient-to-br from-white to-gray-50">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Aktif Randevu</p>
                        <p className="text-5xl font-bold text-gray-300 tracking-tight">0</p>
                    </div>
                    <div className="card py-8 flex flex-col items-center justify-center border-none bg-gradient-to-br from-white to-gray-50">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bugünkü Gelir</p>
                        <p className="text-5xl font-bold text-gray-300 tracking-tight">₺0</p>
                    </div>
                    <div className="card py-8 flex flex-col items-center justify-center border-none bg-gradient-to-br from-white to-gray-50">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Müşteriler</p>
                        <p className="text-5xl font-bold text-gray-300 tracking-tight">0</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
