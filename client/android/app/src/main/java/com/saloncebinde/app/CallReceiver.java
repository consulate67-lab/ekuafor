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
        if (state == null) return;

        Log.d(TAG, "Call State: " + state);

        // Check if user is staff
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        boolean isStaff = prefs.getBoolean("is_staff", false);

        if (!isStaff) {
            Log.d(TAG, "Sync failed or not a staff member.");
            return;
        }

        if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
            Toast.makeText(context, "Yapay Zeka Hazır: Görüşme bekleniyor...", Toast.LENGTH_SHORT).show();
            // We can also start the service in a 'waiting' mode to ensure it's warmed up
            Intent serviceIntent = new Intent(context, VoiceAssistantService.class);
            serviceIntent.setAction("WAITING_FOR_CALL");
            context.startForegroundService(serviceIntent);
        } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
            Toast.makeText(context, "AI Asistan: Görüşme başladı, dinleniyor...", Toast.LENGTH_SHORT).show();
            Intent serviceIntent = new Intent(context, VoiceAssistantService.class);
            serviceIntent.setAction("START_RECORDING");
            context.startForegroundService(serviceIntent);
        } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
            Intent serviceIntent = new Intent(context, VoiceAssistantService.class);
            serviceIntent.setAction("STOP_RECORDING");
            context.startForegroundService(serviceIntent);
        }
    }
}
