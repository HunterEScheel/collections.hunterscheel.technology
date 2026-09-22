package com.kitchen.pantry.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface PantryDao {

    @Query("SELECT * FROM pantry_items ORDER BY name COLLATE NOCASE ASC")
    fun observeAll(): Flow<List<PantryItem>>

    @Query("SELECT * FROM pantry_items WHERE id = :id")
    fun observeById(id: Long): Flow<PantryItem?>

    @Query("SELECT * FROM pantry_items WHERE id = :id")
    suspend fun findById(id: Long): PantryItem?

    @Query("SELECT COUNT(*) FROM pantry_items")
    suspend fun count(): Int

    @Upsert
    suspend fun upsert(item: PantryItem): Long

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insertAll(items: List<PantryItem>)

    @Update
    suspend fun update(item: PantryItem)

    @Delete
    suspend fun delete(item: PantryItem)

    @Query("DELETE FROM pantry_items")
    suspend fun deleteAll()

    @Query("UPDATE pantry_items SET quantity = :quantity, updated_at = :updatedAt WHERE id = :id")
    suspend fun setQuantity(id: Long, quantity: Double, updatedAt: Long)
}
