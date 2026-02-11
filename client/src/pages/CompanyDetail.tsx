import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { Company, CompanyEmployee } from '../types';

export default function CompanyDetail() {
    const { id } = useParams();
    const [company, setCompany] = useState<Company | null>(null);
    const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Çalışan ekleme modal/form durumu
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEmployeeUserId, setNewEmployeeUserId] = useState('');
    const [newEmployeeRole, setNewEmployeeRole] = useState<'owner' | 'manager' | 'staff'>('staff');

    useEffect(() => {
        fetchCompanyData();
    }, [id]);

    const fetchCompanyData = async () => {
        try {
            setLoading(true);
            const [companyRes, employeesRes] = await Promise.all([
                api.get(`/companies/${id}`),
                api.get(`/companies/${id}/employees`)
            ]);

            setCompany(companyRes.data.data);
            setEmployees(employeesRes.data.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Veriler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/companies/${id}/employees`, {
                user_id: parseInt(newEmployeeUserId),
                role: newEmployeeRole
            });
            setShowAddForm(false);
            setNewEmployeeUserId('');
            fetchCompanyData(); // Listeyi yenile
        } catch (err: any) {
            alert(err.response?.data?.error || 'Çalışan eklenirken hata oluştu');
        }
    };

    const handleRemoveEmployee = async (employeeId: number) => {
        if (!confirm('Bu çalışanı firmadan çıkarmak istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/companies/${id}/employees/${employeeId}`);
            fetchCompanyData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Çalışan çıkarılırken hata oluştu');
        }
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
    if (!company) return <div className="p-8 text-center">Firma bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div>
                        <Link to="/companies" className="text-primary-600 hover:text-primary-700 text-sm mb-1 inline-block">
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
                </div>

                {/* Sağ Kolon: Çalışan Yönetimi */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold">Çalışanlar ({employees.length})</h2>
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="btn-primary py-1 px-3 text-sm"
                            >
                                {showAddForm ? 'Kapat' : '+ Çalışan Ekle'}
                            </button>
                        </div>

                        {showAddForm && (
                            <form onSubmit={handleAddEmployee} className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                                <h3 className="font-medium mb-3">Yeni Çalışan Ekle</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Kullanıcı ID (Sistemdeki ID)</label>
                                        <input
                                            type="number"
                                            value={newEmployeeUserId}
                                            onChange={(e) => setNewEmployeeUserId(e.target.value)}
                                            className="input-field py-1"
                                            placeholder="Örn: 5"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Rol</label>
                                        <select
                                            value={newEmployeeRole}
                                            onChange={(e) => setNewEmployeeRole(e.target.value as any)}
                                            className="input-field py-1"
                                        >
                                            <option value="staff">Çalışan (Staff)</option>
                                            <option value="manager">Yönetici (Manager)</option>
                                            <option value="owner">Sahip (Owner)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button type="submit" className="btn-primary w-full py-1">Ekle</button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2">Not: Kullanıcı sisteme daha önce kayıt olmuş olmalıdır.</p>
                            </form>
                        )}

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Ad Soyad</th>
                                        <th className="px-4 py-3">Rol</th>
                                        <th className="px-4 py-3">Durum</th>
                                        <th className="px-4 py-3 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {employees.map((emp: any) => (
                                        <tr key={emp.id} className="text-sm">
                                            <td className="px-4 py-3 text-gray-500 font-mono">#{emp.id}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                                                <div className="text-xs text-gray-500">{emp.email}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${emp.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                                    emp.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {emp.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center text-xs text-green-600">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 font-mono"></span>
                                                    Aktif
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => handleRemoveEmployee(emp.id)}
                                                    className="text-red-600 hover:text-red-900 text-xs font-medium"
                                                >
                                                    Kaldır
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {employees.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Henüz çalışan eklenmemiş.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 p-4 bg-primary-50 rounded-lg text-primary-800 text-sm">
                            <p className="font-semibold mb-1">İmplementasyon Notu:</p>
                            <p>Çalışanların tanıtımı sırasında ihtiyaç duyacağınız <strong>ID değeri</strong> tabloda en solda yer alan <code>#ID</code> değeridir. Bu ID randevu eşleştirmelerinde anahtar rol oynayacaktır.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
