package com.kitchen.pantry.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val LightColors = lightColorScheme(
    primary = Herb,
    secondary = Crust,
    tertiary = Paprika,
)

private val DarkColors = darkColorScheme(
    primary = HerbLight,
    secondary = CrustLight,
    tertiary = PaprikaLight,
)

@Composable
fun MyKitchenTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Material You wallpaper colors, where the platform offers them.
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        darkTheme -> DarkColors
        else -> LightColors
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = KitchenTypography,
        content = content,
    )
}
