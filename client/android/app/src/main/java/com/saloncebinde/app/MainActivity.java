package com.saloncebinde.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // AIAssistant plugin'ini ZORUNLU olarak kaydet
        registerPlugin(AIAssistantPlugin.class);
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
            
            // This is the most reliable way to send global events to the webview
            // We use evaluateJavascript to directly trigger the event on window
            getBridge().getWebView().post(() -> {
                String js = "window.dispatchEvent(new CustomEvent('ai_appointment_detected', { detail: " + aiResult + " }));";
                getBridge().getWebView().evaluateJavascript(js, null);
            });
        }
    }
}
