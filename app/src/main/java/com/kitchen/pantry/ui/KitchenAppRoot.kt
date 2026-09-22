package com.kitchen.pantry.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Kitchen
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.kitchen.pantry.ui.screens.ItemEditScreen
import com.kitchen.pantry.ui.screens.PantryListScreen
import com.kitchen.pantry.ui.screens.ShoppingListScreen

private object Routes {
    const val PANTRY = "pantry"
    const val SHOPPING = "shopping"
    const val EDIT = "edit/{itemId}"

    fun edit(itemId: Long) = "edit/$itemId"
}

@Composable
fun KitchenAppRoot() {
    val navController = rememberNavController()
    // One view model for both list screens, scoped to the activity: the pantry is
    // the same data whichever tab you are on.
    val pantryViewModel: PantryViewModel = viewModel(factory = PantryViewModel.Factory)

    NavHost(navController = navController, startDestination = Routes.PANTRY) {
        composable(Routes.PANTRY) {
            PantryListScreen(
                viewModel = pantryViewModel,
                onAddItem = { navController.navigate(Routes.edit(0)) },
                onOpenItem = { id -> navController.navigate(Routes.edit(id)) },
                bottomBar = { KitchenBottomBar(navController) },
            )
        }
        composable(Routes.SHOPPING) {
            ShoppingListScreen(
                viewModel = pantryViewModel,
                onOpenItem = { id -> navController.navigate(Routes.edit(id)) },
                bottomBar = { KitchenBottomBar(navController) },
            )
        }
        composable(
            route = Routes.EDIT,
            arguments = listOf(navArgument("itemId") { type = NavType.LongType }),
        ) { entry ->
            val itemId = entry.arguments?.getLong("itemId") ?: 0L
            ItemEditScreen(
                viewModel = viewModel(factory = ItemEditViewModel.factory(itemId)),
                onDone = { navController.popBackStack() },
            )
        }
    }
}

@Composable
private fun KitchenBottomBar(navController: NavHostController) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val current = backStackEntry?.destination?.route

    NavigationBar {
        NavigationBarItem(
            selected = current == Routes.PANTRY,
            onClick = { navController.switchTab(Routes.PANTRY) },
            icon = { Icon(Icons.Filled.Kitchen, contentDescription = null) },
            label = { Text("Pantry") },
        )
        NavigationBarItem(
            selected = current == Routes.SHOPPING,
            onClick = { navController.switchTab(Routes.SHOPPING) },
            icon = { Icon(Icons.Filled.ShoppingCart, contentDescription = null) },
            label = { Text("Shopping") },
        )
    }
}

/** Tab switches replace rather than stack, and each tab keeps its scroll position. */
private fun NavHostController.switchTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}
