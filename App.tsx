/**
 * GUIDY - AI Audio Tourist Companion
 * Main Application Entry Point
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

// Import providers
import {LocationProvider} from './src/services/location';
import {MapProvider} from './src/services/maps';

/**
 * Main App Component
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
