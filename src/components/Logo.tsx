/**
 * GUIDY - Logo Component
 * Official Guidy logo using vector icons and styled text
 */

import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

function Logo({size = 'medium'}: LogoProps): React.JSX.Element {
  const theme = useTheme();

  const dimensions = {
    small: {container: 60, icon: 32, text: 28},
    medium: {container: 100, icon: 56, text: 48},
    large: {container: 140, icon: 80, text: 64},
  };

  const {container, icon, text} = dimensions[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: container,
          height: container,
          backgroundColor: theme.colors.primary,
        },
      ]}>
      <Icon name="map-marker-path" size={icon} color="#FFFFFF" />
      <Text
        style={[
          styles.text,
          {fontSize: text, color: '#FFFFFF'},
        ]}>
        G
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  text: {
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 4,
    right: 8,
  },
});

export default Logo;
