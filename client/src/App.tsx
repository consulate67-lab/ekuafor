import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from './store/authStore';
import api from './lib/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CompanyForm from './pages/CompanyForm';
import CompanyList from './pages/CompanyList';
import CompanyDetail from './pages/CompanyDetail';
import ServiceManagement from './pages/ServiceManagement';
import AppointmentManagement from './pages/AppointmentManagement';
import CustomerHome from './pages/CustomerHome';
import LandingPage from './pages/LandingPage';
import BookingPage from './pages/BookingPage';
import SmsSettings from './pages/SmsSettings';
import SalonBoard from './pages/SalonBoard';
import CompanyPanel from './pages/CompanyPanel';
import MyAppointments from './pages/MyAppointments';
import MyNotifications from './pages/MyNotifications';
import MainCompanyPanel from './pages/MainCompanyPanel';
import MainCompanyReports from './pages/MainCompanyReports';
import SalonDataGenerator from './pages/SalonDataGenerator';
import CustomerLogin from './pages/CustomerLogin';
import SetupStaff from './pages/SetupStaff';
import SetPassword from './pages/SetPassword';
import StaffPanel from './pages/StaffPanel';
import { useAppointmentSync } from './hooks/useAppointmentSync';
import AIAdminPanel from './pages/AIAdminPanel';




function App() {
    const { isAuthenticated, initialized, setUser, setInitialized, user } = useAuthStore();
    // Global appointment status sync & notifications
    useAppointmentSync();

    const isNative = Capacitor.isNativePlatform();
    
    // Global AI Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [extractedInfo, setExtractedInfo] = useState<any>(null);

    // Use HashRouter universally to ensure GitHub Pages, Native APKs, and PWAs all function flawlessly without 404 rewrite hacks.
    const Router: any = HashRouter;
    const routerProps = {};

    useEffect(() => {
        const checkAuth = async () => {
            // Extract code correctly regardless of HashRouter / spa-github-pages param mutation
            const codeMatch = window.location.href.match(/[?&]code=([^&#]+)/);
            const code = codeMatch ? codeMatch[1] : null;

            if (code) {
                try {
                    const res = await api.post('/companies/check-code', { code });
                    if (res.data?.success) {
                        const data = res.data.data;
                        if (data.type === 'staff') {
                            if (!data.is_license_expired) {
                                if (data.token) {
                                    localStorage.setItem('token', data.token);
                                    localStorage.setItem('staff_board_code', data.board_code);
                                    const userPayload = {
                                        id: data.user_id,
                                        email: `${data.board_code}@staff.local`,
                                        first_name: data.staff_name.split(' ')[0],
                                        last_name: data.staff_name.split(' ').slice(1).join(' '),
                                        role: 'staff',
                                        company_id: data.company_id,
                                        photo: data.photo
                                    };
                                    useAuthStore.getState().login(userPayload as any, data.token);
                                }
                                window.location.hash = '#/dashboard';
                            }
                        } else if (data.type === 'board') {
                            localStorage.setItem('salon_board_key', data.board_key);
                            window.location.hash = '#/board';
                        } else if (data.type === 'admin') {
                            if (!data.is_license_expired) {
                                window.location.hash = '#' + data.redirect;
                            }
                        }

                        // Clean up URL safely
                        try {
                            const urlObj = new URL(window.location.href);
                            ['code', '/?code', '?code'].forEach(k => urlObj.searchParams.delete(k));

                            if (urlObj.hash.includes('code=')) {
                                const [p, q] = urlObj.hash.split('?');
                                if (q) {
                                    const hp = new URLSearchParams(q);
                                    hp.delete('code');
                                    urlObj.hash = p + (hp.toString() ? '?' + hp.toString() : '');
                                }
                            }

                            const finalUrl = urlObj.toString().replace(/\/\?=$/, '/').replace(/\?$/, '');
                            window.history.replaceState({}, document.title, finalUrl);
                        } catch (e) {
                            console.error('URL cleanup failed', e);
                        }
                    }
                } catch (e) {
                    console.error('Auto login check failed:', e);
                }
            }

            const token = localStorage.getItem('token');
            if (!token) {
                setInitialized(true);
                return;
            }

            try {
                const response = await api.get('/auth/me');
                if (response.data.success) {
                    setUser(response.data.data);
                } else {
                    setUser(null);
                }
            } catch (error: any) {
                console.error('Auth check failed:', error);

                // Only wipe tokens if it's explicitly explicitly unauthorized
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user_data');
                    setUser(null);
                }
            } finally {
                setInitialized(true);
            }
        };

        checkAuth();
    }, [setUser, setInitialized, isNative]);

    // Native Sync & Listener Effect
    useEffect(() => {
        if (!isNative || !initialized || !isAuthenticated || !user) return;

        const syncMobileData = async () => {
            try {
                const { registerPlugin } = await import('@capacitor/core');
                const AIAssistant = registerPlugin<any>('AIAssistant');
                
                const token = localStorage.getItem('token');
                const baseUrl = (api.defaults.baseURL || window.location.origin).replace(/\/$/, "");
                const isStaff = user.role === 'staff' || user.role === 'company_admin' || user.role === 'super_admin';

                // Request permissions to ensure CallReceiver can work
                try {
                    await AIAssistant.requestPermissions();
                } catch (e) {
                    console.warn('Permission request failed:', e);
                }

                await AIAssistant.syncStaffData({
                    token: token || '',
                    baseUrl: baseUrl,
                    isStaff: isStaff
                });
                console.log('Global Mobile AI Assistant synced');
            } catch (e) {
                console.warn('Global Mobile sync failed:', e);
            }
        };

        syncMobileData();
        
        // Listen for deep links in Capacitor App
        if (isNative) {
            const listener = CapApp.addListener('appUrlOpen', async (data) => {
                const url = data.url;
                if (url.includes('code=')) {
                    try {
                        const urlObj = new URL(url);
                        const code = urlObj.searchParams.get('code');
                        if (code) {
                            setInitialized(false);
                            const res = await api.post('/companies/check-code', { code });
                            if (res.data?.success && res.data?.data?.token) {
                                localStorage.setItem('token', res.data.data.token);
                                const meRes = await api.get('/auth/me');
                                if (meRes.data.success) {
                                    useAuthStore.getState().login(meRes.data.data, res.data.data.token);
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Deep link login failed:', e);
                    } finally {
                        setInitialized(true);
                    }
                }
            });
            
            // App resume (foregrounding) event
            const stateListener = CapApp.addListener('appStateChange', async (state) => {
                if (state.isActive) {
                    try {
                        const { registerPlugin } = await import('@capacitor/core');
                        const AIAssistant = registerPlugin<any>('AIAssistant');
                        const { result } = await AIAssistant.getLastResult();
                        
                        if (result) {
                            try {
                                const parsed = JSON.parse(result);
                                if (parsed.success && parsed.data) {
                                    if (parsed.data.autoCreated) {
                                        alert('✅ Arka plan araması analiz edildi ve randevu başarıyla oluşturuldu!\n\nServis: ' + parsed.data.result?.matchedService?.name + ' - ' + parsed.data.result?.appDate);
                                        // Trigger a reload of appointments
                                        window.dispatchEvent(new Event('refresh_appointments'));
                                    } else {
                                        // Sessizce özel pop-up'ı (Modal) açalım, native JS Alert çıkartmayalım
                                        window.dispatchEvent(new CustomEvent('ai_manual_approve', { 
                                            detail: { extracted: parsed.data.extracted, transcription: parsed.data.transcription } 
                                        }));
                                    }
                                } else if (parsed.success === false) {
                                    alert('⚠️ Yapay Zeka Hatası:\n\n' + (parsed.error || 'Bilinmeyen Hata'));
                                }
                            } catch (e) {
                                console.error('Error parsing global AI result', e);
                            }
                        }
                    } catch (e) {
                        console.error('StateListener AI Result Error:', e);
                    }
                }
            });

            return () => {
                listener.then(l => l.remove());
                stateListener.then(l => l.remove());
            };
        }
    }, [isNative, initialized, isAuthenticated, user]);

    // Uygulama açıkken "ai_manual_approve" sinyali yakalamak için hook
    useEffect(() => {
        const handleManualApprove = (e: any) => {
            const data = e.detail;
            setExtractedInfo({ ...data.extracted, transcription: data.transcription });
            setIsModalOpen(true);
        };
        window.addEventListener('ai_manual_approve', handleManualApprove);
        return () => window.removeEventListener('ai_manual_approve', handleManualApprove);
    }, []);

    if (!initialized) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-pink-100 border-t-pink-600 rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-500 font-bold tracking-widest uppercase text-[10px]">Oturum Kontrol Ediliyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen pb-40">
            {/* Siyah panel başarıyla temizlendi */}
            
            {isModalOpen && extractedInfo && (
                <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-br from-pink-600 to-purple-700 p-5 shrink-0">
                            <h3 className="text-xl font-bold font-sans text-white flex items-center gap-2">
                                <span className="text-2xl">🤖</span> AI Analiz Sonucu
                            </h3>
                            <p className="text-pink-100 text-sm mt-1 opacity-90 leading-relaxed max-w-sm">
                                Asistan eksik bilgiler yüzünden randevuyu kaydedemedi. Söylenenleri inceleyin.
                            </p>
                        </div>
                        
                        <div className="p-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">🎤 Yapay Zekanın Duyduğu:</label>
                                <p className="text-[15px] font-medium text-gray-800 bg-gray-50/80 p-4 rounded-xl border border-gray-100 leading-relaxed shadow-sm italic">
                                    "{extractedInfo.transcription || 'Bilinmiyor'}"
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 rounded-2xl border border-blue-100/50 shadow-sm relative overflow-hidden group hover:from-blue-100 transition-colors">
                                    <div className="absolute top-0 right-0 p-3 opacity-20 text-3xl transition-transform">📅</div>
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-blue-800/70 mb-1 relative z-10">Tarih</label>
                                    <div className="text-sm font-bold text-blue-900 relative z-10">{extractedInfo.date || '—'}</div>
                                </div>
                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-2xl border border-indigo-100/50 shadow-sm relative overflow-hidden group hover:from-indigo-100 transition-colors">
                                    <div className="absolute top-0 right-0 p-3 opacity-20 text-3xl transition-transform">🕒</div>
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-indigo-800/70 mb-1 relative z-10">Saat</label>
                                    <div className="text-sm font-bold text-indigo-900 relative z-10">{extractedInfo.time || '—'}</div>
                                </div>
                                <div className="col-span-2 bg-gradient-to-br from-pink-50 to-rose-50 p-4 rounded-2xl border border-pink-100/50 shadow-sm relative overflow-hidden group hover:from-pink-100 transition-colors">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl transition-transform">✂️</div>
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-pink-800/70 mb-1 relative z-10">Hizmet</label>
                                    <div className="text-base font-bold text-pink-900 relative z-10">{extractedInfo.serviceName || '—'}</div>
                                </div>
                                <div className="col-span-2 bg-gradient-to-br from-purple-50 to-fuchsia-50 p-4 rounded-2xl border border-purple-100/50 shadow-sm relative overflow-hidden group hover:from-purple-100 transition-colors">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl transition-transform">👤</div>
                                    <label className="block text-[10px] uppercase tracking-wider font-bold text-purple-800/70 mb-1 relative z-10">Müşteri/İsim</label>
                                    <div className="text-lg font-bold text-purple-900 relative z-10">{extractedInfo.customerName || 'Misafir (Söylenmedi)'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-white border-t border-gray-100 flex flex-col gap-3 shrink-0">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    window.location.hash = '#/appointments';
                                }}
                                className="w-full py-4 text-[15px] font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-pink-500/30 flex justify-center items-center gap-2"
                            >
                                <span>Randevu Takvimine Git</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </button>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="w-full py-3 text-[14px] font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <Router {...routerProps}>
                <Routes>
                    {/* Public Routes */}
                    <Route
                        path="/"
                        element={
                            isAuthenticated
                                ? (user?.role === 'customer' ? <CustomerHome /> : <Navigate to="/dashboard" replace />)
                                : (isNative ? <CustomerHome /> : <Navigate to="/web" replace />)
                        }
                    />
                    <Route
                        path="/app"
                        element={isAuthenticated ? (user?.role === 'customer' ? <CustomerHome /> : <Navigate to="/dashboard" replace />) : <CustomerHome />}
                    />
                    <Route
                        path="/web"
                        element={isAuthenticated ? (user?.role === 'customer' ? <CustomerHome /> : <Navigate to="/dashboard" replace />) : <LandingPage />}
                    />
                    <Route path="/book/:id" element={<BookingPage />} />
                    <Route path="/my-appointments" element={<MyAppointments />} />
                    <Route path="/my-notifications" element={<MyNotifications />} />
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
                    <Route path="/customer-login" element={<CustomerLogin />} />
                    <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
                    <Route path="/board" element={<SalonBoard />} />
                    <Route path="/company-panel" element={<CompanyPanel />} />
                    <Route path="/main-management" element={<MainCompanyPanel />} />
                    <Route path="/main-reports" element={<MainCompanyReports />} />
                    <Route path="/main-reports/:code" element={<MainCompanyReports />} />
                    <Route path="/salon-generator" element={<SalonDataGenerator />} />
                    <Route path="/setup-staff/:id" element={<SetupStaff />} />
                    <Route path="/set-password" element={<SetPassword />} />
                    <Route path="/set-password/:code/:email" element={<SetPassword />} />
                    <Route path="/staff-panel" element={<StaffPanel />} />


                    {/* Protected Routes */}
                    {isAuthenticated ? (
                        <>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/companies" element={<CompanyList />} />
                            <Route path="/companies/new" element={<CompanyForm />} />
                            <Route path="/companies/:id" element={<CompanyDetail />} />
                            <Route path="/companies/:id/edit" element={<CompanyForm />} />
                            <Route path="/services" element={<ServiceManagement />} />
                            <Route path="/appointments" element={<AppointmentManagement />} />
                            <Route path="/sms-settings" element={<SmsSettings />} />
                            <Route path="/ai-admin" element={<AIAdminPanel />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </>
                    ) : (
                        <>
                            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
                            <Route path="/services" element={<Navigate to="/login" replace />} />
                            <Route path="/appointments" element={<Navigate to="/login" replace />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </>
                    )}
                </Routes>
            </Router>
        </div>
    );
}

export default App;
