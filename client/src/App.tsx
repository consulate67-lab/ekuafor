import { useEffect } from 'react';
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



function App() {
    const { isAuthenticated, initialized, setUser, setInitialized, user } = useAuthStore();
    // Global appointment status sync & notifications
    useAppointmentSync();

    const isNative = Capacitor.isNativePlatform();

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

        // Listen for deep links in Capacitor App
        if (isNative) {
            const listener = CapApp.addListener('appUrlOpen', async (data) => {
                const url = data.url;

                // Example URL: saloncebimde://dashboard?code=ABCD or https://www.saloncebimde.com/dashboard?code=ABCD
                if (url.includes('code=')) {
                    try {
                        const urlObj = new URL(url);
                        const code = urlObj.searchParams.get('code');

                        if (code) {
                            setInitialized(false); // Show loading spinner
                            const res = await api.post('/companies/check-code', { code });
                            if (res.data?.success && res.data?.data?.token) {
                                localStorage.setItem('token', res.data.data.token);
                                // Refresh user session
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

            return () => {
                listener.then(l => l.remove());
            };
        }
    }, [setUser, setInitialized, isNative]);

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
        <div className="relative min-h-screen">
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
