import { useEffect } from 'react';
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import MainCompanyPanel from './pages/MainCompanyPanel';
import MainCompanyReports from './pages/MainCompanyReports';
import SalonDataGenerator from './pages/SalonDataGenerator';
import CustomerLogin from './pages/CustomerLogin';
import SetupStaff from './pages/SetupStaff';
import { useAppointmentSync } from './hooks/useAppointmentSync';



function App() {
    const { isAuthenticated, initialized, setUser, setInitialized } = useAuthStore();
    // Global appointment status sync & notifications
    useAppointmentSync();

    // Determine platform-specific router
    const isGithubPages = window.location.hostname.includes('github.io');
    const isNative = Capacitor.isNativePlatform();
    // Use HashRouter for static hosts (GitHub Pages) and Mobile APK to avoid 404s/White pages
    // Use standard BrowserRouter for the actual domain (saloontr.com) for clean URLs
    const Router: any = (isGithubPages || isNative) ? HashRouter : BrowserRouter;
    // BaseName is needed for BrowserRouter if deployed in an environment with base url, but on saloontr.com it's root
    const routerProps = (isGithubPages || isNative) ? {} : { basename: import.meta.env.BASE_URL };

    useEffect(() => {
        const checkAuth = async () => {
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
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setInitialized(true);
            }
        };

        checkAuth();
    }, [setUser, setInitialized]);

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
                                ? <Navigate to="/dashboard" replace />
                                : <CustomerHome />
                        }
                    />
                    <Route
                        path="/app"
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <CustomerHome />}
                    />
                    <Route
                        path="/saloontr-web"
                        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
                    />
                    <Route path="/book/:id" element={<BookingPage />} />
                    <Route path="/my-appointments" element={<MyAppointments />} />
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
                    <Route path="/customer-login" element={isAuthenticated ? <Navigate to="/" replace /> : <CustomerLogin />} />
                    <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
                    <Route path="/board" element={<SalonBoard />} />
                    <Route path="/company-panel" element={<CompanyPanel />} />
                    <Route path="/main-management" element={<MainCompanyPanel />} />
                    <Route path="/main-reports" element={<MainCompanyReports />} />
                    <Route path="/main-reports/:code" element={<MainCompanyReports />} />
                    <Route path="/salon-generator" element={<SalonDataGenerator />} />
                    <Route path="/setup-staff/:id" element={<SetupStaff />} />


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
