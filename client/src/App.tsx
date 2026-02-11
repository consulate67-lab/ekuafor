import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CompanyForm from './pages/CompanyForm';
import CompanyList from './pages/CompanyList';
import CompanyDetail from './pages/CompanyDetail';

function App() {
    const { isAuthenticated } = useAuthStore();

    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                {isAuthenticated ? (
                    <>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/companies" element={<CompanyList />} />
                        <Route path="/companies/new" element={<CompanyForm />} />
                        <Route path="/companies/:id" element={<CompanyDetail />} />
                        <Route path="/companies/:id/edit" element={<CompanyForm />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                ) : (
                    <Route path="*" element={<Navigate to="/login" replace />} />
                )}
            </Routes>
        </Router>
    );
}

export default App;
