package com.saloncebinde.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import android.content.SharedPreferences;
import android.util.Log;

public class CallReceiver extends BroadcastReceiver {
    private static final String TAG = "CallReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        // Check if user is staff via SharedPreferences
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        boolean isStaff = prefs.getBoolean("is_staff", false);

        if (!isStaff) {
            Log.d(TAG, "Not a staff member, skipping call monitor.");
            return;
        }

        String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        Log.d(TAG, "Call State Change: " + state);

        if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
            // Call answered - Start Voice Assistant Service
            Intent serviceIntent = new Intent(context, VoiceAssistantService.class);
            serviceIntent.setAction("START_RECORDING");
            context.startForegroundService(serviceIntent);
        } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
            // Call ended - Stop Voice Assistant Service
            Intent serviceIntent = new Intent(context, VoiceAssistantService.class);
            serviceIntent.setAction("STOP_RECORDING");
            context.startForegroundService(serviceIntent);
        }
    }
}
