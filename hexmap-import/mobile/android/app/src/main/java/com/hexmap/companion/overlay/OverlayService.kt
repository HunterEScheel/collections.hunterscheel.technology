package com.hexmap.companion.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.ReactContext
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * Foreground service that renders the "HexmapOverlay" React component in a
 * SYSTEM_ALERT_WINDOW so combat stays visible over other apps. Keeping this
 * service alive also keeps the shared React instance (and its Supabase
 * realtime socket) running after MainActivity is destroyed.
 */
class OverlayService : Service() {

    companion object {
        const val ACTION_SET_MODE = "com.hexmap.companion.overlay.SET_MODE"
        const val ACTION_SET_FOCUSABLE = "com.hexmap.companion.overlay.SET_FOCUSABLE"
        const val ACTION_STOP = "com.hexmap.companion.overlay.STOP"
        const val EXTRA_MODE = "mode"
        const val EXTRA_FOCUSABLE = "focusable"

        const val MODE_BUBBLE = "bubble"
        const val MODE_PANEL = "panel"

        private const val CHANNEL_ID = "overlay"
        private const val NOTIF_ID = 1

        var isRunning = false
            private set
    }

    private lateinit var windowManager: WindowManager
    private var container: DraggableFrameLayout? = null
    private var reactRootView: ReactRootView? = null
    private var params: WindowManager.LayoutParams? = null
    private var mode: String = MODE_BUBBLE
    private var reactListener: ReactInstanceEventListener? = null
    private var closeTarget: TextView? = null
    private var closeTargetParams: WindowManager.LayoutParams? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_SET_MODE -> {
                intent.getStringExtra(EXTRA_MODE)?.let { applyMode(it) }
                return START_STICKY
            }
            ACTION_SET_FOCUSABLE -> {
                setFocusable(intent.getBooleanExtra(EXTRA_FOCUSABLE, false))
                return START_STICKY
            }
        }

        // Default action: start the overlay.
        startAsForeground()
        if (container == null) attachOverlay()
        isRunning = true
        return START_STICKY
    }

    private fun startAsForeground() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "Combat overlay",
                    NotificationManager.IMPORTANCE_LOW
                )
            )
        }

        val stopIntent = PendingIntent.getService(
            this,
            0,
            Intent(this, OverlayService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification =
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Combat tracker running")
                .setContentText("Initiative overlay is active")
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .setOngoing(true)
                .addAction(
                    Notification.Action.Builder(null, "Stop", stopIntent).build()
                )
                .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIF_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    private fun attachOverlay() {
        val rim: ReactInstanceManager =
            (application as ReactApplication).reactNativeHost.reactInstanceManager

        val rootView = ReactRootView(this)
        reactRootView = rootView

        val frame = DraggableFrameLayout(this)
        frame.addView(
            rootView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        container = frame

        val lp = WindowManager.LayoutParams(
            dp(BUBBLE_SIZE_DP),
            dp(BUBBLE_SIZE_DP),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        )
        lp.gravity = Gravity.TOP or Gravity.START
        lp.x = dp(16)
        lp.y = dp(120)
        params = lp

        windowManager.addView(frame, lp)

        // The JS context may not exist yet if the service starts after
        // process death (e.g. relaunched from the notification).
        val context = rim.currentReactContext
        if (context != null) {
            rootView.startReactApplication(rim, "HexmapOverlay", null)
        } else {
            val listener = object : ReactInstanceEventListener {
                override fun onReactContextInitialized(context: ReactContext) {
                    rootView.startReactApplication(rim, "HexmapOverlay", null)
                    rim.removeReactInstanceEventListener(this)
                    reactListener = null
                }
            }
            reactListener = listener
            rim.addReactInstanceEventListener(listener)
            rim.createReactContextInBackground()
        }
    }

    private fun applyMode(newMode: String) {
        val lp = params ?: return
        val frame = container ?: return
        mode = newMode
        if (newMode == MODE_PANEL) {
            val display = resources.displayMetrics
            lp.width = minOf(dp(360), display.widthPixels - dp(16))
            lp.height = minOf(dp(520), (display.heightPixels * 0.7).roundToInt())
        } else {
            lp.width = dp(BUBBLE_SIZE_DP)
            lp.height = dp(BUBBLE_SIZE_DP)
            // Collapsing also drops keyboard focus.
            lp.flags = lp.flags or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        }
        frame.dragEnabled = newMode == MODE_BUBBLE
        windowManager.updateViewLayout(frame, lp)
    }

    private fun setFocusable(focusable: Boolean) {
        val lp = params ?: return
        val frame = container ?: return
        lp.flags = if (focusable) {
            lp.flags and WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE.inv()
        } else {
            lp.flags or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        }
        windowManager.updateViewLayout(frame, lp)
    }

    // --- Drag-to-dismiss close target ("X" at bottom center) ---

    private fun showCloseTarget() {
        if (closeTarget != null) return
        val size = dp(CLOSE_SIZE_DP)
        val view = TextView(this).apply {
            text = "✕"
            setTextColor(Color.WHITE)
            textSize = 22f
            gravity = Gravity.CENTER
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(0xCC1e1e36.toInt())
                setStroke(dp(2), 0xFFef4444.toInt())
            }
        }
        val lp = WindowManager.LayoutParams(
            size,
            size,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT
        )
        lp.gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
        lp.y = dp(CLOSE_MARGIN_BOTTOM_DP)
        closeTarget = view
        closeTargetParams = lp
        windowManager.addView(view, lp)
    }

    private fun hideCloseTarget() {
        closeTarget?.let {
            try {
                windowManager.removeView(it)
            } catch (_: Exception) {}
        }
        closeTarget = null
        closeTargetParams = null
    }

    /** True when the bubble's center is within the dismiss radius of the X. */
    private fun isOverCloseTarget(): Boolean {
        val lp = params ?: return false
        val dm = resources.displayMetrics
        val bubbleCx = lp.x + lp.width / 2f
        val bubbleCy = lp.y + lp.height / 2f
        val targetCx = dm.widthPixels / 2f
        val targetCy =
            dm.heightPixels - dp(CLOSE_MARGIN_BOTTOM_DP) - dp(CLOSE_SIZE_DP) / 2f
        val radius = dp(CLOSE_SNAP_RADIUS_DP).toFloat()
        val dx = bubbleCx - targetCx
        val dy = bubbleCy - targetCy
        return dx * dx + dy * dy <= radius * radius
    }

    private fun setCloseTargetHot(hot: Boolean) {
        closeTarget?.apply {
            scaleX = if (hot) 1.3f else 1f
            scaleY = if (hot) 1.3f else 1f
        }
    }

    override fun onDestroy() {
        isRunning = false
        hideCloseTarget()
        reactListener?.let {
            try {
                (application as ReactApplication)
                    .reactNativeHost.reactInstanceManager
                    .removeReactInstanceEventListener(it)
            } catch (_: Exception) {}
        }
        container?.let {
            try {
                windowManager.removeView(it)
            } catch (_: Exception) {}
        }
        reactRootView?.unmountReactApplication()
        reactRootView = null
        container = null
        params = null
        super.onDestroy()
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).roundToInt()

    /**
     * Wrapper that drags the whole overlay window when the user moves beyond
     * touch slop (bubble mode only); shorter touches pass through to React.
     */
    inner class DraggableFrameLayout(context: Context) : FrameLayout(context) {
        var dragEnabled = true

        private val slop = ViewConfiguration.get(context).scaledTouchSlop
        private var downRawX = 0f
        private var downRawY = 0f
        private var startX = 0
        private var startY = 0
        private var dragging = false

        override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
            if (!dragEnabled) return false
            when (ev.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downRawX = ev.rawX
                    downRawY = ev.rawY
                    startX = params?.x ?: 0
                    startY = params?.y ?: 0
                    dragging = false
                }
                MotionEvent.ACTION_MOVE -> {
                    if (abs(ev.rawX - downRawX) > slop || abs(ev.rawY - downRawY) > slop) {
                        dragging = true
                        showCloseTarget()
                        return true
                    }
                }
            }
            return false
        }

        override fun onTouchEvent(ev: MotionEvent): Boolean {
            if (!dragEnabled || !dragging) return super.onTouchEvent(ev)
            when (ev.actionMasked) {
                MotionEvent.ACTION_MOVE -> {
                    val lp = params ?: return true
                    lp.x = startX + (ev.rawX - downRawX).roundToInt()
                    lp.y = startY + (ev.rawY - downRawY).roundToInt()
                    windowManager.updateViewLayout(this, lp)
                    setCloseTargetHot(isOverCloseTarget())
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    val dismiss =
                        ev.actionMasked == MotionEvent.ACTION_UP && isOverCloseTarget()
                    dragging = false
                    hideCloseTarget()
                    if (dismiss) stopSelf()
                }
            }
            return true
        }
    }
}

private const val BUBBLE_SIZE_DP = 64
private const val CLOSE_SIZE_DP = 56
private const val CLOSE_MARGIN_BOTTOM_DP = 48
private const val CLOSE_SNAP_RADIUS_DP = 80
