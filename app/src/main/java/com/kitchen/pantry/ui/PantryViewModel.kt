package com.kitchen.pantry.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.kitchen.pantry.KitchenApp
import com.kitchen.pantry.data.Category
import com.kitchen.pantry.data.PantryFilter
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.PantryRepository
import com.kitchen.pantry.data.SortOrder
import com.kitchen.pantry.data.StockStatus
import com.kitchen.pantry.data.applyFilter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Everything the two list screens need to draw themselves. */
data class PantryUiState(
    val loading: Boolean = true,
    val allItems: List<PantryItem> = emptyList(),
    val visibleItems: List<PantryItem> = emptyList(),
    val filter: PantryFilter = PantryFilter(),
) {
    val isEmptyPantry: Boolean get() = !loading && allItems.isEmpty()

    /** Categories that actually hold something, for the filter row. */
    val usedCategories: List<Category>
        get() = allItems.map { it.category }.distinct().sortedBy { it.ordinal }

    val restockItems: List<PantryItem>
        get() = allItems.filter { it.status.needsRestock }
            .sortedWith(compareBy({ it.category.ordinal }, { it.name.lowercase() }))

    val expiringItems: List<PantryItem>
        get() = allItems.filter { it.isExpired() || it.expiresWithin(EXPIRY_HORIZON_DAYS) }
            .sortedBy { it.expiresOn ?: Long.MAX_VALUE }

    val outCount: Int get() = allItems.count { it.status == StockStatus.OUT }
    val lowCount: Int get() = allItems.count { it.status == StockStatus.LOW }

    companion object {
        const val EXPIRY_HORIZON_DAYS = 14L
    }
}

class PantryViewModel(private val repository: PantryRepository) : ViewModel() {

    private val filter = MutableStateFlow(PantryFilter())
    val currentFilter: StateFlow<PantryFilter> = filter.asStateFlow()

    private val _lastDeleted = MutableStateFlow<PantryItem?>(null)
    val lastDeleted: StateFlow<PantryItem?> = _lastDeleted.asStateFlow()

    val uiState: StateFlow<PantryUiState> =
        combine(repository.observeAll(), filter) { items, activeFilter ->
            PantryUiState(
                loading = false,
                allItems = items,
                visibleItems = items.applyFilter(activeFilter),
                filter = activeFilter,
            )
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = PantryUiState(),
        )

    fun setQuery(query: String) = filter.update { it.copy(query = query) }

    fun toggleCategory(category: Category) =
        filter.update { it.copy(category = if (it.category == category) null else category) }

    fun toggleRestockOnly() = filter.update { it.copy(restockOnly = !it.restockOnly) }

    fun setSortOrder(order: SortOrder) = filter.update { it.copy(sortOrder = order) }

    fun clearFilters() = filter.update { PantryFilter(sortOrder = it.sortOrder) }

    fun adjust(item: PantryItem, delta: Double) = viewModelScope.launch {
        repository.adjustQuantity(item, delta)
    }

    fun markOutOfStock(item: PantryItem) = viewModelScope.launch {
        repository.setQuantity(item, 0.0)
    }

    fun delete(item: PantryItem) = viewModelScope.launch {
        repository.delete(item)
        _lastDeleted.value = item
    }

    /** Puts back the item removed by the last [delete], for the undo snackbar. */
    fun undoDelete() = viewModelScope.launch {
        _lastDeleted.value?.let { repository.save(it) }
        _lastDeleted.value = null
    }

    fun clearUndo() {
        _lastDeleted.value = null
    }

    fun seedStarterPantry() = viewModelScope.launch {
        repository.seedStarterPantryIfEmpty()
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                PantryViewModel(kitchenApp.repository)
            }
        }
    }
}

internal fun Any?.asKitchenApp(): KitchenApp =
    this as? KitchenApp ?: error("Application is not KitchenApp; check android:name in the manifest")

internal val CreationExtras.kitchenApp: KitchenApp
    get() = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY].asKitchenApp()
