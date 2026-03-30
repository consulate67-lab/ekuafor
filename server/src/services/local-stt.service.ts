import fs from 'fs';
import path from 'path';

let pipeline: any, env: any;
let ffmpeg: any;
let ffmpegPath: any;
let WaveFile: any;

try {
    // Tamamen Pure-JavaScript ONNX (Açık Kaynak/Kendi Yerel modellememiz) Kütüphaneleri
    const transformers = require('@xenova/transformers');
    pipeline = transformers.pipeline;
    env = transformers.env;
    env.allowLocalModels = false; // HuggingFace deposundan ağırlıkları indireceğiz
    env.useBrowserCache = false;
    env.cacheDir = path.join(process.cwd(), '.cache'); // Railway'de /.cache hatası almamak için açıkça /app dizininde klasör göster!
    
    ffmpeg = require('fluent-ffmpeg');
    ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
    
    WaveFile = require('wavefile').WaveFile;
} catch (e) {
    console.warn('[AI Local STT] @xenova/transformers, wavefile veya FFmpeg tam kurulamadı.');
}

export class LocalSTTEngine {
    private static transcriber: any = null;

    static async initialize() {
        if (!pipeline) throw new Error("Açık Kaynak STT kütüphaneleri bulunamadı.");
        if (!this.transcriber) {
            console.log('[AI Local STT] Açık Kaynak Whisper Modeli Yükleniyor...');
            console.log('[AI Local STT] (ÖNEMLİ: Bu işlem ilk seferde modeli bir kez 150 MB boyutunda sunucu cache belleğine indirir. Daha sonraki aramalarda milisaniyeler sürer.)');
            
            // Xenova/whisper-tiny, Windows'ta veya Linux'ta 0 MB bağımlılık ile C++ kullanmadan çalışan harika boyutlu bir çoklu dil modelidir!
            this.transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
            console.log('[AI Local STT] Whisper-Tiny (Açık Kaynak/Çevrimdışı) Modeli Hazır!');
        }
        return true;
    }

    /**
     * Sesi alır, FFmpeg ile 16kHz WAV formatına çevirir, Float32 Matriksine dönüştürüp Whisper ONNX Motoruna verir
     */
    static async transcribeAudio(inputAudioPath: string): Promise<string> {
        if (!pipeline || !ffmpeg || !WaveFile) throw new Error("Kütüphaneler kurulu değil.");
        await this.initialize();

        const tempWavFile = path.join(process.cwd(), `temp_${Date.now()}.wav`);

        // Adım 1: Sesi 16 kHz Mono WAV formatına çevir (ONNX Whisper özellikleri)
        await new Promise<void>((resolve, reject) => {
            ffmpeg(inputAudioPath)
                .outputOptions(['-ac 1', '-ar 16000'])
                .save(tempWavFile)
                .on('end', () => resolve())
                .on('error', (err: any) => reject(err));
        });

        // Adım 2: Matematiksel PCM Raw Verisi Çıkar (Wav okuyucu ile)
        const buffer = fs.readFileSync(tempWavFile);
        const wav = new WaveFile(buffer);
        wav.toBitDepth('32f');
        wav.toSampleRate(16000);
        let audioData = wav.getSamples();
        
        // Tek Kanallı (Mono) Array haline getir
        if (Array.isArray(audioData)) {
            if (audioData.length > 1) {
                const mono = new Float32Array(audioData[0].length);
                for (let i = 0; i < audioData[0].length; ++i) {
                    mono[i] = (audioData[0][i] + audioData[1][i]) / 2;
                }
                audioData = mono as any;
            } else {
                audioData = audioData[0];
            }
        }
        const audioFloat32 = new Float32Array(audioData as unknown as ArrayLike<number>);

        if (fs.existsSync(tempWavFile)) fs.unlinkSync(tempWavFile);

        console.log('[AI Local STT] Tamamen kendi sunucunuzda, dışarı çıkmadan sesi süzüyoruz...');
        
        // Adım 3: Sırf Türkçe'ye odakla ve yazıyı al
        const output = await this.transcriber(audioFloat32, { language: 'turkish', task: 'transcribe' });

        return output.text || '';
    }
}
