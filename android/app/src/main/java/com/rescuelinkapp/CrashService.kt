package com.rescuelinkapp

import android.app.Service
import android.content.Intent
import android.os.IBinder

class CrashService : Service() {

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {

        // 🔥 OPEN ACTIVITY EVERY TIME
        val activityIntent = Intent(this, CrashActivity::class.java)
        activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        startActivity(activityIntent)

        stopSelf()
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}