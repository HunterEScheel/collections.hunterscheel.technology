package com.kitchen.pantry.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/** What kind of row a tombstone stands for. */
enum class SyncEntity { ITEM, RECIPE }

/**
 * A row that was deleted locally and whose deletion still has to reach the server.
 *
 * Deletions are recorded here rather than by flagging rows as deleted in place: every
 * existing query keeps working untouched, with no risk of one forgetting to filter
 * the dead rows out.
 */
@Entity(tableName = "sync_tombstones")
data class SyncTombstone(
    @PrimaryKey @ColumnInfo(name = "remote_id") val remoteId: String,
    val entity: SyncEntity,
    @ColumnInfo(name = "deleted_at") val deletedAt: Long = System.currentTimeMillis(),
)
