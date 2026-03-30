package com.saloncebinde.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.MediaRecorder;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.telephony.TelephonyManager;
import android.util.Log;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class VoiceAssistantService extends Service {
    private static final String TAG = "VoiceAssistantService";
    private static final String CHANNEL_ID = "VoiceAssistantChannel";
    
    private MediaRecorder recorder = null;
    private String audioFilePath = null;
    private Handler pollingHandler = null;
    private int pollCount = 0;
    private static final int MAX_POLL_SECONDS = 120; // Maksimum 2 dakika kayıt

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "onStartCommand: " + action);

        if ("START_LISTENING".equals(action) || "WAITING_FOR_CALL".equals(action)) {
            startForegroundNotification("🔴 AI: Görüşme Kaydediliyor...");
            
            // HEMEN KAYDI BAŞLAT - OFFHOOK bekleme, RINGING yeterli!
            showToast("🔴 AI: Kayıt Başladı!");
            startRecording();
            
            // IDLE'ı izlemek için polling başlat (1sn arayla)
            startIdlePolling();
        }

        return START_NOT_STICKY;
    }

    /**
     * Sadece IDLE'ı bekle - telefon kapandığında yükle
     */
    private void startIdlePolling() {
        TelephonyManager tm = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
        pollingHandler = new Handler(Looper.getMainLooper());
        pollCount = 0;

        Runnable checker = new Runnable() {
            @Override
            public void run() {
                pollCount++;
                
                // Maksimum süre kontrolü
                if (pollCount > MAX_POLL_SECONDS) {
                    Log.w(TAG, "Maksimum kayıt süresi doldu, yükleniyor...");
                    stopAndUpload();
                    return;
                }

                // Telefon durumunu kontrol et
                try {
                    int state = tm != null ? tm.getCallState() : -1;
                    Log.d(TAG, "Poll #" + pollCount + " durum=" + state);
                    
                    if (state == TelephonyManager.CALL_STATE_IDLE) {
                        Log.d(TAG, "IDLE tespit edildi! Yükleniyor...");
                        showToast("✅ AI: Görüşme Bitti, Analiz Ediliyor...");
                        stopAndUpload();
                        return;
                    }
                } catch (SecurityException se) {
                    Log.e(TAG, "İzin hatası: " + se.getMessage());
                }

                // 1 saniye sonra tekrar kontrol et
                pollingHandler.postDelayed(this, 1000);
            }
        };

        // 3 saniye gecikmeli başlat (hattın tam bağlanmasını bekle)
        pollingHandler.postDelayed(checker, 3000);
        Log.d(TAG, "IDLE polling başladı");
    }

    private void stopAndUpload() {
        if (pollingHandler != null) {
            pollingHandler.removeCallbacksAndMessages(null);
            pollingHandler = null;
        }
        stopRecording();
        uploadAndNotify();
    }

    private void startForegroundNotification(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "AI Asistan", NotificationManager.IMPORTANCE_LOW);
        if (manager != null) manager.createNotificationChannel(channel);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Saloon AI - Aktif")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.presence_audio_busy)
            .setOngoing(true)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(1, notification);
        }
    }

    private void startRecording() {
        if (recorder != null) return;
        try {
            audioFilePath = getExternalFilesDir(null).getAbsolutePath() + "/call_" + System.currentTimeMillis() + ".m4a";
            recorder = new MediaRecorder();
            // Telefon görüşmesi sırasında MIC bloke olabilir. VOICE_COMMUNICATION daha güvenlidir:
            recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setAudioSamplingRate(16000);
            recorder.setAudioEncodingBitRate(32000);
            recorder.setOutputFile(audioFilePath);
            recorder.prepare();
            recorder.start();
            Log.d(TAG, "✅ Kayıt başladı: " + audioFilePath);
        } catch (Exception e) {
            Log.e(TAG, "Kayıt başlatılamadı: " + e.getMessage(), e);
            String err = "{\"success\":false,\"error\":\"MIC_HATASI: " + e.getMessage() + "\"}";
            AIAssistantPlugin.lastAIResult = err;
            showToast("⚠️ Mikrofon hatası: " + e.getMessage());
            launchMainActivity(err);
            stopForeground(true);
            stopSelf();
        }
    }

    private void stopRecording() {
        if (recorder != null) {
            try {
                recorder.stop();
                recorder.release();
                Log.d(TAG, "Kayıt durduruldu");
            } catch (Exception e) {
                Log.e(TAG, "Durdurma hatası: " + e.getMessage());
            }
            recorder = null;
        }
    }

    private void uploadAndNotify() {
        if (audioFilePath == null) {
            String err = "{\"success\":false,\"error\":\"KAYIT_BASLAMADI: Mikrofon başlatılamadı.\"}";
            AIAssistantPlugin.lastAIResult = err;
            launchMainActivity(err);
            stopForeground(true);
            stopSelf();
            return;
        }

        new Thread(() -> {
            try {
                Thread.sleep(300);
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String token = prefs.getString("auth_token", "");
                String baseUrl = prefs.getString("base_url", "https://www.saloncebinde.com");

                if (token == null || token.isEmpty()) {
                    String err = "{\"success\":false,\"error\":\"GIRIS_YAPILMAMIS: Token bulunamadı.\"}";
                    AIAssistantPlugin.lastAIResult = err;
                    launchMainActivity(err);
                    return;
                }

                File file = new File(audioFilePath);
                long fileSize = file.exists() ? file.length() : 0;
                Log.d(TAG, "Dosya boyutu: " + fileSize + " byte");

                if (!file.exists() || fileSize < 500) {
                    String err = "{\"success\":false,\"error\":\"DOSYA_KUCUK: " + fileSize + " byte - Görüşme çok kısa veya sessiz kaldı.\"}";
                    AIAssistantPlugin.lastAIResult = err;
                    showToast("Ses çok kısa.");
                    launchMainActivity(err);
                    return;
                }

                showToast("⏳ Yapay zeka analiz ediyor...");
                String targetUrl = baseUrl.replaceAll("/$", "") + "/api/ai/process-call-audio";
                Log.d(TAG, "POST → " + targetUrl + " (" + fileSize + "b)");

                URL url = new URL(targetUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.setDoOutput(true);
                conn.setUseCaches(false);
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(60000);
                conn.setReadTimeout(120000);
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Content-Type", "multipart/form-data;boundary=*****");

                DataOutputStream dos = new DataOutputStream(conn.getOutputStream());
                dos.writeBytes("--*****\r\n");
                dos.writeBytes("Content-Disposition: form-data; name=\"audio\";filename=\"" + file.getName() + "\"\r\n\r\n");
                FileInputStream fis = new FileInputStream(file);
                byte[] buf = new byte[8192];
                int len;
                while ((len = fis.read(buf)) != -1) dos.write(buf, 0, len);
                dos.writeBytes("\r\n--*****--\r\n");
                dos.flush(); dos.close(); fis.close();

                int code = conn.getResponseCode();
                java.io.InputStream is = code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream();
                String resStr;
                if (is != null) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(is));
                    StringBuilder sb = new StringBuilder();
                    String line; while ((line = br.readLine()) != null) sb.append(line);
                    br.close();
                    resStr = sb.toString();
                } else {
                    resStr = "{\"success\":false,\"error\":\"HTTP_" + code + "_BOŞ_YANIT\"}";
                }

                Log.d(TAG, "Sunucu yanıtı (" + code + "): " + resStr);
                AIAssistantPlugin.lastAIResult = resStr;

                if (resStr.contains("\"autoCreated\":true")) {
                    showToast("🎉 Randevu oluşturuldu!");
                } else if (resStr.contains("\"success\":true")) {
                    showToast("✅ Analiz tamamlandı!");
                } else {
                    showToast("⚠️ Analiz bitti (detay için uygulamayı aç)");
                }

                launchMainActivity(resStr);
                if (file.exists()) file.delete();

            } catch (Exception e) {
                Log.e(TAG, "Upload hatası: " + e.getMessage(), e);
                String err = "{\"success\":false,\"error\":\"BAGLANTI_HATASI: " + e.getMessage() + "\"}";
                AIAssistantPlugin.lastAIResult = err;
                showToast("Hata: " + e.getMessage());
                launchMainActivity(err);
            } finally {
                stopForeground(true);
                stopSelf();
            }
        }).start();
    }

    private void launchMainActivity(String result) {
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        i.putExtra("ai_result", result);
        try { startActivity(i); } catch (Exception e) { Log.e(TAG, "Launch fail", e); }
    }

    private void showToast(final String msg) {
        new Handler(Looper.getMainLooper()).post(() ->
            Toast.makeText(getApplicationContext(), msg, Toast.LENGTH_LONG).show()
        );
    }

    @Override
    public void onDestroy() {
        if (pollingHandler != null) pollingHandler.removeCallbacksAndMessages(null);
        stopRecording();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
