package com.kitchen.pantry.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.kitchen.pantry.data.Category
import com.kitchen.pantry.data.MeasureUnit
import com.kitchen.pantry.data.PantryItem
import com.kitchen.pantry.data.PantryRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate

/** The add/edit form, held as text so half-typed numbers do not get clobbered. */
data class ItemEditState(
    val id: Long = 0,
    val name: String = "",
    val category: Category = Category.OTHER,
    val quantity: String = "1",
    val unit: MeasureUnit = MeasureUnit.PIECES,
    val lowThreshold: String = "0",
    /** Blank means "follow the unit", matching [PantryItem.step] being zero. */
    val step: String = "",
    val location: String = "",
    val expiresOn: Long? = null,
    val notes: String = "",
    val loading: Boolean = true,
    val saved: Boolean = false,
) {
    val isNew: Boolean get() = id == 0L
    val nameError: String? get() = if (name.isBlank()) "Give it a name" else null
    val quantityError: String? get() = if (quantity.toDoubleOrNull() == null) "Numbers only" else null
    val thresholdError: String?
        get() = if (lowThreshold.isNotBlank() && lowThreshold.toDoubleOrNull() == null) "Numbers only" else null
    val stepError: String?
        get() = when {
            step.isBlank() -> null
            step.toDoubleOrNull() == null -> "Numbers only"
            step.toDouble() <= 0.0 -> "Must be more than zero"
            else -> null
        }
    val canSave: Boolean
        get() = nameError == null && quantityError == null && thresholdError == null && stepError == null

    /** What the +/- buttons will move once saved, for the field's hint. */
    val effectiveStep: Double get() = step.toDoubleOrNull()?.takeIf { it > 0.0 } ?: unit.step

    val expirationDate: LocalDate? get() = expiresOn?.let(LocalDate::ofEpochDay)

    fun toItem(): PantryItem = PantryItem(
        id = id,
        name = name.trim(),
        category = category,
        quantity = quantity.toDoubleOrNull() ?: 0.0,
        unit = unit,
        lowThreshold = lowThreshold.toDoubleOrNull() ?: 0.0,
        step = step.toDoubleOrNull()?.takeIf { it > 0.0 } ?: 0.0,
        location = location.trim(),
        expiresOn = expiresOn,
        notes = notes.trim(),
    )

    companion object {
        fun from(item: PantryItem) = ItemEditState(
            id = item.id,
            name = item.name,
            category = item.category,
            quantity = PantryItem.formatQuantity(item.quantity),
            unit = item.unit,
            lowThreshold = PantryItem.formatQuantity(item.lowThreshold),
            step = if (item.step > 0.0) PantryItem.formatQuantity(item.step) else "",
            location = item.location,
            expiresOn = item.expiresOn,
            notes = item.notes,
            loading = false,
        )
    }
}

class ItemEditViewModel(
    private val repository: PantryRepository,
    private val itemId: Long,
) : ViewModel() {

    private val _state = MutableStateFlow(ItemEditState(loading = itemId != 0L))
    val state: StateFlow<ItemEditState> = _state.asStateFlow()

    init {
        if (itemId != 0L) {
            viewModelScope.launch {
                val existing = repository.find(itemId)
                _state.value = existing?.let(ItemEditState::from) ?: ItemEditState(loading = false)
            }
        }
    }

    fun setName(value: String) = _state.update { it.copy(name = value) }
    fun setCategory(value: Category) = _state.update { it.copy(category = value) }
    fun setQuantity(value: String) = _state.update { it.copy(quantity = value) }
    fun setUnit(value: MeasureUnit) = _state.update { it.copy(unit = value) }
    fun setLowThreshold(value: String) = _state.update { it.copy(lowThreshold = value) }
    fun setStep(value: String) = _state.update { it.copy(step = value) }
    fun setLocation(value: String) = _state.update { it.copy(location = value) }
    fun setNotes(value: String) = _state.update { it.copy(notes = value) }
    fun setExpiry(date: LocalDate?) = _state.update { it.copy(expiresOn = date?.toEpochDay()) }

    fun save() {
        val current = _state.value
        if (!current.canSave) return
        viewModelScope.launch {
            repository.save(current.toItem())
            _state.update { it.copy(saved = true) }
        }
    }

    fun delete() {
        val current = _state.value
        if (current.isNew) return
        viewModelScope.launch {
            repository.find(current.id)?.let { repository.delete(it) }
            _state.update { it.copy(saved = true) }
        }
    }

    companion object {
        fun factory(itemId: Long): ViewModelProvider.Factory = viewModelFactory {
            initializer { ItemEditViewModel(kitchenApp.repository, itemId) }
        }
    }
}
