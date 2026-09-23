package com.hexmap.companion.overlay

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class OverlayModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "HexmapOverlayModule"

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactContext))
    }

    @ReactMethod
    fun requestOverlayPermission() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${reactContext.packageName}")
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
    }

    @ReactMethod
    fun startOverlay(promise: Promise) {
        if (!Settings.canDrawOverlays(reactContext)) {
            promise.resolve(false)
            return
        }
        val intent = Intent(reactContext, OverlayService::class.java)
        reactContext.startForegroundService(intent)
        promise.resolve(true)
    }

    @ReactMethod
    fun stopOverlay() {
        reactContext.startService(
            Intent(reactContext, OverlayService::class.java)
                .setAction(OverlayService.ACTION_STOP)
        )
    }

    @ReactMethod
    fun setOverlayMode(mode: String) {
        if (!OverlayService.isRunning) return
        reactContext.startService(
            Intent(reactContext, OverlayService::class.java)
                .setAction(OverlayService.ACTION_SET_MODE)
                .putExtra(OverlayService.EXTRA_MODE, mode)
        )
    }

    @ReactMethod
    fun setOverlayFocusable(focusable: Boolean) {
        if (!OverlayService.isRunning) return
        reactContext.startService(
            Intent(reactContext, OverlayService::class.java)
                .setAction(OverlayService.ACTION_SET_FOCUSABLE)
                .putExtra(OverlayService.EXTRA_FOCUSABLE, focusable)
        )
    }
}
