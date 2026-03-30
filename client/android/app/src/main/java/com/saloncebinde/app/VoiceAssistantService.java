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

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "onStartCommand: " + action);

        if ("WAITING_FOR_CALL".equals(action)) {
            startForegroundService("Smart Assist Aktif - Çağrı Bekleniyor");
        } else if ("START_RECORDING".equals(action)) {
            startForegroundService("Görüşme Kaydediliyor...");
            startRecording();
        } else if ("STOP_RECORDING".equals(action)) {
            if (recorder == null && audioFilePath == null) {
                // Kayit hiç başlamadı (Android 10+ OFFHOOK atılamadı)
                Log.e(TAG, "STOP_RECORDING geldi ama kayit hiç başlamamiş!");
                String errMsg = "{\"success\":false,\"error\":\"KAYIT_BASLAMAMIS: Android bu telefonda OFFHOOK sinyalini tetikleyemiyor. Ses hicbir zaman kaydedilmedi.\"}";
                AIAssistantPlugin.lastAIResult = errMsg;
                showToast("⚠️ Ses kaydedilemedi (OFFHOOK sorunu).");
                Intent launchIntent = new Intent(this, MainActivity.class);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                launchIntent.putExtra("ai_result", errMsg);
                try { startActivity(launchIntent); } catch (Exception e) { Log.e(TAG, "Launch failed", e); }
                stopSelf();
            } else {
                stopRecording();
                uploadAndNotify();
            }
        }

        return START_NOT_STICKY;
    }

    private void startForegroundService(String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "AI Asistan", NotificationManager.IMPORTANCE_LOW);
            if (manager != null) manager.createNotificationChannel(channel);
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Saloon Cebinde")
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
            Log.d(TAG, "Recording started: " + audioFilePath);
            showToast("🔴 AI: Kayıt Başladı!");
        } catch (Exception e) {
            Log.e(TAG, "Recording start failed", e);
            String errMsg = "{\"success\":false,\"error\":\"MIC_HATASI: " + e.getMessage() + "\"}";
            AIAssistantPlugin.lastAIResult = errMsg;
            showToast("⚠️ Ses kaydı başlatılamadı: " + e.getMessage());
            audioFilePath = null;
            recorder = null;
            // Hata mesajını kullanıcıya göster
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
                Log.d(TAG, "Recording stopped");
            } catch (Exception e) {
                Log.e(TAG, "Stop recorder error", e);
            }
            recorder = null;
        }
    }

    private void uploadAndNotify() {
        if (audioFilePath == null) {
            Log.d(TAG, "audioFilePath is null, skipping upload");
            return;
        }

        new Thread(() -> {
            try {
                // Wait a bit to ensure file is written
                Thread.sleep(500);

                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String token = prefs.getString("auth_token", "");
                String baseUrl = prefs.getString("base_url", "https://www.saloncebinde.com");
                
                if (token.isEmpty()) {
                    Log.e(TAG, "Auth token is missing!");
                    showToast("Sistem hatası: Oturum bilgisi eksik.");
                    AIAssistantPlugin.lastAIResult = "{\"success\":false,\"error\":\"Oturum bilgisi eksik, analiz yapilamadi.\"}";
                    return;
                }

                File file = new File(audioFilePath);
                if (!file.exists() || file.length() < 100) { // Very small files are probably silence/errors
                    Log.e(TAG, "File empty or too small: " + (file.exists() ? file.length() : "not found"));
                    showToast("Görüşme çok kısa veya ses alınamadı.");
                    AIAssistantPlugin.lastAIResult = "{\"success\":false,\"error\":\"Gorusme cok kisa (dosya " + (file.exists() ? file.length() : "yok") + ") oldugu icin iptal edildi.\"}";
                    return;
                }

                showToast("Görüşme analizi yapılıyor...");
                
                String targetUrl = baseUrl;
                if (!targetUrl.endsWith("/ai/process-call-audio")) {
                    if (targetUrl.contains("/api")) {
                        targetUrl = targetUrl.replaceAll("/$", "") + "/ai/process-call-audio";
                    } else {
                        targetUrl = targetUrl.replaceAll("/$", "") + "/api/ai/process-call-audio";
                    }
                }

                Log.d(TAG, "Uploading " + file.length() + " bytes to: " + targetUrl);
                URL url = new URL(targetUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.setDoOutput(true);
                conn.setUseCaches(false);
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(30000);
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
                Log.d(TAG, "Server Responded: " + responseCode);
                
                // Başarılı (2xx) veya Hata (4xx, 5xx), ne olursa olsun yanıtı oku
                java.io.InputStream inStream = (responseCode >= 200 && responseCode < 300) 
                        ? conn.getInputStream() 
                        : conn.getErrorStream();

                if (inStream != null) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(inStream));
                    String line;
                    StringBuilder response = new StringBuilder();
                    while ((line = in.readLine()) != null) response.append(line);
                    in.close();
                    
                    String resStr = response.toString();
                    Log.d(TAG, "AI Response: " + resStr);
                    
                    if (resStr.contains("\"success\":true") && resStr.contains("\"data\"")) {
                        showToast("Randevu algılandı!");
                    } else if (resStr.contains("\"success\":false")) {
                        showToast("Sunucudan bir hata mesajı döndü.");
                    } else {
                        showToast("Görüşme analiz edildi, randevu bulunamadı.");
                    }
                    
                    // İşlem sonucunu (Hata/Başarı) görmek için statik hafızaya yaz ve UYGULAMAYI AÇMAYI DENE!
                    AIAssistantPlugin.lastAIResult = resStr;
                    Intent launchIntent = new Intent(this, MainActivity.class);
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    launchIntent.putExtra("ai_result", resStr);
                    try {
                        startActivity(launchIntent);
                    } catch (Exception startErr) {
                        Log.e(TAG, "Activity could not be started from background", startErr);
                    }
                } else {
                    showToast("Sunucu yanıtı boş: " + responseCode);
                    
                    // Boş yanıt bile gelse hatayı gösterebilmek için ekranı mecburen açıyoruz
                    String errStr = "{\"success\":false,\"error\":\"HTTP " + responseCode + " - Sunucu ile bağlantı kurulamadı.\"}";
                    AIAssistantPlugin.lastAIResult = errStr;
                    Intent launchIntent = new Intent(this, MainActivity.class);
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    launchIntent.putExtra("ai_result", errStr);
                    try {
                        startActivity(launchIntent);
                    } catch (Exception startErr) {
                        Log.e(TAG, "Activity could not be started from background", startErr);
                    }
                }
                
                // Cleanup
                if (file.exists()) file.delete();

            } catch (Exception e) {
                Log.e(TAG, "Process failed", e);
                showToast("Bağlantı hatası: " + e.getMessage());
                String crashErr = "{\"success\":false,\"error\":\"Android Hata: " + e.getMessage() + "\"}";
                AIAssistantPlugin.lastAIResult = crashErr;
                Intent launchIntent = new Intent(this, MainActivity.class);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                launchIntent.putExtra("ai_result", crashErr);
                try {
                    startActivity(launchIntent);
                } catch (Exception startErr) {
                    Log.e(TAG, "Activity could not be started", startErr);
                }
            } finally {
                stopForeground(true);
                stopSelf();
            }
        }).start();
    }

    private void showToast(final String text) {
        new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
            Toast.makeText(getApplicationContext(), text, Toast.LENGTH_LONG).show();
        });
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
