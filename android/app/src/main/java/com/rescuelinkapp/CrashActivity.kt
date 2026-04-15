package com.rescuelinkapp

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.WindowManager

class CrashActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        // 🔥 SAVE FLAG
        val prefs = getSharedPreferences("ReactNative", MODE_PRIVATE)
        prefs.edit().putString("OPEN_CRASH", "true").apply()

        val intent = packageManager.getLaunchIntentForPackage(packageName)
        intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        startActivity(intent)

        finish()
    }
}