package com.kitchen.pantry.data.sync

/**
 * The conflict rules, as pure functions so they can be read and tested on their own.
 *
 * The model is last-write-wins per row, with the push happening before the pull:
 * anything edited locally has already gone up by the time remote rows are applied, so
 * a row that is still dirty when a remote change arrives means someone edited it on
 * another device while this push was failing. Local edits are the ones the user made
 * most recently on *this* phone, so they are kept and will win on the next push.
 */
object SyncRules {

    /** Whether an incoming remote row should overwrite the local one. */
    fun shouldApply(localExists: Boolean, localIsDirty: Boolean): Boolean =
        !localExists || !localIsDirty

    /**
     * The cursor to ask for next time. Server timestamps come back as ISO-8601 and
     * sort lexicographically once normalised, so the newest string in the batch is
     * the high-water mark; an empty batch leaves the cursor where it was.
     */
    fun nextCursor(current: String?, seen: List<String?>): String? =
        seen.filterNotNull().maxOrNull()?.takeIf { current == null || it > current } ?: current
}
