# Room generates classes referenced only by reflection at runtime.
-keep class * extends androidx.room.RoomDatabase { *; }
-dontwarn androidx.room.paging.**
