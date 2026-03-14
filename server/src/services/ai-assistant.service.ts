import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'your_api_key_here',
});

export interface ExtractionResult {
    customerName?: string;
    serviceName?: string;
    date?: string;
    time?: string;
    note?: string;
}

class AIAssistantService {
    /**
     * Transcribes audio using Whisper
     */
    async transcribeAudio(audioPath: string): Promise<string> {
        try {
            const transcription = await openai.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: "whisper-1",
                language: "tr"
            });
            return transcription.text;
        } catch (error: any) {
            console.error('Whisper Transcription Error:', error.message);
            throw new Error('Ses analiz edilemedi.');
        }
    }

    /**
     * Extracts appointment information from text using GPT-4
     */
    async extractAppointmentInfo(text: string): Promise<ExtractionResult | null> {
        try {
            const prompt = `
            Aşağıdaki metin bir kuaför dükkanındaki çalışan ile müşterisi arasındaki telefon görüşmesinin bir kısmıdır.
            Bu metinden randevu bilgilerini ayıkla ve JSON formatında döndür.
            Eğer bir bilgi metinde yoksa "null" bırak.
            
            Gerekli alanlar:
            - customerName: Müşterinin ismi
            - serviceName: İstenen hizmet (saç kesimi, boya, fön vb.)
            - date: Randevu tarihi (YIL-AY-GÜN formatında veya 'yarın', 'salı' gibi metin)
            - time: Randevu saati (SAAT:DAKİKA formatında)
            - note: Diğer önemli notlar
            
            Metin: "${text}"
            
            Cevabı sadece saf JSON olarak ver. Örnek:
            {
                "customerName": "Mehmet",
                "serviceName": "Fön",
                "date": "2024-03-15",
                "time": "14:00",
                "note": "Acelesi var"
            }
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "Sen bir uzman sekretersin. Konuşmalardan randevu verilerini ayıklarsın." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });

            const content = response.choices[0].message.content;
            if (!content) return null;

            return JSON.parse(content);
        } catch (error: any) {
            console.error('GPT Extraction Error:', error.message);
            return null;
        }
    }
}

export default new AIAssistantService();
