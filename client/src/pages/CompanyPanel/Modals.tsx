/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import type { Ctx } from './index';

export function AIResultModal({ ctx }: { ctx: Ctx }) {
    const { showAIResultModal, setShowAIResultModal, lastAIResult } = ctx;
    // lastAIResult null ise modal render etme (TypeError: Cannot read null.autoCreated fix)
    if (!lastAIResult) return null;
    return (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500">
                        <div className={`p-6 ${lastAIResult.autoCreated ? 'bg-emerald-600' : 'bg-indigo-600'} text-white relative`}>
                            <button 
                                onClick={() => setShowAIResultModal(false)}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/10 rounded-full hover:bg-black/20 transition-all font-bold"
                            >
                                ✕
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
                                    {lastAIResult.autoCreated ? '✅' : '🤖'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black">{lastAIResult.autoCreated ? 'Randevu Otomatik Oluşturuldu!' : 'AI Görüşmeyi Analiz Etti'}</h3>
                                    <p className="text-white/80 text-sm font-medium">
                                        {lastAIResult.autoCreated ? 'Görüşme içeriği randevuya dönüştürüldü.' : 'Müşteri talebi algılandı.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {lastAIResult.extractedInfo && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Müşteri</p>
                                        <p className="font-bold text-slate-900">{lastAIResult.extractedInfo.customerName || 'Bilinmeyen'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hizmet</p>
                                        <p className="font-bold text-slate-900">{lastAIResult.extractedInfo.serviceName || 'Belirsiz'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tarih</p>
                                        <p className="font-bold text-slate-900">{lastAIResult.extractedInfo.date || '-'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saat</p>
                                        <p className="font-bold text-slate-900">{lastAIResult.extractedInfo.time || '-'}</p>
                                    </div>
                                </div>
                            )}

                            {lastAIResult.transcription && (
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-slate-600 text-sm line-clamp-3">
                                    "{lastAIResult.transcription}"
                                </div>
                            )}

                            {!lastAIResult.autoCreated && (
                                <div className="flex flex-col gap-2">
                                    <p className="text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-xl border border-amber-100">
                                        ⚠️ Hizmet tam eşleşmediği için otomatik kayıt yapılamadı ancak bilgileri yukarıdaki gibidir.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => setShowAIResultModal(false)}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                            >
                                Anladım
                            </button>
                        </div>
                    </div>
                </div>
    );
}
