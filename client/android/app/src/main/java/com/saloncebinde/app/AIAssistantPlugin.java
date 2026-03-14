package com.saloncebinde.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AIAssistant")
public class AIAssistantPlugin extends Plugin {

    @PluginMethod
    public void syncStaffData(PluginCall call) {
        String token = call.getString("token");
        String baseUrl = call.getString("baseUrl");
        boolean isStaff = call.getBoolean("isStaff", false);

        SharedPreferences prefs = getContext().getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("auth_token", token);
        editor.putString("base_url", baseUrl);
        editor.putBoolean("is_staff", isStaff);
        editor.apply();

        call.resolve();
    }
}
