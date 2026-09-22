package com.kitchen.pantry.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kitchen.pantry.ui.SyncStage
import com.kitchen.pantry.ui.SyncViewModel
import java.text.DateFormat
import java.util.Date

/**
 * The account screen. The same login works in the MTG collection app — both point at
 * one Supabase project — and a six-digit emailed code is used rather than a magic
 * link, because a code needs no deep link to find its way back into the app.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncScreen(viewModel: SyncViewModel, onBack: () -> Unit) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sync") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when (state.stage) {
                SyncStage.NOT_CONFIGURED -> {
                    Text("Syncing is switched off", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "This build has no Supabase project attached, so the kitchen " +
                            "lives on this phone alone — which works perfectly well. To " +
                            "turn syncing on, put supabase.url and supabase.anonKey in " +
                            "local.properties and rebuild. See the README.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                SyncStage.SIGNED_OUT -> {
                    Text("Sign in", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "The same account as your collection app. We'll email you a code.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = state.email,
                        onValueChange = viewModel::setEmail,
                        label = { Text("Email") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = viewModel::requestCode,
                        enabled = state.canRequestCode,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Email me a code") }
                }

                SyncStage.CODE_SENT -> {
                    Text("Enter the code", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Sent to ${state.email}.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = state.code,
                        onValueChange = viewModel::setCode,
                        label = { Text("Six-digit code") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Button(
                        onClick = viewModel::verifyCode,
                        enabled = state.canVerify,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Sign in") }
                    TextButton(onClick = viewModel::requestCode) { Text("Send another code") }
                }

                SyncStage.SIGNED_IN -> {
                    Text("Signed in", style = MaterialTheme.typography.titleMedium)
                    Text(
                        state.email.ifBlank { "this device" },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(
                        text = lastSyncedLine(state.lastSyncedAt),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Button(
                        onClick = viewModel::syncNow,
                        enabled = !state.busy,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Sync now") }
                    OutlinedButton(
                        onClick = viewModel::signOut,
                        enabled = !state.busy,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Sign out") }
                    Text(
                        "Your pantry stays on this phone either way. Syncing just copies " +
                            "it to your account so another device sees the same kitchen.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (state.busy) {
                CircularProgressIndicator(modifier = Modifier.padding(top = 8.dp))
            }

            state.message?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
            }
            state.error?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.error)
            }
            if (state.message != null || state.error != null) {
                TextButton(onClick = viewModel::dismissMessage) { Text("Dismiss") }
            }
        }
    }
}

private fun lastSyncedLine(lastSyncedAt: Long): String =
    if (lastSyncedAt == 0L) {
        "Not synced yet"
    } else {
        "Last synced ${DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT)
            .format(Date(lastSyncedAt))}"
    }
