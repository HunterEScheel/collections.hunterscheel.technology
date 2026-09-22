package com.kitchen.pantry.data

import java.util.UUID

/**
 * Rows carry a server-shaped id from the moment they are created locally, whether or
 * not syncing is ever switched on. That makes every push an idempotent upsert: the
 * client never has to wait for the server to hand an id back, and a push that is
 * retried after a lost connection cannot create a duplicate.
 */
fun newRemoteId(): String = UUID.randomUUID().toString()
