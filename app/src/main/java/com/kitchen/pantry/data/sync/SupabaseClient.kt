package com.kitchen.pantry.data.sync

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/** A request the server refused, carrying whatever it said about why. */
class SupabaseException(message: String) : IOException(message)

/**
 * A deliberately small Supabase client: the two auth calls and the two table calls
 * this app needs, over OkHttp. The official SDK would pull in a stack of transitive
 * dependencies to replace about a hundred lines of HTTP.
 */
class SupabaseClient(
    private val session: SessionStore,
    private val http: OkHttpClient = defaultHttp(),
) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val jsonMedia = "application/json".toMediaType()

    // --- auth: an emailed six-digit code, which needs no deep link to come back to ---

    suspend fun requestCode(email: String) = withContext(Dispatchers.IO) {
        val body = buildJsonObject {
            put("email", email)
            put("create_user", true)
        }
        post("${SupabaseConfig.url}/auth/v1/otp", body, authorized = false)
        Unit
    }

    suspend fun verifyCode(email: String, code: String) = withContext(Dispatchers.IO) {
        val body = buildJsonObject {
            put("email", email)
            put("token", code.trim())
            put("type", "email")
        }
        val response = post("${SupabaseConfig.url}/auth/v1/verify", body, authorized = false)
        val parsed = json.parseToJsonElement(response).jsonObject
        val accessToken = parsed["access_token"]?.jsonPrimitive?.content
            ?: throw SupabaseException("The server sent no access token back")
        val userId = parsed["user"]?.jsonObject?.get("id")?.jsonPrimitive?.content
            ?: throw SupabaseException("The server sent no user back")
        session.save(
            accessToken = accessToken,
            refreshToken = parsed["refresh_token"]?.jsonPrimitive?.content,
            userId = userId,
            email = email,
        )
    }

    /** Trades the refresh token for a fresh access token. False when it has expired. */
    suspend fun refreshSession(): Boolean = withContext(Dispatchers.IO) {
        val refresh = session.refreshToken ?: return@withContext false
        val body = buildJsonObject { put("refresh_token", refresh) }
        val response = runCatching {
            post(
                "${SupabaseConfig.url}/auth/v1/token?grant_type=refresh_token",
                body,
                authorized = false,
            )
        }.getOrElse { return@withContext false }

        val parsed = json.parseToJsonElement(response).jsonObject
        val accessToken = parsed["access_token"]?.jsonPrimitive?.content
            ?: return@withContext false
        session.save(
            accessToken = accessToken,
            refreshToken = parsed["refresh_token"]?.jsonPrimitive?.content ?: refresh,
            userId = parsed["user"]?.jsonObject?.get("id")?.jsonPrimitive?.content
                ?: session.userId.orEmpty(),
            email = session.email,
        )
        true
    }

    // --- tables ---

    /** Rows of [table] this account has touched since [cursor], deletions included. */
    suspend fun changedSince(table: String, cursor: String?): String = withContext(Dispatchers.IO) {
        val filter = if (cursor == null) "" else "&updated_at=gt.$cursor"
        get("${SupabaseConfig.url}/rest/v1/$table?select=*$filter&order=updated_at.asc")
    }

    /** Upserts rows by primary key. The body is a JSON array of rows. */
    suspend fun upsert(table: String, body: String) = withContext(Dispatchers.IO) {
        request(
            Request.Builder()
                .url("${SupabaseConfig.url}/rest/v1/$table")
                .post(body.toRequestBody(jsonMedia))
                .header("Prefer", "resolution=merge-duplicates,return=minimal"),
        )
        Unit
    }

    // --- plumbing ---

    private fun post(url: String, body: JsonObject, authorized: Boolean): String = request(
        Request.Builder()
            .url(url)
            .post(body.toString().toRequestBody(jsonMedia)),
        authorized = authorized,
    )

    private fun get(url: String): String = request(Request.Builder().url(url).get())

    private fun request(builder: Request.Builder, authorized: Boolean = true): String {
        builder.header("apikey", SupabaseConfig.anonKey)
        builder.header("Content-Type", "application/json")
        val token = if (authorized) session.accessToken else null
        builder.header("Authorization", "Bearer ${token ?: SupabaseConfig.anonKey}")

        http.newCall(builder.build()).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw SupabaseException(describe(response.code, body))
            }
            return body
        }
    }

    /** Turns a failure into something worth showing a person. */
    private fun describe(code: Int, body: String): String {
        val detail = runCatching {
            val parsed = json.parseToJsonElement(body).jsonObject
            parsed["message"]?.jsonPrimitive?.content
                ?: parsed["error_description"]?.jsonPrimitive?.content
                ?: parsed["msg"]?.jsonPrimitive?.content
        }.getOrNull()
        return when {
            detail != null -> detail
            code == 401 -> "Signed out — sign in again"
            else -> "The server said $code"
        }
    }

    companion object {
        fun defaultHttp(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }
}
