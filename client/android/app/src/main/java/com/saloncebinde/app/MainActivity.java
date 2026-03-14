package com.saloncebinde.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.hasExtra("ai_result")) {
            String aiResult = intent.getStringExtra("ai_result");
            // Store it globally or trigger a plugin event
            AIAssistantPlugin.lastAIResult = aiResult;
            // Also trigger an event to the webview
            getBridge().triggerWindowHostEvent("ai_appointment_detected", aiResult);
        }
    }
}
