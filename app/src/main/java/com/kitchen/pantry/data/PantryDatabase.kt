package com.kitchen.pantry.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(entities = [PantryItem::class], version = 1, exportSchema = true)
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
