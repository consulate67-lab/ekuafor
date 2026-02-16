import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import BookingPage from './pages/BookingPage';

function App() {
    const { isAuthenticated, initialized, setUser, setInitialized } = useAuthStore();

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
            <div className="fixed top-0 right-0 z-[9999] bg-pink-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg opacity-80 hover:opacity-100 pointer-events-none select-none shadow-md">
                v1.17
            </div>
            <Router basename="/ekuafor">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<CustomerHome />} />
                    <Route path="/book/:id" element={<BookingPage />} />
                    <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
                    <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

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
