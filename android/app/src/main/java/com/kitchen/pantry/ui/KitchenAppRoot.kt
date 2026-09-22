package com.kitchen.pantry.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Kitchen
import androidx.compose.material.icons.filled.MenuBook
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
import com.kitchen.pantry.ui.screens.RecipeDetailScreen
import com.kitchen.pantry.ui.screens.RecipeEditScreen
import com.kitchen.pantry.ui.screens.RecipeListScreen
import com.kitchen.pantry.ui.screens.ShoppingListScreen
import com.kitchen.pantry.ui.screens.SyncScreen

private object Routes {
    const val PANTRY = "pantry"
    const val RECIPES = "recipes"
    const val SHOPPING = "shopping"
    const val SYNC = "sync"
    const val EDIT_ITEM = "edit/{itemId}"
    const val RECIPE_DETAIL = "recipe/{recipeId}"
    const val EDIT_RECIPE = "recipe/{recipeId}/edit"

    fun editItem(itemId: Long) = "edit/$itemId"
    fun recipeDetail(recipeId: Long) = "recipe/$recipeId"
    fun editRecipe(recipeId: Long) = "recipe/$recipeId/edit"
}

@Composable
fun KitchenAppRoot() {
    val navController = rememberNavController()
    // Activity-scoped: the pantry and the recipe book are the same data whichever
    // tab you are looking at.
    val pantryViewModel: PantryViewModel = viewModel(factory = PantryViewModel.Factory)
    val recipesViewModel: RecipesViewModel = viewModel(factory = RecipesViewModel.Factory)
    val shoppingViewModel: ShoppingViewModel = viewModel(factory = ShoppingViewModel.Factory)

    NavHost(navController = navController, startDestination = Routes.PANTRY) {
        composable(Routes.PANTRY) {
            PantryListScreen(
                viewModel = pantryViewModel,
                onAddItem = { navController.navigate(Routes.editItem(0)) },
                onOpenItem = { id -> navController.navigate(Routes.editItem(id)) },
                onOpenSync = { navController.navigate(Routes.SYNC) },
                bottomBar = { KitchenBottomBar(navController) },
            )
        }
        composable(Routes.RECIPES) {
            RecipeListScreen(
                viewModel = recipesViewModel,
                onAddRecipe = { navController.navigate(Routes.editRecipe(0)) },
                onOpenRecipe = { id -> navController.navigate(Routes.recipeDetail(id)) },
                bottomBar = { KitchenBottomBar(navController) },
            )
        }
        composable(Routes.SHOPPING) {
            ShoppingListScreen(
                viewModel = shoppingViewModel,
                onOpenItem = { id -> navController.navigate(Routes.editItem(id)) },
                bottomBar = { KitchenBottomBar(navController) },
            )
        }
        composable(Routes.SYNC) {
            SyncScreen(
                viewModel = viewModel(factory = SyncViewModel.Factory),
                onBack = { navController.popBackStack() },
            )
        }
        composable(
            route = Routes.EDIT_ITEM,
            arguments = listOf(navArgument("itemId") { type = NavType.LongType }),
        ) { entry ->
            val itemId = entry.arguments?.getLong("itemId") ?: 0L
            ItemEditScreen(
                viewModel = viewModel(factory = ItemEditViewModel.factory(itemId)),
                onDone = { navController.popBackStack() },
            )
        }
        composable(
            route = Routes.RECIPE_DETAIL,
            arguments = listOf(navArgument("recipeId") { type = NavType.LongType }),
        ) { entry ->
            val recipeId = entry.arguments?.getLong("recipeId") ?: 0L
            RecipeDetailScreen(
                viewModel = recipesViewModel,
                recipeId = recipeId,
                onBack = { navController.popBackStack() },
                onEdit = { id -> navController.navigate(Routes.editRecipe(id)) },
            )
        }
        composable(
            route = Routes.EDIT_RECIPE,
            arguments = listOf(navArgument("recipeId") { type = NavType.LongType }),
        ) { entry ->
            val recipeId = entry.arguments?.getLong("recipeId") ?: 0L
            RecipeEditScreen(
                viewModel = viewModel(factory = RecipeEditViewModel.factory(recipeId)),
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
            selected = current == Routes.RECIPES,
            onClick = { navController.switchTab(Routes.RECIPES) },
            icon = { Icon(Icons.Filled.MenuBook, contentDescription = null) },
            label = { Text("Recipes") },
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
