/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import type { Ctx } from './index';

export function DeptTab({ ctx }: { ctx: Ctx }) {
    const { departments, staffBoards, setShowDeptModal, handleDeleteDepartment } = ctx;
    return (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowDeptModal(true)}
                                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                            >
                                + Yeni Departman Ekle
                            </button>

                            {departments.length === 0 ? (
                                <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                                    <span className="text-4xl mb-3 block">🏢</span>
                                    <p className="text-slate-400 font-bold">Henüz departman tanımlanmadı</p>
                                    <p className="text-slate-300 text-xs mt-1">İlk departmanınızı oluşturun</p>
                                </div>
                            ) : (
                                departments.map(dept => (
                                    <div key={dept.id} className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/20 flex items-center justify-between">
                                        <div>
                                            <p className="font-black text-slate-900 text-lg">{dept.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {staffBoards.filter(s => s.department_id === dept.id).length} personel
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDepartment(dept.id)}
                                            className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
    );
}

export function StaffTab({ ctx }: { ctx: Ctx }) {
    const { staffBoards, setSelectedStaffId, setStaffForm, setShowStaffModal, handleDeleteStaff, copyText, copiedField, qrApiUrl, handlePhotoSelection } = ctx;
    return (
                        <div className="space-y-4">
                            <button
                                onClick={() => {
                                    setSelectedStaffId(null);
                                    setStaffForm({ first_name: '', last_name: '', gender: 'erkek', department_id: '', photo: null, quantity: '', unit: '', email: '', phone: '', password: '', commission_rate: '' });
                                    setShowStaffModal(true);
                                }}
                                className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-base tracking-wide shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                            >
                                + Personel Board Kodu Oluştur
                            </button>

                            {staffBoards.length === 0 ? (
                                <div className="bg-white rounded-3xl p-10 text-center shadow-lg shadow-slate-200/20">
                                    <span className="text-4xl mb-3 block">👥</span>
                                    <p className="text-slate-400 font-bold">Henüz personel board kodu yok</p>
                                    <p className="text-slate-300 text-xs mt-1">Çalışanlarınız için kod oluşturun</p>
                                </div>
                            ) : (
                                staffBoards.map(staff => (
                                    <div key={staff.id} className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/20 relative">
                                        <div className="absolute top-6 right-6 flex gap-2 z-10">
                                            <button
                                                onClick={() => {
                                                    setSelectedStaffId(staff.id);
                                                    setStaffForm({
                                                        first_name: staff.first_name,
                                                        last_name: staff.last_name,
                                                        gender: staff.gender,
                                                        department_id: staff.department_id ? String(staff.department_id) : '',
                                                        photo: staff.photo || null,
                                                        quantity: staff.quantity || '',
                                                        unit: staff.unit || '',
                                                        email: staff.email || '',
                                                        phone: staff.phone || '',
                                                        password: '',
                                                        commission_rate: staff.commission_rate || ''
                                                    });
                                                    setShowStaffModal(true);
                                                }}
                                                className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-all shadow-sm"
                                                title="Personeli Düzenle"
                                            >
                                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStaff(staff.id)}
                                                className="w-9 h-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all shadow-sm"
                                                title="Personeli Sil"
                                            >
                                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative group/photo flex-shrink-0">
                                                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                                                        {staff.photo ? (
                                                            <img src={staff.photo} alt={staff.first_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-2xl">👤</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handlePhotoSelection(false, staff.id)}
                                                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-indigo-700 transition-all border-2 border-white"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-slate-900 text-xl truncate">{staff.first_name} {staff.last_name}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${staff.gender === 'erkek'
                                                            ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                                            : 'bg-pink-50 text-pink-600 border border-pink-100'
                                                            }`}>
                                                            {staff.gender === 'erkek' ? '♂ Erkek' : '♀ Kadın'}
                                                        </span>
                                                        {staff.department_name && (
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-slate-200">
                                                                🏢 {staff.department_name}
                                                            </span>
                                                        )}
                                                        {staff.email && (
                                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1">
                                                                📧 {staff.email}
                                                            </span>
                                                        )}
                                                        {staff.phone && (
                                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                                                📞 {staff.phone}
                                                            </span>
                                                        )}
                                                        {staff.quantity && staff.unit && (
                                                            <span className="px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-violet-100 flex items-center gap-1">
                                                                ⚖️ {staff.quantity} {staff.unit}
                                                            </span>
                                                        )}
                                                        {staff.commission_rate !== null && staff.commission_rate !== undefined && (
                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-1">
                                                                💰 %{staff.commission_rate} Prim
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* QR Code Section */}
                                        <div className="mt-6 pt-6 border-t border-slate-50">
                                            <div className="bg-slate-50 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6">
                                                <div className="bg-white border-4 border-white shadow-xl shadow-slate-200/50 rounded-3xl p-4 flex-shrink-0">
                                                    <img
                                                        src={qrApiUrl(staff.board_code, 200)}
                                                        alt={`${staff.first_name} QR`}
                                                        className="w-32 h-32"
                                                    />
                                                </div>
                                                <div className="flex-1 text-center md:text-left">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Personel Giriş Kodu</p>
                                                    <p className="text-3xl font-black text-indigo-600 tracking-[0.2em] font-mono leading-none mb-4">{staff.board_code}</p>
                                                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                                        <button
                                                            onClick={() => copyText(staff.board_code, `staff-${staff.id}`)}
                                                            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-sm ${copiedField === `staff-${staff.id}`
                                                                ? 'bg-emerald-600 text-white'
                                                                : 'bg-slate-900 text-white hover:bg-slate-800'
                                                                }`}
                                                        >
                                                            {copiedField === `staff-${staff.id}` ? '✅ Kopyalandı' : '📋 Kodu Kopyala'}
                                                        </button>
                                                        <button
                                                            onClick={() => window.print()}
                                                            className="px-5 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-slate-50"
                                                        >
                                                            🖨️ Yazdır
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
    );
}

export function DeptModal({ ctx }: { ctx: Ctx }) {
    const { showDeptModal, setShowDeptModal, deptName, setDeptName, handleAddDepartment } = ctx;
    return (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowDeptModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-slate-900 mb-6">Yeni Departman</h2>
                            <input
                                type="text"
                                value={deptName}
                                onChange={e => setDeptName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddDepartment()}
                                placeholder="Departman adı..."
                                className="w-full p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-lg font-bold text-slate-900 outline-none mb-6"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeptModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleAddDepartment}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all"
                                >
                                    Ekle
                                </button>
                            </div>
                        </div>
                    </div>
    );
}

export function StaffModal({ ctx }: { ctx: Ctx }) {
    const { showStaffModal, setShowStaffModal, selectedStaffId, staffForm, setStaffForm, handleCreateStaffBoard, isCreating, departments, handlePhotoSelection, handleUpdateStaffPhoto } = ctx;
    return (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowStaffModal(false)}>
                        <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-8 pb-10 shadow-2xl" onClick={e => e.stopPropagation()}
                            style={{ animation: 'slideUp 0.3s ease-out' }}>
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
                            <h2 className="text-2xl font-black text-slate-900 mb-6">{selectedStaffId ? 'Personeli Düzenle' : 'Personel Board Kodu Oluştur'}</h2>

                            <div className="flex flex-col items-center mb-8">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                                        {staffForm.photo ? (
                                            <img src={staffForm.photo || undefined} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-center">
                                                <span className="text-4xl block mb-1">📷</span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Resim Seç</span>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        onClick={() => handlePhotoSelection(true)}
                                        className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/5 transition-all rounded-full"
                                    >
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">İsim</label>
                                    <input
                                        type="text"
                                        value={staffForm.first_name}
                                        onChange={e => setStaffForm(p => ({ ...p, first_name: e.target.value }))}
                                        placeholder="İsim"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Soyisim</label>
                                    <input
                                        type="text"
                                        value={staffForm.last_name}
                                        onChange={e => setStaffForm(p => ({ ...p, last_name: e.target.value }))}
                                        placeholder="Soyisim"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Telefon</label>
                                        <input
                                            type="tel"
                                            value={staffForm.phone}
                                            onChange={e => setStaffForm(p => ({ ...p, phone: e.target.value }))}
                                            onBlur={e => setStaffForm(p => ({ ...p, phone: formatPhoneWithSpaces(e.target.value) }))}
                                            placeholder="5XX XXX XX XX"
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Email</label>
                                        <input
                                            type="email"
                                            value={staffForm.email}
                                            onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))}
                                            placeholder="eposta@adres.com"
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Şifre {selectedStaffId && '(Değiştirmek istemiyorsanız boş bırakın)'}</label>
                                    <input
                                        type="password"
                                        value={staffForm.password}
                                        onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))}
                                        placeholder="••••••"
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Cinsiyet</label>
                                    <div className="flex gap-3">
                                        {['erkek', 'kadın'].map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setStaffForm(p => ({ ...p, gender: g }))}
                                                className={`flex-1 py-4 rounded-2xl text-base font-black transition-all ${staffForm.gender === g
                                                    ? g === 'erkek'
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                        : 'bg-pink-600 text-white shadow-lg shadow-pink-500/30'
                                                    : 'bg-slate-100 text-slate-400'
                                                    }`}
                                            >
                                                {g === 'erkek' ? '♂ Erkek' : '♀ Kadın'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Departman</label>
                                    <select
                                        value={staffForm.department_id}
                                        onChange={e => setStaffForm(p => ({ ...p, department_id: e.target.value }))}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none appearance-none"
                                    >
                                        <option value="">Departman seçin...</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">İşlem Miktarı</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={staffForm.quantity}
                                            onChange={e => setStaffForm(p => ({ ...p, quantity: e.target.value }))}
                                            placeholder="Opsiyonel"
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-2">Birim</label>
                                        <select
                                            value={staffForm.unit}
                                            onChange={e => setStaffForm(p => ({ ...p, unit: e.target.value }))}
                                            className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none appearance-none"
                                        >
                                            <option value="">Seçiniz</option>
                                            <option value="kişi">Kişi</option>
                                            <option value="seans">Seans</option>
                                            <option value="saat">Saat</option>
                                            <option value="adet">Adet</option>
                                            <option value="müşteri">Müşteri</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 ml-2">Prim Oranı (%)</label>
                                        <input
                                            type="number"
                                            value={staffForm.commission_rate}
                                            onChange={e => setStaffForm(p => ({ ...p, commission_rate: e.target.value }))}
                                            placeholder="Örn: 30"
                                            className="w-full p-4 bg-indigo-50/50 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 text-base font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-end pb-4">
                                        <p className="text-[9px] font-bold text-slate-400 leading-tight">Boş bırakılırsa firma varsayılanı kullanılır.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowStaffModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-base active:scale-95 transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleCreateStaffBoard}
                                    disabled={isCreating}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isCreating ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            {selectedStaffId ? 'Güncelleniyor...' : 'Oluşturuluyor...'}
                                        </>
                                    ) : (selectedStaffId ? 'Güncelle' : 'Oluştur')}
                                </button>
                            </div>
                        </div>
                    </div>
    );
}
