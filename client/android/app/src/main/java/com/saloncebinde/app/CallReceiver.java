package com.saloncebinde.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.Toast;

public class CallReceiver extends BroadcastReceiver {
    private static final String TAG = "CallReceiver";
    private static boolean listenerStarted = false;

    @Override
    public void onReceive(Context context, Intent intent) {
        String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        if (state == null) return;

        // Sadece RINGING durumunda tetikle (Android 9+ OFFHOOK/IDLE broadcast'i kısıtlıyor)
        if (!TelephonyManager.EXTRA_STATE_RINGING.equals(state)) return;

        Log.d(TAG, "RINGING algılandı!");
        Toast.makeText(context, "📱 AI çalıyor...", Toast.LENGTH_SHORT).show();

        // Oturum kontrolü
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", "");
        if (token == null || token.isEmpty()) {
            Log.d(TAG, "Token eksik - servis başlatılmadı");
            return;
        }

        if (listenerStarted) {
            Log.d(TAG, "Listener zaten çalışıyor");
            return;
        }

        // PhoneStateListener'ı başlatmak için servisi çalıştır
        Intent serviceIntent = new Intent(context, VoiceAssistantService.class);
        serviceIntent.setAction("START_LISTENING");
        context.startForegroundService(serviceIntent);
        listenerStarted = true;

        // Servis kapatılınca flag'i sıfırla (30 saniye sonra)
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            listenerStarted = false;
        }, 30000);
    }
}
