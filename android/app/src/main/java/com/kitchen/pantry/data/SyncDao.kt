package com.kitchen.pantry.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface SyncDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun record(tombstone: SyncTombstone)

    @Query("SELECT * FROM sync_tombstones")
    suspend fun pending(): List<SyncTombstone>

    @Query("DELETE FROM sync_tombstones WHERE remote_id IN (:remoteIds)")
    suspend fun clear(remoteIds: List<String>)

    @Query("DELETE FROM sync_tombstones")
    suspend fun clearAll()
}
