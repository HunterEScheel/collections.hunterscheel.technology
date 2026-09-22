package com.kitchen.pantry.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

// Schema export is off: it hands KSP an absolute path as a processor argument,
// and KSP rejects any argument containing whitespace, so the build breaks for
// anyone whose checkout sits under a directory with a space in its name. Turn
// it back on (with the androidx.room Gradle plugin and a schemaDirectory) when
// the first migration needs a schema to diff against.
@Database(entities = [PantryItem::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class PantryDatabase : RoomDatabase() {

    abstract fun pantryDao(): PantryDao

    companion object {
        @Volatile
        private var instance: PantryDatabase? = null

        fun get(context: Context): PantryDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                PantryDatabase::class.java,
                "pantry.db",
            ).build().also { instance = it }
        }
    }
}
