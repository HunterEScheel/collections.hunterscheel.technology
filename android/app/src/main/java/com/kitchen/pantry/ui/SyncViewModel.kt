package com.kitchen.pantry.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.kitchen.pantry.data.sync.SessionStore
import com.kitchen.pantry.data.sync.SupabaseClient
import com.kitchen.pantry.data.sync.SupabaseConfig
import com.kitchen.pantry.data.sync.SyncEngine
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Where the account screen is in the sign-in dance. */
enum class SyncStage { NOT_CONFIGURED, SIGNED_OUT, CODE_SENT, SIGNED_IN }

data class SyncUiState(
    val stage: SyncStage = SyncStage.SIGNED_OUT,
    val email: String = "",
    val code: String = "",
    val busy: Boolean = false,
    val message: String? = null,
    val error: String? = null,
    val lastSyncedAt: Long = 0L,
) {
    val canRequestCode: Boolean get() = !busy && email.contains("@") && email.length > 3
    val canVerify: Boolean get() = !busy && code.trim().length >= 6
}

class SyncViewModel(
    private val client: SupabaseClient,
    private val engine: SyncEngine,
    private val session: SessionStore,
) : ViewModel() {

    private val _state = MutableStateFlow(initialState())
    val state: StateFlow<SyncUiState> = _state.asStateFlow()

    private fun initialState(): SyncUiState {
        val stage = when {
            !SupabaseConfig.isConfigured -> SyncStage.NOT_CONFIGURED
            session.isSignedIn -> SyncStage.SIGNED_IN
            else -> SyncStage.SIGNED_OUT
        }
        return SyncUiState(
            stage = stage,
            email = session.email.orEmpty(),
            lastSyncedAt = session.lastSyncedAt,
        )
    }

    fun setEmail(value: String) = _state.update { it.copy(email = value, error = null) }
    fun setCode(value: String) = _state.update { it.copy(code = value, error = null) }

    fun requestCode() {
        val email = _state.value.email.trim()
        run("Check your email for the code") {
            client.requestCode(email)
            _state.update { it.copy(stage = SyncStage.CODE_SENT) }
        }
    }

    fun verifyCode() {
        val current = _state.value
        run("Signed in") {
            client.verifyCode(current.email.trim(), current.code)
            _state.update { it.copy(stage = SyncStage.SIGNED_IN, code = "") }
            syncNow()
        }
    }

    fun syncNow() {
        run(null) {
            val result = runCatching { engine.sync() }.recoverCatching { failure ->
                // An expired access token is the ordinary case, not an error worth
                // showing: refresh once and try the whole run again.
                if (client.refreshSession()) engine.sync() else throw failure
            }.getOrThrow()

            _state.update {
                it.copy(
                    lastSyncedAt = session.lastSyncedAt,
                    message = "Sent ${result.pushed}, received ${result.pulled}" +
                        if (result.deleted > 0) ", removed ${result.deleted}" else "",
                )
            }
        }
    }

    fun signOut() {
        session.clear()
        _state.value = initialState().copy(message = "Signed out")
    }

    fun dismissMessage() = _state.update { it.copy(message = null, error = null) }

    private fun run(success: String?, block: suspend () -> Unit) {
        if (_state.value.busy) return
        _state.update { it.copy(busy = true, error = null, message = null) }
        viewModelScope.launch {
            try {
                block()
                if (success != null) _state.update { it.copy(message = success) }
            } catch (failure: Exception) {
                _state.update { it.copy(error = failure.message ?: "That didn't work") }
            } finally {
                _state.update { it.copy(busy = false) }
            }
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                SyncViewModel(
                    client = kitchenApp.supabaseClient,
                    engine = kitchenApp.syncEngine,
                    session = kitchenApp.sessionStore,
                )
            }
        }
    }
}
