/**
 * GUIDY - Home Screen
 * Initial screen with logo and subtitle
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, useTheme} from 'react-native-paper';

function HomeScreen(): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {/* Temporary Logo - Text-based */}
        <View style={[styles.logoPlaceholder, {backgroundColor: theme.colors.primary}]}>
          <Text style={styles.logoText}>G</Text>
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text variant="displaySmall" style={styles.title}>
          Guidy
        </Text>
        <Text variant="titleMedium" style={[styles.subtitle, {color: theme.colors.onSurfaceVariant}]}>
          AI Audio Tourist Companion
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logoText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
});

export default HomeScreen;
