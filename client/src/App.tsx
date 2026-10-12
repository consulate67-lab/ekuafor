import { useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from './store/authStore';
import api from './lib/api';
import { useAppointmentSync } from './hooks/useAppointmentSync';
import { FullScreenLoader } from './components/ui';

/**
 * Lazy-loaded page components.
 *
 * Her sayfa ayrı chunk olarak yüklenir — initial bundle'dan çıkar.
 * 1.18 MB → ~400 KB (ana bundle) + lazy sayfalar (~50-150 KB her biri).
 */
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CompanyForm = lazy(() => import('./pages/CompanyForm'));
const CompanyList = lazy(() => import('./pages/CompanyList'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const AppointmentManagement = lazy(() => import('./pages/AppointmentManagement'));
const CustomerHome = lazy(() => import('./pages/customer/CustomerHome'));
const CompanyPage = lazy(() => import('./pages/customer/CompanyPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const SmsSettings = lazy(() => import('./pages/SmsSettings'));
const SalonBoard = lazy(() => import('./pages/SalonBoard'));
const CompanyPanel = lazy(() => import('./pages/CompanyPanel'));
const MyAppointments = lazy(() => import('./pages/MyAppointments'));
const MyNotifications = lazy(() => import('./pages/MyNotifications'));
const MainCompanyPanel = lazy(() => import('./pages/MainCompanyPanel'));
const MainCompanyReports = lazy(() => import('./pages/MainCompanyReports'));
const CustomerLogin = lazy(() => import('./pages/CustomerLogin'));
const SetupStaff = lazy(() => import('./pages/SetupStaff'));
const SetPassword = lazy(() => import('./pages/SetPassword'));
const KvkkPage = lazy(() => import('./pages/KvkkPage'));


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
                            localStorage.setItem('board_key', data.board_key);
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

    // Native deep link login (?code=...)
    useEffect(() => {
        if (!isNative) return;

        const listener = CapApp.addListener('appUrlOpen', async (data) => {
            const url = data.url;
            if (!url.includes('code=')) return;
            try {
                const code = new URL(url).searchParams.get('code');
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
        });

        return () => {
            listener.then(l => l.remove());
        };
    }, [isNative, setInitialized]);

    if (!initialized) {
        return <FullScreenLoader text="Oturum kontrol ediliyor…" />;
    }

    return (
        <div className="relative min-h-screen pb-40">
            <Router {...routerProps}>
                <Suspense fallback={<FullScreenLoader />}>
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
                    <Route path="/firma/:id" element={<CompanyPage />} />
                    <Route path="/book/:id" element={<BookingPage />} />
                    <Route path="/my-appointments" element={<MyAppointments />} />
                    <Route path="/my-notifications" element={<MyNotifications />} />
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
                    <Route path="/customer-login" element={<CustomerLogin />} />
                    <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
                    <Route path="/kvkk" element={<KvkkPage />} />
                    <Route path="/board" element={<SalonBoard />} />
                    <Route path="/company-panel" element={<CompanyPanel />} />
                    <Route path="/main-management" element={<MainCompanyPanel />} />
                    <Route path="/main-reports" element={<MainCompanyReports />} />
                    <Route path="/main-reports/:code" element={<MainCompanyReports />} />
                    <Route path="/setup-staff/:id" element={<SetupStaff />} />
                    <Route path="/set-password" element={<SetPassword />} />
                    <Route path="/set-password/:code/:email" element={<SetPassword />} />

                    {/* Protected Routes */}
                    {isAuthenticated ? (
                        <>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/companies" element={<CompanyList />} />
                            <Route path="/companies/new" element={<CompanyForm />} />
                            <Route path="/companies/:id" element={<CompanyDetail />} />
                            <Route path="/companies/:id/edit" element={<CompanyForm />} />
                            <Route path="/appointments" element={<AppointmentManagement />} />
                            <Route path="/sms-settings" element={<SmsSettings />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </>
                    ) : (
                        <>
                            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
                            <Route path="/appointments" element={<Navigate to="/login" replace />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </>
                    )}
                </Routes>
                </Suspense>
            </Router>
        </div>
    );
}

export default App;
