package com.kitchen.pantry.data.sync

import android.content.Context
import androidx.core.content.edit

/**
 * The signed-in session and the pull cursor.
 *
 * Tokens sit in the app's private preferences: they are scoped to this app's sandbox,
 * and the alternative — an encrypted store — buys little against an attacker who
 * already has that sandbox, while adding a dependency and a key to lose.
 */
class SessionStore(context: Context) {

    private val prefs = context.getSharedPreferences("kitchen_sync", Context.MODE_PRIVATE)

    var accessToken: String?
        get() = prefs.getString(KEY_ACCESS, null)
        set(value) = prefs.edit { putString(KEY_ACCESS, value) }

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH, null)
        set(value) = prefs.edit { putString(KEY_REFRESH, value) }

    var userId: String?
        get() = prefs.getString(KEY_USER, null)
        set(value) = prefs.edit { putString(KEY_USER, value) }

    var email: String?
        get() = prefs.getString(KEY_EMAIL, null)
        set(value) = prefs.edit { putString(KEY_EMAIL, value) }

    /** Highest server `updated_at` already pulled, as the server wrote it. */
    var cursor: String?
        get() = prefs.getString(KEY_CURSOR, null)
        set(value) = prefs.edit { putString(KEY_CURSOR, value) }

    var lastSyncedAt: Long
        get() = prefs.getLong(KEY_LAST_SYNC, 0L)
        set(value) = prefs.edit { putLong(KEY_LAST_SYNC, value) }

    val isSignedIn: Boolean get() = accessToken != null && userId != null

    fun save(accessToken: String, refreshToken: String?, userId: String, email: String?) {
        prefs.edit {
            putString(KEY_ACCESS, accessToken)
            putString(KEY_REFRESH, refreshToken)
            putString(KEY_USER, userId)
            putString(KEY_EMAIL, email)
        }
    }

    /** Signing out forgets the cursor too, so the next account pulls from scratch. */
    fun clear() = prefs.edit { clear() }

    private companion object {
        const val KEY_ACCESS = "access_token"
        const val KEY_REFRESH = "refresh_token"
        const val KEY_USER = "user_id"
        const val KEY_EMAIL = "email"
        const val KEY_CURSOR = "cursor"
        const val KEY_LAST_SYNC = "last_synced_at"
    }
}
