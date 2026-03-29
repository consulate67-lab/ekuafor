import OpenAI from 'openai';
import fs from 'fs';
import pool from '../config/database';

// Fix for older Node.js versions where 'File' is not global (Required for OpenAI uploads)
if (typeof globalThis.File === 'undefined') {
    const { File, Blob } = require('node:buffer');
    (globalThis as any).File = File;
    (globalThis as any).Blob = Blob;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ExtractionResult {
    customerName?: string | null;
    serviceName?: string | null;
    staffName?: string | null;
    date?: string | null;  // YYYY-MM-DD
    time?: string | null;  // HH:MM 24h
    note?: string | null;
    confidence?: 'high' | 'medium' | 'low' | null;
}

class AIAssistantService {

    /**
     * Transcribes audio using OpenAI Whisper
     */
    async transcribeAudio(audioPath: string): Promise<string> {
        const ext = audioPath.split('.').pop()?.toLowerCase() || 'webm';
        const fileStream = fs.createReadStream(audioPath);
        (fileStream as any).name = `audio.${ext}`;

        try {
            const transcription = await openai.audio.transcriptions.create({
                file: fileStream as any,
                model: 'whisper-1',
                language: 'tr',
                prompt: 'Bu bir Türkçe kuaför salonu telefon görüşmesidir. Konuşmada randevu, hizmet (saç kesimi, boya, manikür, pedikür, fön vb.), tarih ve saat bilgileri olabilir.',
                response_format: 'text',
                temperature: 0.2
            });

            const text = typeof transcription === 'string' ? transcription : (transcription as any).text || '';
            console.log(`[Whisper] (${text.length} chars):`, text.substring(0, 300));
            return text.trim();
        } catch (error: any) {
            console.error('[Whisper] Error:', error.message);
            throw new Error(`Ses analiz edilemedi: ${error.message}`);
        }
    }

    /**
     * Fetch recent successful examples from this company's call logs for few-shot learning
     */
    async fetchFewShotExamples(companyId: number): Promise<string> {
        try {
            const res = await pool.query(`
                SELECT transcription, extracted_info, matched_service_name
                FROM ai_call_logs
                WHERE company_id = $1
                  AND feedback IN ('correct', 'pending')
                  AND was_auto_created = true
                  AND transcription IS NOT NULL
                  AND extracted_info IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 5
            `, [companyId]);

            if (!res.rows.length) return '';

            const examples = res.rows.map((row, i) => {
                const info = row.extracted_info;
                return `Örnek ${i + 1}:
Konuşma: "${(row.transcription || '').substring(0, 200)}"
Çıkarılan: Müşteri="${info?.customerName || 'Misafir'}", Hizmet="${info?.serviceName || row.matched_service_name || '-'}", Tarih="${info?.date || '-'}", Saat="${info?.time || '-'}"`;
            }).join('\n\n');

            return `\nBu firma için geçmiş başarılı randevu tespitleri (referans al):\n${examples}\n`;
        } catch (err) {
            console.warn('[AI] Could not fetch few-shot examples:', (err as any).message);
            return '';
        }
    }

    /**
     * Extracts structured appointment information from conversation text using GPT-4o
     * with company-specific few-shot learning examples
     */
    async extractAppointmentInfo(
        text: string,
        rules?: string,
        companyId?: number
    ): Promise<ExtractionResult | null> {
        if (!text || text.trim().length === 0) return null;

        const today = new Date().toISOString().split('T')[0];
        const todayFormatted = new Date().toLocaleDateString('tr-TR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // Friday calculation for examples
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
        const daysUntilFriday = dayOfWeek <= 5 ? (5 - dayOfWeek) || 7 : 6;
        const nextFriday = new Date(now);
        nextFriday.setDate(now.getDate() + daysUntilFriday);
        const nextFridayStr = nextFriday.toISOString().split('T')[0];

        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Fetch few-shot examples from this company's history
        const fewShotExamples = companyId ? await this.fetchFewShotExamples(companyId) : '';

        const systemPrompt = `Sen bir Türkçe telefon görüşmesi analiz uzmanısın. Kuaför salonunda gerçekleşen konuşmalardan randevu bilgilerini çıkarırsın.

Bugünün tarihi: ${todayFormatted} (${today})
Yarın: ${tomorrowStr}
Bu haftanın Cuma'sı veya en yakın Cuma: ${nextFridayStr}

KRİTİK KURALLAR - SAAT:
• Konuşmada birden fazla saat geçiyorsa → MUTABIK KALINDIĞI SON saati al (berber/salon sahibinin kabul ettiği saat)
• "akşam 5" = 17:00, "akşam 6" = 18:00, "gece 8" = 20:00, "sabah 9" = 09:00
• "öğleden sonra 3" = 15:00, "öğle üzeri" = 12:00
• "4'den sonra" veya "4'ten sonra" = 16:00 (en erken başlangıç olarak al)
• "saat 2" bağlam yoksa salon saatleri için = 14:00
• Sadece saat söylenmişse tarih olarak BUGÜN al: ${today}

KRİTİK KURALLAR - TARİH:
• "bugün", "bu akşam", "bu öğleden sonra" = ${today}
• "yarın" = ${tomorrowStr}
• "cuma" veya "cuma gel" → en yakın gelecekteki Cuma = ${nextFridayStr}
• "önümüzdeki cuma", "gelecek cuma" = ${nextFridayStr}
• "pazartesi", "salı", "çarşamba", "perşembe", "cumartesi", "pazar" → en yakın gelecekteki o gün
• Tarih belirtilmemişse → bugün: ${today}

KRİTİK KURALLAR - HİZMET VE MÜŞTERİ:
• Hizmet söylenmemişse → "saç kesimi" yaz (ASLA null bırakma)
• Müşteri adı söylenmemişse → "Misafir" yaz (ASLA null bırakma)
• Salon sahibi konuşmada "ben" diyorsa o müşteri DEĞİL salon sahibidir

RANDEVU ALGILAMA:
• Belirli bir saat/tarih/gün geçiyorsa = randevu isteği
• "müsait misin", "gelebilir miyim", "randevu alabilir miyim" = randevu isteği
• Sadece genel sohbet ise (ürün fiyatı, yol tarifi vb.) → confidence = "low"${fewShotExamples}`;

        const userPrompt = `${rules ? `Firma hizmetleri:\n${rules}\n\n` : ''}Telefon görüşmesi:
"${text}"

ÖNEMLİ: Hizmet belirtilmemişse "saç kesimi" yaz. Ad belirtilmemişse "Misafir" yaz. Tarih belirtilmemişse "${today}" yaz.

JSON formatında döndür:
{
  "customerName": "Ad veya Misafir",
  "serviceName": "Hizmet adı veya saç kesimi",
  "staffName": null,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "note": "varsa ek not veya null",
  "confidence": "high|medium|low"
}`;

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.1,
                max_tokens: 350
            });

            const content = response.choices[0].message.content;
            if (!content) return null;

            const parsed = JSON.parse(content) as ExtractionResult;

            // Enforce safe defaults
            if (!parsed.customerName || parsed.customerName === 'null') parsed.customerName = 'Misafir';
            if (!parsed.serviceName || parsed.serviceName === 'null') parsed.serviceName = 'saç kesimi';
            if (!parsed.date || parsed.date === 'null' || !parsed.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                parsed.date = today;
            }

            console.log('[GPT-4o] Extracted:', JSON.stringify(parsed));
            return parsed;

        } catch (error: any) {
            console.error('[GPT-4o] Extraction Error:', error.message);
            return null;
        }
    }

    /**
     * Save call log for AI learning
     */
    async saveCallLog(params: {
        companyId: number;
        transcription: string;
        extractedInfo: any;
        appointmentId?: number | null;
        wasAutoCreated: boolean;
        matchedServiceName?: string | null;
        source?: string;
    }): Promise<void> {
        try {
            await pool.query(`
                INSERT INTO ai_call_logs 
                    (company_id, transcription, extracted_info, appointment_id, was_auto_created, 
                     confidence, matched_service_name, source)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                params.companyId,
                params.transcription,
                JSON.stringify(params.extractedInfo),
                params.appointmentId || null,
                params.wasAutoCreated,
                params.extractedInfo?.confidence || 'medium',
                params.matchedServiceName || null,
                params.source || 'audio'
            ]);
        } catch (err) {
            console.warn('[AI] Could not save call log:', (err as any).message);
        }
    }
}

export default new AIAssistantService();
