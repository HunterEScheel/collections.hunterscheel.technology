package com.kitchen.pantry.data

import kotlinx.coroutines.flow.Flow
import kotlin.math.max

/** The single door between the UI and the database. */
class PantryRepository(private val dao: PantryDao, private val sync: SyncDao) {

    fun observeAll(): Flow<List<PantryItem>> = dao.observeAll()

    fun observeItem(id: Long): Flow<PantryItem?> = dao.observeById(id)

    suspend fun find(id: Long): PantryItem? = dao.findById(id)

    suspend fun save(item: PantryItem): Long =
        dao.upsert(item.copy(updatedAt = System.currentTimeMillis(), dirty = true))

    /** Deleting leaves a tombstone, so the deletion reaches the other devices too. */
    suspend fun delete(item: PantryItem) {
        dao.delete(item)
        sync.record(SyncTombstone(remoteId = item.remoteId, entity = SyncEntity.ITEM))
    }

    /** Nudges a quantity by [delta], clamped at zero so stock never goes negative. */
    suspend fun adjustQuantity(item: PantryItem, delta: Double) {
        dao.setQuantity(item.id, max(0.0, item.quantity + delta), System.currentTimeMillis())
    }

    suspend fun setQuantity(item: PantryItem, quantity: Double) {
        dao.setQuantity(item.id, max(0.0, quantity), System.currentTimeMillis())
    }

    /** Fills an empty pantry with common staples. No-op if anything is already there. */
    suspend fun seedStarterPantryIfEmpty(): Boolean {
        if (dao.count() > 0) return false
        dao.insertAll(starterPantry())
        return true
    }

    suspend fun clearAll() = dao.deleteAll()
}
