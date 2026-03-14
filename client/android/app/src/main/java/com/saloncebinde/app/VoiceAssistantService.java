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

        if ("START_RECORDING".equals(action)) {
            startForegroundService("Görüşme Kaydediliyor...");
            startRecording();
        } else if ("STOP_RECORDING".equals(action)) {
            stopRecording();
            uploadAndNotify();
        }

        return START_NOT_STICKY;
    }

    private void startForegroundService(String text) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "AI Görüşme Asistanı",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Saloon Cebinde")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.presence_audio_busy)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        startForeground(1, notification);
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
        } catch (Exception e) {
            Log.e(TAG, "Recording start failed", e);
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

        startForegroundService("Randevu Analiz Ediliyor...");

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

                String boundary = "*****";
                String lineEnd = "\r\n";
                String twoHyphens = "--";

                URL url = new URL(baseUrl + "/api/ai/process-call-audio");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.setDoOutput(true);
                conn.setUseCaches(false);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Authorization", "Bearer " + token);
                conn.setRequestProperty("Content-Type", "multipart/form-data;boundary=" + boundary);

                DataOutputStream dos = new DataOutputStream(conn.getOutputStream());
                dos.writeBytes(twoHyphens + boundary + lineEnd);
                dos.writeBytes("Content-Disposition: form-data; name=\"audio\";filename=\"" + file.getName() + "\"" + lineEnd);
                dos.writeBytes(lineEnd);

                FileInputStream fis = new FileInputStream(file);
                byte[] buffer = new byte[4096];
                int bytesRead;
                while ((bytesRead = fis.read(buffer)) != -1) {
                    dos.write(buffer, 0, bytesRead);
                }
                dos.writeBytes(lineEnd);
                dos.writeBytes(twoHyphens + boundary + twoHyphens + lineEnd);

                int responseCode = conn.getResponseCode();
                StringBuilder response = new StringBuilder();
                if (responseCode == 200) {
                    BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    String inputLine;
                    while ((inputLine = in.readLine()) != null) response.append(inputLine);
                    in.close();
                    file.delete(); // Success
                }

                fis.close();
                dos.flush();
                dos.close();

                // Bring App to Foreground
                Intent launchIntent = new Intent(this, MainActivity.class);
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                if (responseCode == 200) {
                    launchIntent.putExtra("ai_result", response.toString());
                }
                startActivity(launchIntent);

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
