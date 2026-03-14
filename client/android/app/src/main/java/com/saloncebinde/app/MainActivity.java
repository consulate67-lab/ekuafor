package com.saloncebinde.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

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
            AIAssistantPlugin.lastAIResult = aiResult;
            
            // Correct way to trigger event in Capacitor 5+
            JSObject data = new JSObject();
            data.put("detail", aiResult);
            getBridge().triggerWindowJSEvent("ai_appointment_detected", data.toString());
        }
    }
}
