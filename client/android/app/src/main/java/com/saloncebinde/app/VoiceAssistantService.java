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
    private TelephonyManager telephonyManager = null;
    
    // Durum takibi
    private boolean wasOffhook = false;  // Daha önce açıldı mı?
    private int pollCount = 0;
    private static final int MAX_POLLS = 180; // 3 dakika (her 1 saniyede bir)

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.d(TAG, "onStartCommand: " + action);

        if ("START_LISTENING".equals(action) || "WAITING_FOR_CALL".equals(action)) {
            startForegroundNotification("AI Hazır - Çağrı İzleniyor...");
            startPolling();
        }

        return START_NOT_STICKY;
    }

    /**
     * Her saniye TelephonyManager'ı sorgula - En güvenilir yöntem!
     * BroadcastReceiver veya PhoneStateListener yerine direkt polling.
     */
    private void startPolling() {
        telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
        if (telephonyManager == null) {
            Log.e(TAG, "TelephonyManager alınamadı!");
            AIAssistantPlugin.lastAIResult = "{\"success\":false,\"error\":\"TELEFON_HATASI: TelephonyManager bulunamadı.\"}";
            stopSelf();
            return;
        }

        pollingHandler = new Handler(Looper.getMainLooper());
        wasOffhook = false;
        pollCount = 0;
        
        Log.d(TAG, "Telefon durumu izleme başladı");
        
        Runnable pollRunnable = new Runnable() {
            @Override
            public void run() {
                pollCount++;
                
                if (pollCount > MAX_POLLS) {
                    Log.w(TAG, "Max polling süresi doldu");
                    stopRecordingAndUpload();
                    return;
                }

                int callState = telephonyManager.getCallState();
                Log.d(TAG, "Poll #" + pollCount + " - Durum: " + callState);

                if (callState == TelephonyManager.CALL_STATE_OFFHOOK && !wasOffhook) {
                    // Telefon açıldı - KAYDI BAŞLAT
                    wasOffhook = true;
                    showToast("🔴 AI: Kayıt Başladı!");
                    Log.d(TAG, "OFFHOOK tespit edildi - kayıt başlıyor");
                    startRecording();

                } else if (callState == TelephonyManager.CALL_STATE_IDLE && wasOffhook) {
                    // Görüşme bitti ve daha önce açılmıştı - KAYDI DURDUR
                    Log.d(TAG, "IDLE tespit edildi - kayıt durduruluyor");
                    showToast("✅ AI: Görüşme Bitti!");
                    stopRecordingAndUpload();
                    return;

                } else if (callState == TelephonyManager.CALL_STATE_IDLE && !wasOffhook && pollCount > 5) {
                    // Telefon hiç açılmadan kapandı (cevapsız çağrı)
                    Log.d(TAG, "Cevapsız çağrı - durdurulıyor");
                    AIAssistantPlugin.lastAIResult = "{\"success\":false,\"error\":\"CEVAPSIZ: Görüşme açılmadı, kayıt yapılmadı.\"}";
                    stopForeground(true);
                    stopSelf();
                    return;
                }

                // Tekrar kontrol et (1 saniye sonra)
                pollingHandler.postDelayed(this, 1000);
            }
        };
        
        pollingHandler.postDelayed(pollRunnable, 1000);
    }

    private void stopRecordingAndUpload() {
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
            .setContentTitle("Saloon AI")
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
            String err = "{\"success\":false,\"error\":\"MIC_HATASI: " + e.getMessage() + "\"}";
            AIAssistantPlugin.lastAIResult = err;
            showToast("⚠️ Mikrofon hatası: " + e.getMessage());
            Intent li = new Intent(this, MainActivity.class);
            li.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            li.putExtra("ai_result", err);
            try { startActivity(li); } catch (Exception ex) { Log.e(TAG, "Launch failed", ex); }
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
                Log.e(TAG, "Kayıt durdurma hatası", e);
            }
            recorder = null;
        }
    }

    private void uploadAndNotify() {
        if (audioFilePath == null) {
            String err = "{\"success\":false,\"error\":\"KAYIT_YOK: Ses kaydı başlatılamadı.\"}";
            AIAssistantPlugin.lastAIResult = err;
            showToast("⚠️ Ses kaydedilemedi.");
            launchMainActivity(err);
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
                    String err = "{\"success\":false,\"error\":\"TOKEN_EKSIK: Giriş yapılmamış.\"}";
                    AIAssistantPlugin.lastAIResult = err;
                    showToast("Hata: Giriş bilgisi eksik.");
                    launchMainActivity(err);
                    return;
                }

                File file = new File(audioFilePath);
                if (!file.exists() || file.length() < 100) {
                    String err = "{\"success\":false,\"error\":\"DOSYA_KUCUK: " + (file.exists() ? file.length() + " byte" : "Dosya yok") + "\"}";
                    AIAssistantPlugin.lastAIResult = err;
                    showToast("Ses dosyası çok küçük.");
                    launchMainActivity(err);
                    return;
                }

                showToast("⏳ Analiz ediliyor...");
                String targetUrl = baseUrl.replaceAll("/$", "") + "/api/ai/process-call-audio";
                Log.d(TAG, "Gönderiliyor (" + file.length() + "b): " + targetUrl);

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
                Log.d(TAG, "HTTP: " + responseCode);

                java.io.InputStream inStream = responseCode >= 200 && responseCode < 300
                        ? conn.getInputStream() : conn.getErrorStream();

                String resStr;
                if (inStream != null) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(inStream));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    br.close();
                    resStr = sb.toString();
                } else {
                    resStr = "{\"success\":false,\"error\":\"HTTP_" + responseCode + "\"}";
                }

                Log.d(TAG, "Yanıt: " + resStr);
                AIAssistantPlugin.lastAIResult = resStr;

                if (resStr.contains("\"success\":true")) {
                    showToast("✅ Randevu analiz edildi!");
                } else {
                    showToast("⚠️ Analiz tamamlandı");
                }

                launchMainActivity(resStr);
                if (file.exists()) file.delete();

            } catch (Exception e) {
                Log.e(TAG, "Hata", e);
                String err = "{\"success\":false,\"error\":\"BAGLANTI: " + e.getMessage() + "\"}";
                AIAssistantPlugin.lastAIResult = err;
                showToast("Bağlantı hatası: " + e.getMessage());
                launchMainActivity(err);
            } finally {
                stopForeground(true);
                stopSelf();
            }
        }).start();
    }

    private void launchMainActivity(String result) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("ai_result", result);
        try { startActivity(intent); } catch (Exception e) { Log.e(TAG, "Launch failed", e); }
    }

    private void showToast(final String text) {
        new Handler(Looper.getMainLooper()).post(() ->
            Toast.makeText(getApplicationContext(), text, Toast.LENGTH_LONG).show()
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
