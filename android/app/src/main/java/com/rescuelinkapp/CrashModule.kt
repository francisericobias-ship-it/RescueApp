package com.rescuelinkapp

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*

class CrashModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "CrashModule"
    }

    @ReactMethod
    fun triggerCrashOverlay() {
        val intent = Intent(reactContext, CrashService::class.java)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent) // 🔥 Android 8+
        } else {
            reactContext.startService(intent)
        }
    }
}