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
import android.os.IBinder;
import android.telephony.PhoneStateListener;
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
    private TelephonyManager telephonyManager = null;
    private PhoneStateListener phoneStateListener = null;
    private boolean isListening = false;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "onStartCommand: " + action);

        if ("WAITING_FOR_CALL".equals(action) || "START_LISTENING".equals(action)) {
            startForegroundService("Saloon AI Hazır - Çağrı Dinleniyor...");
            startPhoneStateListener();
        } else if ("START_RECORDING".equals(action)) {
            // Eski yöntem - geriye dönük uyumluluk
            startForegroundService("Görüşme Kaydediliyor...");
            startRecording();
        } else if ("STOP_RECORDING".equals(action)) {
            // Eski yöntem - geriye dönük uyumluluk
            stopRecording();
            uploadAndNotify();
        }

        return START_STICKY; // Sistem öldürse bile yeniden başlat
    }

    /**
     * Modern Android 9+ için PhoneStateListener - BroadcastReceiver yerine
     * Bu yöntem RINGING, OFFHOOK ve IDLE'ı %100 güvenilir şekilde yakalar
     */
    private void startPhoneStateListener() {
        if (isListening) return;

        telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
        if (telephonyManager == null) {
            Log.e(TAG, "TelephonyManager alınamadı!");
            return;
        }

        phoneStateListener = new PhoneStateListener() {
            @Override
            public void onCallStateChanged(int state, String phoneNumber) {
                Log.d(TAG, "PhoneStateListener - Durum: " + state);

                switch (state) {
                    case TelephonyManager.CALL_STATE_RINGING:
                        // Telefon çalıyor
                        showToast("🔔 AI: Telefon Çalıyor...");
                        Log.d(TAG, "RINGING algılandı");
                        break;

                    case TelephonyManager.CALL_STATE_OFFHOOK:
                        // Telefon açıldı - KAYDI BAŞLAT
                        showToast("🔴 AI: Kayıt Başladı!");
                        Log.d(TAG, "OFFHOOK - Kayıt başlıyor");
                        startRecording();
                        break;

                    case TelephonyManager.CALL_STATE_IDLE:
                        // Görüşme bitti - KAYDI DURDUR VE YÜKLE
                        showToast("✅ AI: Görüşme Bitti, Analiz Başlıyor...");
                        Log.d(TAG, "IDLE - Kayıt durduruluyor");
                        stopPhoneStateListener();
                        stopRecording();
                        uploadAndNotify();
                        break;
                }
            }
        };

        telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
        isListening = true;
        Log.d(TAG, "PhoneStateListener kaydedildi!");
    }

    private void stopPhoneStateListener() {
        if (telephonyManager != null && phoneStateListener != null) {
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);
            isListening = false;
            Log.d(TAG, "PhoneStateListener durduruldu");
        }
    }

    private void startForegroundService(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "AI Asistan", NotificationManager.IMPORTANCE_LOW);
        if (manager != null) manager.createNotificationChannel(channel);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Saloon Cebinde AI")
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
            recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setOutputFile(audioFilePath);
            recorder.prepare();
            recorder.start();
            Log.d(TAG, "Kayıt başladı: " + audioFilePath);
        } catch (Exception e) {
            Log.e(TAG, "Kayıt başlatılamadı", e);
            String errMsg = "{\"success\":false,\"error\":\"MIC_HATASI: " + e.getMessage() + "\"}";
            AIAssistantPlugin.lastAIResult = errMsg;
            showToast("⚠️ Ses kaydı başlatılamadı: " + e.getMessage());
            audioFilePath = null;
            recorder = null;
            Intent launchIntent = new Intent(this, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            launchIntent.putExtra("ai_result", errMsg);
            try { startActivity(launchIntent); } catch (Exception ex) { Log.e(TAG, "Launch failed", ex); }
        }
    }

    private void stopRecording() {
        if (recorder != null) {
            try {
                recorder.stop();
                recorder.release();
                Log.d(TAG, "Kayıt durduruldu");
            } catch (Exception e) {
                Log.e(TAG, "Kayıt durdurma hatası", e);
            }
            recorder = null;
        }
    }

    private void uploadAndNotify() {
        if (audioFilePath == null) {
            Log.d(TAG, "audioFilePath null - kayıt hiç başlamamış");
            String errMsg = "{\"success\":false,\"error\":\"KAYIT_YOK: Ses dosyası oluşturulamadı. Mikrofon izni var mı?\"}";
            AIAssistantPlugin.lastAIResult = errMsg;
            showToast("⚠️ Ses kaydedilemedi.");
            Intent launchIntent = new Intent(this, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            launchIntent.putExtra("ai_result", errMsg);
            try { startActivity(launchIntent); } catch (Exception e) { Log.e(TAG, "Launch failed", e); }
            stopForeground(true);
            stopSelf();
            return;
        }

        new Thread(() -> {
            try {
                Thread.sleep(500);

                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String token = prefs.getString("auth_token", "");
                String baseUrl = prefs.getString("base_url", "https://www.saloncebinde.com");

                if (token == null || token.isEmpty()) {
                    Log.e(TAG, "Auth token eksik!");
                    AIAssistantPlugin.lastAIResult = "{\"success\":false,\"error\":\"TOKEN_EKSIK: Uygulamaya giriş yapılmamış.\"}";
                    showToast("Hata: Oturum bilgisi eksik.");
                    return;
                }

                File file = new File(audioFilePath);
                if (!file.exists() || file.length() < 100) {
                    Log.e(TAG, "Dosya çok küçük: " + (file.exists() ? file.length() : "Yok"));
                    String errMsg = "{\"success\":false,\"error\":\"DOSYA_KUCUK: Ses dosyası " + (file.exists() ? file.length() + " byte" : "bulunamadı") + ". Görüşme çok kısa mıydı?\"}";
                    AIAssistantPlugin.lastAIResult = errMsg;
                    showToast("Görüşme çok kısa veya ses alınamadı.");
                    Intent li = new Intent(this, MainActivity.class);
                    li.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    li.putExtra("ai_result", errMsg);
                    try { startActivity(li); } catch (Exception e) { Log.e(TAG, "Launch failed", e); }
                    return;
                }

                showToast("⏳ Görüşme analiz ediliyor...");

                String targetUrl = baseUrl.replaceAll("/$", "") + "/api/ai/process-call-audio";
                Log.d(TAG, "Yükleniyor (" + file.length() + " byte): " + targetUrl);

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
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = fis.read(buffer)) != -1) dos.write(buffer, 0, bytesRead);
                dos.writeBytes("\r\n--*****--\r\n");
                dos.flush();
                dos.close();
                fis.close();

                int responseCode = conn.getResponseCode();
                Log.d(TAG, "Sunucu Yanıtı: " + responseCode);

                java.io.InputStream inStream = (responseCode >= 200 && responseCode < 300)
                        ? conn.getInputStream()
                        : conn.getErrorStream();

                String resStr;
                if (inStream != null) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(inStream));
                    String line;
                    StringBuilder response = new StringBuilder();
                    while ((line = in.readLine()) != null) response.append(line);
                    in.close();
                    resStr = response.toString();
                } else {
                    resStr = "{\"success\":false,\"error\":\"HTTP " + responseCode + " - Sunucu yanıtı boş\"}";
                }

                Log.d(TAG, "AI Yanıtı: " + resStr);

                if (resStr.contains("\"success\":true")) {
                    showToast("✅ Randevu analiz edildi!");
                } else {
                    showToast("⚠️ Analiz tamamlandı (sonuç için uygulamayı aç)");
                }

                // Hafızaya yaz ve uygulamayı aç
                AIAssistantPlugin.lastAIResult = resStr;
                Intent launchIntent = new Intent(this, MainActivity.class);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                launchIntent.putExtra("ai_result", resStr);
                try { startActivity(launchIntent); } catch (Exception startErr) {
                    Log.e(TAG, "Activity açılamadı", startErr);
                }

                if (file.exists()) file.delete();

            } catch (Exception e) {
                Log.e(TAG, "İşlem başarısız", e);
                String crashErr = "{\"success\":false,\"error\":\"BAGLANTI_HATASI: " + e.getMessage() + "\"}";
                AIAssistantPlugin.lastAIResult = crashErr;
                showToast("Bağlantı hatası: " + e.getMessage());
                Intent launchIntent = new Intent(this, MainActivity.class);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                launchIntent.putExtra("ai_result", crashErr);
                try { startActivity(launchIntent); } catch (Exception startErr) {
                    Log.e(TAG, "Activity açılamadı", startErr);
                }
            } finally {
                stopForeground(true);
                stopSelf();
            }
        }).start();
    }

    private void showToast(final String text) {
        new android.os.Handler(android.os.Looper.getMainLooper()).post(() ->
            Toast.makeText(getApplicationContext(), text, Toast.LENGTH_LONG).show()
        );
    }

    @Override
    public void onDestroy() {
        stopPhoneStateListener();
        stopRecording();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
