package com.kitchen.pantry.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

// Schema export is off: it hands KSP an absolute path as a processor argument,
// and KSP rejects any argument containing whitespace, so the build breaks for
// anyone whose checkout sits under a directory with a space in its name. Turn
// it back on (with the androidx.room Gradle plugin and a schemaDirectory) when
// the first migration needs a schema to diff against.
@Database(
    entities = [PantryItem::class, Recipe::class, RecipeIngredient::class],
    version = 3,
    exportSchema = false,
)
@TypeConverters(Converters::class)
abstract class PantryDatabase : RoomDatabase() {

    abstract fun pantryDao(): PantryDao

    abstract fun recipeDao(): RecipeDao

    companion object {
        /** Adds the per-item "increment by" override; 0 keeps the unit's own step. */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE pantry_items ADD COLUMN step REAL NOT NULL DEFAULT 0")
            }
        }

        /** Adds the recipe book. */
        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS recipes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        name TEXT NOT NULL,
                        servings INTEGER NOT NULL,
                        notes TEXT NOT NULL,
                        planned INTEGER NOT NULL,
                        updated_at INTEGER NOT NULL
                    )
                    """.trimIndent(),
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS recipe_ingredients (
                        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        recipe_id INTEGER NOT NULL,
                        name TEXT NOT NULL,
                        quantity REAL NOT NULL,
                        unit TEXT NOT NULL,
                        position INTEGER NOT NULL,
                        FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
                    )
                    """.trimIndent(),
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS index_recipe_ingredients_recipe_id " +
                        "ON recipe_ingredients (recipe_id)",
                )
            }
        }

        @Volatile
        private var instance: PantryDatabase? = null

        fun get(context: Context): PantryDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                PantryDatabase::class.java,
                "pantry.db",
            ).addMigrations(MIGRATION_1_2, MIGRATION_2_3).build().also { instance = it }
        }
    }
}
