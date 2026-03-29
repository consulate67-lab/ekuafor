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

    @Override
    public void onReceive(Context context, Intent intent) {
        String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        String incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);
        
        if (state == null) return;

        // Her durumda bir bildirim ver (Sistemin çalıştığını doğrula)
        if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
             Toast.makeText(context, "📱 AI: Telefon çalıyor...", Toast.LENGTH_LONG).show();
             Log.d(TAG, "Ringing detected");
        }

        // Check if user is logged in
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", "");

        if (token == null || token.isEmpty()) {
            Log.d(TAG, "Not logged in or token missing.");
            // Oturum yoksa veya senkronize değilse burada durur
            return;
        }

        Intent serviceIntent = new Intent(context, VoiceAssistantService.class);
        
        if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
            Log.d(TAG, "State: RINGING");
            Toast.makeText(context, "AI: Çağrı bekleniyor...", Toast.LENGTH_SHORT).show();
            serviceIntent.setAction("WAITING_FOR_CALL");
            context.startForegroundService(serviceIntent);
        } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
            Log.d(TAG, "State: OFFHOOK (Görüşme Başladı)");
            Toast.makeText(context, "AI: Görüşme kaydediliyor...", Toast.LENGTH_SHORT).show();
            serviceIntent.setAction("START_RECORDING");
            context.startForegroundService(serviceIntent);
        } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
            Log.d(TAG, "State: IDLE (Görüşme Bitti)");
            Toast.makeText(context, "AI: İşlem tamamlanıyor...", Toast.LENGTH_SHORT).show();
            serviceIntent.setAction("STOP_RECORDING");
            context.startForegroundService(serviceIntent);
        }
    }
}
