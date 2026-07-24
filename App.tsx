/**
 * GUIDY - AI Audio Tourist Companion
 * Main Application Entry Point
 *
 * STAGE 4.1 CERTIFIED BASE
 * Recovery from Stage 4.4H - Removed POIOrchestratorProvider
 *
 * @format
 */

import React from 'react';
import {StatusBar} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';

// Import stores
import {useAppStore} from './src/store';

// Import navigation
import {AppNavigator} from './src/navigation';

// Import theme
import {lightTheme, darkTheme} from './src/theme';

// Import providers - STAGE 4.1 Certified
import {LocationProvider} from './src/services/location';
import {MapProvider} from './src/services/maps';

/**
 * Main App Component
 * 
 * Architecture (Stage 4.1 Certified):
 * - LocationProvider: GPS and permissions
 * - MapProvider: Map rendering and user marker
 * - AppNavigator: Screen navigation
 * 
 * POI functionality temporarily disabled for recovery.
 */
function App(): React.JSX.Element {
  const isDarkMode = useAppStore(state => state.isDarkMode);

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />
        <LocationProvider>
          <MapProvider>
            <AppNavigator />
          </MapProvider>
        </LocationProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default App;
