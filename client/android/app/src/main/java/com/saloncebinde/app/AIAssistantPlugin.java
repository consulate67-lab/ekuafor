package com.saloncebinde.app;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import android.media.MediaRecorder;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;

@CapacitorPlugin(
    name = "AIAssistant",
    permissions = {
        @Permission(
            alias = "audio",
            strings = {Manifest.permission.RECORD_AUDIO}
        ),
        @Permission(
            alias = "phone",
            strings = {Manifest.permission.READ_PHONE_STATE}
        ),
        @Permission(
            alias = "notifications",
            strings = {Manifest.permission.POST_NOTIFICATIONS}
        )
    }
)
public class AIAssistantPlugin extends Plugin {
    public static String lastAIResult = null;

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

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("audio") != PermissionState.GRANTED ||
            getPermissionState("phone") != PermissionState.GRANTED) {
            requestPermissionForAliases(new String[]{"audio", "phone", "notifications"}, call, "permissionsCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("audio", "granted");
            ret.put("phone", "granted");
            ret.put("notifications", "granted");
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("audio", getPermissionState("audio"));
        ret.put("phone", getPermissionState("phone"));
        ret.put("notifications", getPermissionState("notifications"));
        call.resolve(ret);
    }

    @PluginMethod
    public void getLastResult(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("result", lastAIResult);
        lastAIResult = null; // Clear after read
        call.resolve(ret);
    }
}
