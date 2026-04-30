package com.rescuelinkapp

import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.*
import android.os.ParcelUuid
import android.util.Log
import com.facebook.react.bridge.*
import java.nio.charset.Charset
import java.util.*

class BLEAdvertiserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var advertiser: BluetoothLeAdvertiser? = null
    private var callback: AdvertiseCallback? = null

    override fun getName() = "BLEAdvertiser"

    @ReactMethod
    fun startAdvertising(data: String) {
        val adapter = BluetoothAdapter.getDefaultAdapter()

        if (adapter == null || !adapter.isEnabled) {
            Log.e("BLE", "Bluetooth is OFF")
            return
        }

        advertiser = adapter.bluetoothLeAdvertiser

        // 🔥 STOP muna if already running
        stopAdvertising()

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setConnectable(false)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .build()

        val serviceUUID = ParcelUuid(UUID.fromString("000018FF-0000-1000-8000-00805F9B34FB"))

        val advertiseData = AdvertiseData.Builder()
            .addServiceUuid(serviceUUID)
            .addServiceData(
                serviceUUID,
                data.toByteArray(Charset.forName("UTF-8")) // ✅ FIX encoding
            )
            .build()

        callback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
                Log.d("BLE", "✅ Advertising started")
            }

            override fun onStartFailure(errorCode: Int) {
                Log.e("BLE", "❌ Advertising failed: $errorCode")
            }
        }

        advertiser?.startAdvertising(settings, advertiseData, callback)
    }

    @ReactMethod
    fun stopAdvertising() {
        if (advertiser != null && callback != null) {
            advertiser?.stopAdvertising(callback)
            Log.d("BLE", "🛑 Advertising stopped")
        }
    }
}