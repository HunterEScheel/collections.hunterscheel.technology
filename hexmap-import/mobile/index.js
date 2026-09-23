/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import { AppRegistry } from 'react-native';
import App from './App';
import { OverlayRoot } from './src/overlay/OverlayRoot';
import { name as appName } from './app.json';

// Main activity surface
AppRegistry.registerComponent(appName, () => App);
// Floating overlay surface, mounted by OverlayService into a system window
AppRegistry.registerComponent('HexmapOverlay', () => OverlayRoot);
