package com.kitchen.pantry.data.sync

import com.kitchen.pantry.data.PantryDao
import com.kitchen.pantry.data.RecipeDao
import com.kitchen.pantry.data.SyncDao
import com.kitchen.pantry.data.SyncEntity
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import java.time.Instant

/** What a sync run did, for the screen to report. */
data class SyncResult(
    val pushed: Int,
    val pulled: Int,
    val deleted: Int,
)

/**
 * Push, then pull.
 *
 * Pushing first means the server always has this device's edits before any remote row
 * is applied on top, which is what makes the conflict rule in [SyncRules] honest
 * rather than a coin toss.
 */
class SyncEngine(
    private val pantryDao: PantryDao,
    private val recipeDao: RecipeDao,
    private val syncDao: SyncDao,
    private val client: SupabaseClient,
    private val session: SessionStore,
) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    suspend fun sync(): SyncResult {
        check(SupabaseConfig.isConfigured) { "Supabase is not configured for this build" }
        val userId = session.userId ?: error("Sign in first")

        val deleted = pushDeletions(userId)
        val pushed = pushChanges(userId)
        val pulled = pull()

        session.lastSyncedAt = System.currentTimeMillis()
        return SyncResult(pushed = pushed, pulled = pulled, deleted = deleted)
    }

    /** Tombstones become soft deletes on the server, then stop being our problem. */
    private suspend fun pushDeletions(userId: String): Int {
        val tombstones = syncDao.pending()
        if (tombstones.isEmpty()) return 0

        val now = Instant.now().toString()
        tombstones.groupBy { it.entity }.forEach { (entity, rows) ->
            val payload = rows.map {
                RemoteDeletion(id = it.remoteId, userId = userId, deletedAt = now)
            }
            client.upsert(tableFor(entity), json.encodeToString(payload))
        }
        syncDao.clear(tombstones.map { it.remoteId })
        return tombstones.size
    }

    private suspend fun pushChanges(userId: String): Int {
        var count = 0

        val items = pantryDao.pendingPush()
        if (items.isNotEmpty()) {
            client.upsert(TABLE_ITEMS, json.encodeToString(items.map { it.toRemote(userId) }))
            pantryDao.markClean(items.map { it.remoteId })
            count += items.size
        }

        val recipes = recipeDao.pendingPush()
        if (recipes.isNotEmpty()) {
            client.upsert(TABLE_RECIPES, json.encodeToString(recipes.map { it.toRemote(userId) }))
            recipeDao.markClean(recipes.map { it.recipe.remoteId })
            count += recipes.size
        }

        return count
    }

    private suspend fun pull(): Int {
        val cursor = session.cursor
        val seen = mutableListOf<String?>()
        var applied = 0

        val remoteItems: List<RemoteItem> =
            json.decodeFromString(client.changedSince(TABLE_ITEMS, cursor))
        for (remote in remoteItems) {
            seen += remote.updatedAt
            val local = pantryDao.findByRemoteId(remote.id)
            if (!SyncRules.shouldApply(local != null, local?.dirty == true)) continue

            if (remote.deletedAt != null) {
                if (local != null) {
                    pantryDao.deleteByRemoteId(remote.id)
                    applied++
                }
                continue
            }
            pantryDao.upsert(remote.toLocal(local?.id ?: 0L, System.currentTimeMillis()))
            applied++
        }

        val remoteRecipes: List<RemoteRecipe> =
            json.decodeFromString(client.changedSince(TABLE_RECIPES, cursor))
        for (remote in remoteRecipes) {
            seen += remote.updatedAt
            val local = recipeDao.findByRemoteId(remote.id)
            if (!SyncRules.shouldApply(local != null, local?.recipe?.dirty == true)) continue

            if (remote.deletedAt != null) {
                if (local != null) {
                    recipeDao.deleteByRemoteId(remote.id)
                    applied++
                }
                continue
            }
            val localId = local?.recipe?.id ?: 0L
            recipeDao.saveRecipe(
                remote.toLocalRecipe(localId, System.currentTimeMillis()),
                remote.toLocalIngredients(localId),
            )
            applied++
        }

        session.cursor = SyncRules.nextCursor(cursor, seen)
        return applied
    }

    private fun tableFor(entity: SyncEntity): String = when (entity) {
        SyncEntity.ITEM -> TABLE_ITEMS
        SyncEntity.RECIPE -> TABLE_RECIPES
    }

    private companion object {
        const val TABLE_ITEMS = "kitchen_items"
        const val TABLE_RECIPES = "kitchen_recipes"
    }
}
