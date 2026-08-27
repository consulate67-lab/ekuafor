/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import type { Ctx } from './index';

export function ProfileTab({ ctx }: { ctx: Ctx }) {
    const { company, setCompany, loading, handleUpdateCompany, aiRules, setAiRules, geoProvinces, geoDistricts, geoNeighborhoods, fetchDistricts, fetchNeighborhoods, departments } = ctx;
    return (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Firma Tanıtım Bilgileri</h2>

                                <div className="space-y-4">
                                    {/* Firma Logosu / Fotoğrafı */}
                                    <div className="flex flex-col items-center mb-8">
                                        <div className="relative group/logo">
                                            <div className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center shadow-inner">
                                                {company.photo ? (
                                                    <img src={company.photo} alt="Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center">
                                                        <span className="text-4xl block mb-1">🏢</span>
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Logo Yok</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.accept = 'image/*';
                                                    input.onchange = (e: any) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            setCompany({ ...company, photo: event.target?.result as string });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    };
                                                    input.click();
                                                }}
                                                className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-indigo-700 active:scale-95 transition-all border-4 border-white"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Firma Logosu / Fotoğrafı</p>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">İşletme Adı</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                            value={company.name || ''}
                                            onChange={e => setCompany({ ...company, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tanıtım Yazısı (Hakkımızda)</label>
                                        <textarea
                                            rows={4}
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                            value={company.description || ''}
                                            onChange={e => setCompany({ ...company, description: e.target.value })}
                                            placeholder="İşletmenizi müşterilerinize tanıtın..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Vergi Numarası / TCKN</label>
                                            <input
                                                type="text"
                                                maxLength={11}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.tax_number || ''}
                                                onChange={e => setCompany({ ...company, tax_number: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Vergi Dairesi</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.tax_office || ''}
                                                onChange={e => setCompany({ ...company, tax_office: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Telefon</label>
                                            <input
                                                type="tel"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.phone || ''}
                                                onChange={e => setCompany({ ...company, phone: e.target.value })}
                                                onBlur={e => setCompany({ ...company, phone: formatPhoneWithSpaces(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-Posta</label>
                                            <input
                                                type="email"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.email || ''}
                                                onChange={e => setCompany({ ...company, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Açık Adres</label>
                                            <textarea
                                                rows={2}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.address_line || ''}
                                                onChange={e => setCompany({ ...company, address_line: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Adres Devamı (Üst Kat, No vb.)</label>
                                            <textarea
                                                rows={2}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.address_line2 || ''}
                                                onChange={e => setCompany({ ...company, address_line2: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">İl (Şehir)</label>
                                            <select
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none appearance-none"
                                                value={company.city || ''}
                                                onChange={e => {
                                                    const cityName = e.target.value;
                                                    setCompany({ ...company, city: cityName, district: '', neighborhood: '' });
                                                    fetchDistricts(cityName);
                                                }}
                                            >
                                                <option value="">Seçiniz</option>
                                                {geoProvinces.map(p => (
                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">İlçe</label>
                                            <select
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none appearance-none"
                                                value={company.district || ''}
                                                onChange={e => {
                                                    const districtName = e.target.value;
                                                    const dist = geoDistricts.find(d => d.name === districtName);
                                                    setCompany({ ...company, district: districtName, neighborhood: '' });
                                                    if (dist) fetchNeighborhoods(company.city, dist.id);
                                                }}
                                                disabled={!company.city}
                                            >
                                                <option value="">Seçiniz</option>
                                                {geoDistricts.map(d => (
                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Mahalle</label>
                                            <select
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 outline-none appearance-none"
                                                value={company.neighborhood || ''}
                                                onChange={e => setCompany({ ...company, neighborhood: e.target.value })}
                                                disabled={!company.district}
                                            >
                                                <option value="">Seçiniz</option>
                                                {geoNeighborhoods.map(n => (
                                                    <option key={n.id} value={n.name}>{n.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Bina No</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.building_number || ''}
                                                onChange={e => setCompany({ ...company, building_number: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kapı No</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.door_number || ''}
                                                onChange={e => setCompany({ ...company, door_number: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Posta Kodu</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.postal_code || ''}
                                                onChange={e => setCompany({ ...company, postal_code: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">NACE Kodu</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.nace_code || ''}
                                                onChange={e => setCompany({ ...company, nace_code: e.target.value })}
                                                placeholder="Örn: 96.02"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fax Numarası</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.fax_number || ''}
                                                onChange={e => setCompany({ ...company, fax_number: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Banka Adı</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.bank_name || ''}
                                                onChange={e => setCompany({ ...company, bank_name: e.target.value })}
                                                placeholder="Örn: Garanti BBVA"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">IBAN Numarası</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.bank_iban || ''}
                                                onChange={e => setCompany({ ...company, bank_iban: e.target.value })}
                                                placeholder="TR00..."
                                            />
                                        </div>
                                    </div>

                                    {/* Terminoloji Ayarları */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Terminoloji</label>
                                        <p className="text-xs text-slate-400 mb-4 ml-1">İşletmenize uygun adlandırma yapın. Bu isimler müşterilerinize gösterilecektir.</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Personel Adı</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 text-sm"
                                                    placeholder="Personel"
                                                    value={company.staff_label || ''}
                                                    onChange={e => setCompany({ ...company, staff_label: e.target.value })}
                                                />
                                                <p className="text-[8px] text-slate-300 mt-1 ml-1">Örn: Kuaför, Doktor, Teknisyen, Usta</p>
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Hizmet Adı</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 text-sm"
                                                    placeholder="Hizmet"
                                                    value={company.service_label || ''}
                                                    onChange={e => setCompany({ ...company, service_label: e.target.value })}
                                                />
                                                <p className="text-[8px] text-slate-300 mt-1 ml-1">Örn: Tedavi, Yıkama, İşlem, Kurs</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hizmet Verilenler - Yeni Eklendi */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Hizmet Verilen Cinsiyetler</label>
                                        <p className="text-xs text-slate-400 mb-4 ml-1">Hangi kitleye hizmet verdiğinizi seçin. Bu seçim müşteri arama sonuçlarını etkiler.</p>
                                        <div className="flex gap-2">
                                            {['Erkek', 'Kadın', 'Çocuk'].map(g => {
                                                const isActive = (company.genders || []).includes(g);
                                                return (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = company.genders || [];
                                                            const next = current.includes(g)
                                                                ? current.filter((item: string) => item !== g)
                                                                : [...current, g];
                                                            setCompany({ ...company, genders: next });
                                                        }}
                                                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border-2 text-xs ${isActive
                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                            }`}
                                                    >
                                                        {g}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Mesai Saatleri Bilgileri - Yeni Eklendi */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mesai ve Randevu Ayarları</label>
                                        <p className="text-xs text-slate-400 mb-4 ml-1">İşletmenizin çalışma saatlerini ve randevu sıklığını belirleyin.</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Başlangıç</label>
                                                <input
                                                    type="time"
                                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 text-sm"
                                                    value={company.work_start_time || '09:00'}
                                                    onChange={e => setCompany({ ...company, work_start_time: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Bitiş</label>
                                                <input
                                                    type="time"
                                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 text-sm"
                                                    value={company.work_end_time || '20:00'}
                                                    onChange={e => setCompany({ ...company, work_end_time: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Aralık (Dk)</label>
                                                <select
                                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 text-sm appearance-none"
                                                    value={company.slot_interval || 30}
                                                    onChange={e => setCompany({ ...company, slot_interval: Number(e.target.value) })}
                                                >
                                                    {[15, 20, 30, 45, 60, 90, 120].map(m => (
                                                        <option key={m} value={m}>{m} dk</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SMS Bildirim Ayarı - Yeni Eklendi */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                            <div className="flex-1">
                                                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                    <span>💬</span> SMS Bildirimleri
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Müşterilere otomatik randevu SMS'i gönderilsin mi?</p>
                                            </div>
                                            <button
                                                onClick={() => setCompany({ ...company, sms_enabled: !company.sms_enabled })}
                                                className={`w-14 h-8 rounded-full transition-all relative ${company.sms_enabled !== false ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${company.sms_enabled !== false ? 'right-1' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-slate-300 font-bold ml-1 mt-2">ℹ️ SMS gönderimi için SMS Sunucu Ayarlarınızın yapılmış olması gerekmektedir.</p>
                                    </div>

                                    {/* AI Görüşme Asistanı Ayarı - Yeni Eklendi */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
                                            <div className="flex-1">
                                                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                    <span>🎙️</span> Sesli Görüşme Asistanı (AI)
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Telefon görüşmelerinde randevu yakalama aktif olsun mu?</p>
                                            </div>
                                            <button
                                                onClick={() => setCompany({ ...company, ai_enabled: !company.ai_enabled })}
                                                className={`w-14 h-8 rounded-full transition-all relative ${company.ai_enabled !== false ? 'bg-purple-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${company.ai_enabled !== false ? 'right-1' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        {company.ai_enabled !== false && (
                                            <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100 space-y-3">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Zeka Modeli Kuralları (Prompts)</label>
                                                <textarea
                                                    value={aiRules}
                                                    onChange={e => setAiRules(e.target.value)}
                                                    rows={4}
                                                    placeholder="Örn: 19:00'dan sonrasını alama..."
                                                    className="w-full p-4 bg-slate-50 rounded-xl border-none text-xs font-medium text-slate-700 outline-none resize-none"
                                                />
                                                <p className="text-[8px] text-slate-300 italic">Personelin Android uygulaması üzerinden "Otomatik Dinleme" iznini vermiş olması gerekir.</p>
                                                <button 
                                                    onClick={() => {
                                                        const detail = {
                                                            success: true,
                                                            data: {
                                                                autoCreated: true,
                                                                transcription: "Merhaba, yarın saat 14:00 için bir saç kesimi randevusu almak istiyordum. İsmim Ahmet Yılmaz.",
                                                                extractedInfo: {
                                                                    customerName: "Ahmet Yılmaz",
                                                                    serviceName: "Saç Kesimi",
                                                                    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                                                                    time: "14:00",
                                                                    note: "Telefonla otomatik alındı"
                                                                }
                                                            }
                                                        };
                                                        const event = new CustomEvent('ai_appointment_detected', { detail });
                                                        window.dispatchEvent(event);
                                                    }}
                                                    className="w-full py-2.5 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:from-purple-100 hover:to-indigo-100 transition-all border border-purple-100 mt-2 flex items-center justify-center gap-2"
                                                >
                                                    <span>🚀</span> Akış Simülasyonunu Başlat
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Randevu Akış Sırası Ayarı */}
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Randevu Akış Sırası</label>
                                        <p className="text-xs text-slate-400 mb-4 ml-1">Adımları yukarı/aşağı taşıyarak müşteri randevu akışını belirleyin.</p>

                                        {(() => {
                                            // Decode 4-char flow code to step array
                                            const flow = company.booking_flow || 'SPDT';
                                            const codeToKey: Record<string, string> = { 'S': 'service', 'P': 'staff', 'D': 'date', 'T': 'time' };
                                            const keyToCode: Record<string, string> = { 'service': 'S', 'staff': 'P', 'date': 'D', 'time': 'T' };

                                            // Parse flow code (fallback to SPDT for old 3-char codes)
                                            let steps: string[];
                                            if (flow.length === 4) {
                                                steps = flow.split('').map((c: string) => codeToKey[c] || 'service');
                                            } else {
                                                // Legacy 3-char codes
                                                const legacy: Record<string, string[]> = {
                                                    'SHP': ['service', 'staff', 'date', 'time'],
                                                    'SDP': ['service', 'date', 'staff', 'time'],
                                                    'SDT': ['service', 'date', 'time', 'staff'],
                                                };
                                                steps = legacy[flow] || ['service', 'staff', 'date', 'time'];
                                            }

                                            const stepLabels: Record<string, { icon: string; label: string; color: string }> = {
                                                service: { icon: '✂️', label: (company.service_label || 'Hizmet') + ' Seçimi', color: 'border-rose-200 bg-rose-50' },
                                                staff: { icon: '👤', label: (company.staff_label || 'Personel') + ' Seçimi', color: 'border-violet-200 bg-violet-50' },
                                                date: { icon: '📅', label: 'Tarih Seçimi', color: 'border-emerald-200 bg-emerald-50' },
                                                time: { icon: '🕐', label: 'Saat Seçimi', color: 'border-amber-200 bg-amber-50' },
                                            };

                                            const stepsToCode = (s: string[]) => s.map(k => keyToCode[k]).join('');

                                            // Constraint: Time must come after both Service and Date
                                            const isValidOrder = (s: string[]) => {
                                                const ti = s.indexOf('time');
                                                const si = s.indexOf('service');
                                                const di = s.indexOf('date');
                                                return si < ti && di < ti;
                                            };

                                            const moveStep = (index: number, direction: 'up' | 'down') => {
                                                const newSteps = [...steps];
                                                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                                                if (targetIndex < 0 || targetIndex >= newSteps.length) return;
                                                [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
                                                if (!isValidOrder(newSteps)) return;
                                                setCompany({ ...company, booking_flow: stepsToCode(newSteps) });
                                            };

                                            const canMove = (index: number, direction: 'up' | 'down') => {
                                                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                                                if (targetIndex < 0 || targetIndex >= steps.length) return false;
                                                const newSteps = [...steps];
                                                [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
                                                return isValidOrder(newSteps);
                                            };

                                            return (
                                                <div className="space-y-2">
                                                    {steps.map((stepKey, index) => {
                                                        const info = stepLabels[stepKey];
                                                        const stepNumber = index + 1;
                                                        return (
                                                            <div key={stepKey} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${info.color}`}>
                                                                <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm">{stepNumber}</div>
                                                                <span className="text-base">{info.icon}</span>
                                                                <span className="font-bold text-sm text-slate-700">{info.label}</span>
                                                                <div className="ml-auto flex gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveStep(index, 'up')}
                                                                        disabled={!canMove(index, 'up')}
                                                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${canMove(index, 'up') ? 'bg-white shadow-sm text-slate-600 hover:bg-slate-100 active:scale-90' : 'bg-transparent text-slate-200 cursor-not-allowed'}`}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => moveStep(index, 'down')}
                                                                        disabled={!canMove(index, 'down')}
                                                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${canMove(index, 'down') ? 'bg-white shadow-sm text-slate-600 hover:bg-slate-100 active:scale-90' : 'bg-transparent text-slate-200 cursor-not-allowed'}`}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Fixed Last Step */}
                                                    <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">5</div>
                                                        <span className="text-base">📝</span>
                                                        <span className="font-bold text-sm text-slate-400">Müşteri Bilgileri</span>
                                                        <span className="ml-auto text-[8px] font-black text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full">SABİT</span>
                                                    </div>

                                                    <p className="text-[9px] text-slate-300 font-bold ml-1 mt-1">ℹ️ Saat seçimi her zaman Hizmet ve Tarihten sonra olmalıdır.</p>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="pt-6">
                                        <button
                                            onClick={handleUpdateCompany}
                                            disabled={loading}
                                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-300 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                                <h3 className="text-lg font-black mb-2 italic">Önizleme</h3>
                                <p className="text-indigo-200 text-xs font-bold leading-relaxed mb-6">Müşterileriniz haritada veya listede sizi bu bilgilerle görecekler.</p>
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl overflow-hidden shrink-0">
                                            {company.photo ? (
                                                <img src={company.photo} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                '🏢'
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-sm">{company.name}</p>
                                            <p className="text-[10px] text-indigo-300 font-bold uppercase">{company.district || company.city || 'Şehir Belirtilmemiş'}</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.open(`${window.location.origin}/#/book/${company.id}`, '_blank')}
                                    className="mt-6 w-full py-4 bg-white text-indigo-900 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all"
                                >
                                    Müşteri Sayfasını Görüntüle
                                </button>
                            </div>
                        </div>
    );
}

export function IntegrationTab({ ctx }: { ctx: Ctx }) {
    const { company, setCompany, loading, handleUpdateCompany } = ctx;
    return (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">QNB e-Finans Entegrasyonu</h2>
                                <p className="text-xs text-slate-400 mb-6">e-Fatura ve e-Arşiv gönderimi için API bilgilerini buradan yönetebilirsiniz.</p>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kullanıcı Adı</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.qnb_username || ''}
                                                onChange={e => setCompany({ ...company, qnb_username: e.target.value })}
                                                placeholder="e-Finans kullanıcı adı"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Şifre</label>
                                            <input
                                                type="password"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.qnb_password || ''}
                                                onChange={e => setCompany({ ...company, qnb_password: e.target.value })}
                                                placeholder="e-Finans şifresi"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Entegrasyon VKN/TCKN</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900"
                                                value={company.qnb_vkn || company.tax_number || ''}
                                                onChange={e => setCompany({ ...company, qnb_vkn: e.target.value })}
                                                placeholder="Genellikle firma VKN'si"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fatura Öneki (Prefix)</label>
                                            <input
                                                type="text"
                                                maxLength={3}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 uppercase"
                                                value={company.invoice_prefix || 'GIB'}
                                                onChange={e => setCompany({ ...company, invoice_prefix: e.target.value.toUpperCase() })}
                                            />
                                            <p className="text-[8px] text-slate-300 mt-1 ml-1">Örn: GIB, ABC, EFA</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Gelen Kutu Etiketi (UBL PK)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 text-xs"
                                                value={company.ubl_incoming_alias || ''}
                                                onChange={e => setCompany({ ...company, ubl_incoming_alias: e.target.value })}
                                                placeholder="urn:mail:defaultpk@..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Giden Kutu Etiketi (UBL GB)</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 text-xs"
                                                value={company.ubl_outgoing_alias || ''}
                                                onChange={e => setCompany({ ...company, ubl_outgoing_alias: e.target.value })}
                                                placeholder="urn:mail:defaultgb@..."
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-700">Test Modu</h4>
                                            <p className="text-[10px] text-slate-400">Aktif olduğunda işlemler test ortamına (test web servislerine) gönderilir.</p>
                                        </div>
                                        <button
                                            onClick={() => setCompany({ ...company, efatura_test_mode: !company.efatura_test_mode })}
                                            className={`w-14 h-8 rounded-full transition-all relative ${company.efatura_test_mode !== false ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${company.efatura_test_mode !== false ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <div className="pt-6">
                                        <button
                                            onClick={handleUpdateCompany}
                                            disabled={loading}
                                            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
                                        >
                                            {loading ? 'Kaydediliyor...' : 'Entegrasyon Bilgilerini Kaydet'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                                <h3 className="text-lg font-black mb-2 italic">UBL-TR Bilgilendirme</h3>
                                <p className="text-slate-400 text-xs font-bold leading-relaxed">
                                    Girdiğiniz bilgiler QNB e-Finans SOAP servisleri üzerinden UBL 2.1 formatında fatura üretmek için kullanılır.
                                    Hatalı kullanıcı adı veya şifre girişinde entegratör gönderimlerinde hata alırsınız.
                                </p>
                            </div>
                        </div>
    );
}
