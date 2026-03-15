package com.saloncebinde.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.MediaRecorder;
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

        if ("WAITING_FOR_CALL".equals(action)) {
            startForegroundService("Smart Assist Aktif - Çağrı Bekleniyor");
        } else if ("START_RECORDING".equals(action)) {
            startForegroundService("Görüşme Kaydediliyor...");
            startRecording();
        } else if ("STOP_RECORDING".equals(action)) {
            stopRecording();
            uploadAndNotify();
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

        startForeground(1, notification);
    }

    private void startRecording() {
        if (recorder != null) return;
        try {
            audioFilePath = getExternalFilesDir(null).getAbsolutePath() + "/call_" + System.currentTimeMillis() + ".m4a";
            recorder = new MediaRecorder();
            
            // Using VOICE_RECOGNITION instead of MIC for better priority during calls
            recorder.setAudioSource(MediaRecorder.AudioSource.VOICE_RECOGNITION); 
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
            recorder.setOutputFile(audioFilePath);
            
            recorder.prepare();
            recorder.start();
            Log.d(TAG, "Recording started: " + audioFilePath);
        } catch (Exception e) {
            Log.e(TAG, "Recording start failed", e);
            // Fallback to MIC if recognition fails
            try {
                recorder = new MediaRecorder();
                recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
                recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                recorder.setOutputFile(audioFilePath);
                recorder.prepare();
                recorder.start();
            } catch (Exception e2) {
                Log.e(TAG, "MIC recording failed too", e2);
            }
        }
    }

    private void stopRecording() {
        if (recorder != null) {
            try {
                recorder.stop();
                recorder.release();
            } catch (Exception e) {
                Log.e(TAG, "Stop recorder error", e);
            }
            recorder = null;
        }
    }

    private void uploadAndNotify() {
        if (audioFilePath == null) {
            stopSelf();
            return;
        }

        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String token = prefs.getString("auth_token", "");
                String baseUrl = prefs.getString("base_url", "https://www.saloncebinde.com");
                
                File file = new File(audioFilePath);
                if (!file.exists()) {
                    stopSelf();
                    return;
                }

                URL url = new URL(baseUrl + "/api/ai/process-call-audio");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.setDoOutput(true);
                conn.setUseCaches(false);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Content-Type", "multipart/form-data;boundary=*****");

                DataOutputStream dos = new DataOutputStream(conn.getOutputStream());
                dos.writeBytes("--*****\r\n");
                dos.writeBytes("Content-Disposition: form-data; name=\"audio\";filename=\"" + file.getName() + "\"\r\n\r\n");

                FileInputStream fis = new FileInputStream(file);
                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = fis.read(buffer)) != -1) dos.write(buffer, 0, bytesRead);
                dos.writeBytes("\r\n--*****--\r\n");

                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    String line;
                    StringBuilder response = new StringBuilder();
                    while ((line = in.readLine()) != null) response.append(line);
                    in.close();
                    file.delete();

                    // Success - Open App
                    Intent launchIntent = new Intent(this, MainActivity.class);
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    launchIntent.putExtra("ai_result", response.toString());
                    startActivity(launchIntent);
                }
                
                fis.close();
                dos.flush();
                dos.close();

            } catch (Exception e) {
                Log.e(TAG, "Process failed", e);
            } finally {
                stopForeground(true);
                stopSelf();
            }
        }).start();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
