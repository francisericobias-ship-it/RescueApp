package com.rescuelinkapp

import com.facebook.react.*
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class BLEAdvertiserPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(BLEAdvertiserModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}