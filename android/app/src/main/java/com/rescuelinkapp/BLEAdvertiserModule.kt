// BLEAdvertiserModule.kt - Gamit ang Device Name para magdala ng data

package com.rescuelinkapp

import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.*
import android.os.ParcelUuid
import android.util.Log
import com.facebook.react.bridge.*
import java.lang.reflect.Method
import java.util.*

class BLEAdvertiserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var advertiser: BluetoothLeAdvertiser? = null
    private var advertiseCallback: AdvertiseCallback? = null
    private var scanCallback: ScanCallback? = null
    private var isAdvertising = false
    private var foundDevices = mutableListOf<WritableMap>()
    private var originalDeviceName: String? = null

    override fun getName() = "BLEAdvertiser"

    @ReactMethod
    fun startAdvertising(data: String, promise: Promise) {
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter()
            
            if (adapter == null || !adapter.isEnabled) {
                promise.reject("BLUETOOTH_OFF", "Bluetooth is OFF")
                return
            }
            
            stopAdvertising()
            
            // I-save ang original device name
            if (originalDeviceName == null) {
                originalDeviceName = adapter.name
            }
            
            // ✅ PALITAN ANG DEVICE NAME sa short message
            val shortName = if (data.length > 20) data.substring(0, 20) else data
            setDeviceName(adapter, shortName)
            
            advertiser = adapter.bluetoothLeAdvertiser
            if (advertiser == null) {
                promise.reject("NOT_SUPPORTED", "Device does not support BLE advertising")
                return
            }
            
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(false)
                .setTimeout(0)
                .build()
            
            val advertiseData = AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .build()
            
            advertiseCallback = object : AdvertiseCallback() {
                override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                    isAdvertising = true
                    Log.d("BLE", "✅ Advertising started with name: $shortName")
                    promise.resolve("Advertising started")
                }
                
                override fun onStartFailure(errorCode: Int) {
                    isAdvertising = false
                    Log.e("BLE", "Advertising failed: $errorCode")
                    promise.reject("ADVERTISE_FAILED", "Error code: $errorCode")
                }
            }
            
            advertiser?.startAdvertising(settings, advertiseData, advertiseCallback)
            
        } catch (e: Exception) {
            Log.e("BLE", "Error: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }
    
    // ✅ GAMITIN ANG REFLECTION PARA PALITAN ANG DEVICE NAME
    private fun setDeviceName(adapter: BluetoothAdapter, name: String) {
        try {
            val setMethod = adapter.javaClass.getDeclaredMethod("setName", String::class.java)
            setMethod.isAccessible = true
            setMethod.invoke(adapter, name)
            Log.d("BLE", "Device name changed to: $name")
        } catch (e: Exception) {
            Log.e("BLE", "Failed to set device name: ${e.message}")
        }
    }
    
    @ReactMethod
    fun stopAdvertising() {
        try {
            if (advertiser != null && advertiseCallback != null) {
                advertiser?.stopAdvertising(advertiseCallback)
                isAdvertising = false
                
                // I-restore ang original device name
                val adapter = BluetoothAdapter.getDefaultAdapter()
                if (adapter != null && originalDeviceName != null) {
                    setDeviceName(adapter, originalDeviceName!!)
                }
                Log.d("BLE", "Advertising stopped")
            }
        } catch (e: Exception) {
            Log.e("BLE", "Stop error: ${e.message}")
        }
    }
    
    @ReactMethod
    fun startScanning(promise: Promise) {
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter()
            if (adapter == null || !adapter.isEnabled) {
                promise.reject("BLUETOOTH_OFF", "Bluetooth is OFF")
                return
            }

            val scanner = adapter.bluetoothLeScanner
            if (scanner == null) {
                promise.reject("SCANNER_NULL", "Scanner not available")
                return
            }

            foundDevices.clear()

            val settings = ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build()

            scanCallback = object : ScanCallback() {
                override fun onScanResult(callbackType: Int, result: ScanResult) {
                    val device = result.device
                    val rssi = result.rssi
                    // ✅ KUNIN ANG DEVICE NAME (ito ang nagdadala ng data)
                    val deviceName = device.name ?: "Unknown"
                    
                    // Check kung emergency format (nagsisimula sa "E|")
                    val isEmergency = deviceName.startsWith("E|")
                    
                    Log.d("BLE", "📱 Found: $deviceName (RSSI: $rssi) - Emergency: $isEmergency")
                    
                    val deviceInfo = Arguments.createMap().apply {
                        putString("id", device.address)
                        putString("name", deviceName)
                        putInt("rssi", rssi)
                        putString("data", if (isEmergency) deviceName else "")
                    }
                    
                    val exists = foundDevices.any { it.getString("id") == device.address }
                    if (!exists) {
                        foundDevices.add(deviceInfo)
                    }
                }

                override fun onScanFailed(errorCode: Int) {
                    Log.e("BLE", "Scan failed: $errorCode")
                    promise.reject("SCAN_FAILED", "Error code: $errorCode")
                }
            }

            scanner.startScan(null, settings, scanCallback)
            
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                stopScanning()
                val result = Arguments.createArray()
                foundDevices.forEach { result.pushMap(it) }
                Log.d("BLE", "Scan complete. Found ${foundDevices.size} devices")
                promise.resolve(result)
            }, 15000)
            
        } catch (e: Exception) {
            Log.e("BLE", "Scan error: ${e.message}")
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun stopScanning() {
        try {
            val adapter = BluetoothAdapter.getDefaultAdapter()
            val scanner = adapter?.bluetoothLeScanner
            if (scanner != null && scanCallback != null) {
                scanner.stopScan(scanCallback)
                Log.d("BLE", "Scanning stopped")
            }
        } catch (e: Exception) {
            Log.e("BLE", "Stop scan error: ${e.message}")
        }
    }
    
    @ReactMethod
    fun isAdvertising(promise: Promise) {
        promise.resolve(isAdvertising)
    }
}