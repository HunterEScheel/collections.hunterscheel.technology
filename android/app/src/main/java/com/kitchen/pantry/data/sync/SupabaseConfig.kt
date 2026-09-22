package com.kitchen.pantry.data.sync

import com.kitchen.pantry.BuildConfig

/**
 * Where the shared Supabase project lives. Both this app and mtg-collection-search
 * point at the same project, so one account covers both.
 *
 * The values come from `local.properties` at build time. Without them the app is a
 * perfectly good offline pantry tracker and the sync screen says so.
 */
object SupabaseConfig {
    val url: String = BuildConfig.SUPABASE_URL.trimEnd('/')
    val anonKey: String = BuildConfig.SUPABASE_ANON_KEY

    val isConfigured: Boolean get() = url.isNotBlank() && anonKey.isNotBlank()
}
