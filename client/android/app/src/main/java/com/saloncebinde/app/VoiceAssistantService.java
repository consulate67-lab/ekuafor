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

import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
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
            startForegroundService();
            startRecording();
        } else if ("STOP_RECORDING".equals(action)) {
            stopRecording();
            uploadRecording();
            stopForeground(true);
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    private void startForegroundService() {
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
            .setContentText("AI Görüşme Asistanı Aktif...")
            .setSmallIcon(android.R.drawable.presence_audio_busy)
            .build();

        startForeground(1, notification);
    }

    private void startRecording() {
        if (recorder != null) return;

        audioFilePath = getExternalFilesDir(null).getAbsolutePath() + "/call_" + System.currentTimeMillis() + ".m4a";
        Log.d(TAG, "Starting recording: " + audioFilePath);

        recorder = new MediaRecorder();
        recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
        recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
        recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
        recorder.setOutputFile(audioFilePath);

        try {
            recorder.prepare();
            recorder.start();
        } catch (IOException e) {
            Log.e(TAG, "Recording failed", e);
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

    private void uploadRecording() {
        final String finalPath = audioFilePath;
        if (finalPath == null) return;

        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String token = prefs.getString("auth_token", "");
                String baseUrl = prefs.getString("base_url", "https://www.saloncebinde.com");
                
                File file = new File(finalPath);
                if (!file.exists()) return;

                String boundary = "*****";
                String lineEnd = "\r\n";
                String twoHyphens = "--";

                URL url = new URL(baseUrl + "/api/ai/process-call-audio");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoInput(true);
                conn.setDoOutput(true);
                conn.setUseCaches(false);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Connection", "Keep-Alive");
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

                int serverResponseCode = conn.getResponseCode();
                Log.d(TAG, "Upload response code: " + serverResponseCode);

                fis.close();
                dos.flush();
                dos.close();

                // Delete file after upload
                if (serverResponseCode == 200) {
                    file.delete();
                }

            } catch (Exception e) {
                Log.e(TAG, "Upload failed", e);
            }
        }).start();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
